const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');
const { Octokit } = require('@octokit/rest');

/**
 * Converts a hex color code to its decimal equivalent.
 * If no hex code is provided, defaults to white (#ffffff) for a neutral color.
 *
 * @param {string} hex - The hex color code to be converted (e.g., '#ffffff').
 * @returns {number} The decimal equivalent of the hex color.
 */
function hexToDecimal(hex) {
    if (!hex) return 0xffffff; // Default to white if no hex is provided.
    if (hex.startsWith('#')) hex = hex.slice(1);

    return parseInt(hex, 16);
}

/**
 * Truncates a string to a specified maximum length.
 * If the string exceeds the maximum length,
 * it will be truncated and appended with '...'.
 * @param str
 * @param max
 * @returns {string|*}
 */
function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 128) + '...' : str;
}

/**
 * Calculates the size of an embed object based on its content.
 * @param embed
 * @returns {number}
 */
function calculateEmbedSize(embed) {
    let size = 0;
    size += embed.title?.length || 0;
    size += embed.description?.length || 0;
    size += embed.footer?.text?.length || 0;
    size += embed.author?.name?.length || 0;
    for (const field of embed.fields || []) {
        size += (field.name?.length || 0) + (field.value?.length || 0);
    }
    return size;
}

/**
 * Main function to handle the GitHub commit webhook.
 * Collects relevant commit data and sends it to a specified webhook.
 *
 * @throws Will throw an error if the webhook fails or if any GitHub API request fails.
 */
async function run() {
    try {
        // Get the webhook URL (required to be input).
        const webhookURL = core.getInput('webhook-url', { required: true });

        // Optional GitHub token for authentication, defaults to an empty string if not provided.
        const githubToken = core.getInput('github-token', { required: false }) || '';

        // Parse the inputs for text content, title, description, etc.
        // If not provided, default values will be used for optional inputs.
        let textContent = core.getInput('text-content', { required: false }) || '';
        const embedTitle = core.getInput('embed-title', { required: false }) || 'GitHub Commit Notification';
        const embedDescription = core.getInput('embed-description', { required: false }) || '';
        const embedColour = core.getInput('embed-colour', { required: false }) || '#ffffff';
        const embedAuthorName = core.getInput('embed-author-name', { required: false }) || '';
        const embedAuthorIconURL = core.getInput('embed-author-icon-url', { required: false }) || '';
        const embedAuthorURL = core.getInput('embed-author-url', { required: false }) || '';
        const embedThumbnailUrl = core.getInput('embed-thumbnail-url', { required: false }) || '';
        const embedImageURL = core.getInput('embed-image-url', { required: false }) || '';
        const embedFooterText = core.getInput('embed-footer-text', { required: false }) || '';
        const embedFooterIcon = core.getInput('embed-footer-icon', { required: false }) || '';
        const embedFooterIconURL = core.getInput('embed-footer-icon-url', { required: false }) || '';
        const embedFooterTimestamp = core.getInput('embed-footer-timestamp', { required: false }) === 'true';
        const showCommitMessage = core.getInput('show-commit-message', { required: false }) === 'true';
        const showChangedFiles = core.getInput('show-changed-files', { required: false }) === 'true';
        const showCommitBranch = core.getInput('show-commit-branch', { required: false }) === 'true';
        const showCommitAuthor = core.getInput('show-commit-author', { required: false }) === 'true';
        const showCommitLink = core.getInput('show-commit-link', { required: false }) === 'true';

        // Extract relevant commit details from the GitHub context and payload,
        // then construct the repository and commit URLs for further use in the webhook.
        const context = github.context;
        const commit = github.context.payload.head_commit;
        const repoURL = `https://github.com/${context.repo.owner}/${context.repo.repo}`;
        const commitSha = commit ? commit.id || commit.sha : null;
        const commitURL = commitSha ? `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${commitSha}` : null;

        let fields = [];

        if (showCommitMessage && commit) {
            const commitMessage = truncate(commit.message || 'No commit message provided', 1024);

            let formattedMessage;
            formattedMessage = `\`\`\`\n${commitMessage}\n\`\`\``;

            fields.push({
                name: 'Commit Message',
                value: formattedMessage,
                inline: false
            });
        }

        if (showChangedFiles && commitSha) {
            // Initialize Octokit for interacting with GitHub REST API.
            // This will be used to fetch commit data for the current push event.
            const octokit = new Octokit({ auth: githubToken });

            const { data: commitData } = await octokit.rest.repos.getCommit({
                owner: context.repo.owner,
                repo: context.repo.repo,
                ref: commitSha,
            });

            const addedFiles = [];
            const modifiedFiles = [];
            const removedFiles = [];

            // Process commit data to categorize changed files and
            // classify files based on their status in the commit.
            commitData.files.forEach(file => {
                if (file.status === 'added') addedFiles.push(file.filename);
                else if (file.status === 'modified') modifiedFiles.push(file.filename);
                else if (file.status === 'removed') removedFiles.push(file.filename);
            });

            let formattedMessage;
            formattedMessage = '```\n';

            if (addedFiles.length) {
                formattedMessage += 'Added:\n' + addedFiles.join('\n') + '\n\n';
            } else {
                formattedMessage += 'Added:\n\n';
            }

            if (modifiedFiles.length) {
                formattedMessage += 'Modified:\n' + modifiedFiles.join('\n') + '\n\n';
            } else {
                formattedMessage += 'Modified:\n\n';
            }

            if (removedFiles.length) {
                formattedMessage += 'Removed:\n' + removedFiles.join('\n') + '\n';
            } else {
                formattedMessage += 'Removed:\n';
            }

            formattedMessage += '```';

            fields.push({
                name: 'Changed Files',
                value: formattedMessage,
                inline: false
            });
        }

        if (showCommitBranch && commit) {
            const branch = github.context.ref?.replace('refs/heads/', '') || 'No branch information available';

            if (showCommitBranch) {
                fields.push({
                    name: 'Branch',
                    value: branch,
                    inline: true
                });
            }
        }

        if (showCommitAuthor && commit) {
            const authorName = commit.author?.name || 'No author information available';

            const username = github.context.payload?.pusher?.name
                || github.context.payload?.sender?.login
                || commit.author?.username
                || commit.author?.login
                || null;

            const authorValue = username
                ? `${authorName} ([${username}](https://github.com/${username}))`
                : authorName;

            fields.push({
                name: 'Author',
                value: authorValue,
                inline: false
            });
        }

        if (showCommitLink && commitURL) {
            fields.push({
                name: 'Commit Link',
                value: `[View Commit](${commitURL}) | [View Repository](${repoURL})`,
                inline: false
            });
        }

        let colourDecimal = hexToDecimal(embedColour);

        // Construct the embed object with all necessary fields.
        const embed = {
            title: embedTitle,
            color: colourDecimal,
            fields: fields,
        };

        if (embedDescription) {
            embed.description = embedDescription;
        }
        if (embedAuthorName) {
            embed.author = {
                name: embedAuthorName,
                icon_url: embedAuthorIconURL,
                url: embedAuthorURL
            };
        }
        if (embedThumbnailUrl) {
            embed.thumbnail = { url: embedThumbnailUrl };
        }
        if (embedImageURL) {
            embed.image = { url: embedImageURL };
        }
        if (embedFooterText) {
            embed.footer = { text: embedFooterText };
            if (embedFooterIconURL || embedFooterIcon) {
                embed.footer.icon_url = embedFooterIconURL || embedFooterIcon;
            }
        }
        if (embedFooterTimestamp) {
            embed.timestamp = new Date().toISOString();
        }

        // Ensure that values do not exceed Discord's limits.
        embed.title = truncate(embed.title || '', 256);
        embed.description = truncate(embed.description || '', 4096);
        if (embed.author) {
            embed.author.name = truncate(embed.author.name || '', 256);
        }
        if (embed.footer) {
            embed.footer.text = truncate(embed.footer.text || '', 2048);
        }

        let totalSize = calculateEmbedSize(embed);

        while (totalSize > 6000 && embed.fields.length > 0) {
            embed.fields.pop();
            totalSize = calculateEmbedSize(embed);
        }

        if (textContent && textContent.length > 2000) {
            textContent = textContent.slice(0, 1997) + '...';
        }

        let payload;
        if (textContent) {
            payload = { content: textContent, embeds: [embed] };
        } else {
            payload = { embeds: [embed] };
        }

        const response = await fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseBody = await response.text();

        if (!response.ok) {
            core.setFailed(`Failed to send webhook: ${response.statusText} (${response.status})\nResponse: ${responseBody}`);
            return;
        }

        core.info('Webhook sent successfully');
    } catch (error) {
        core.setFailed(error.message);
    }
}

// Catch any errors in the main run process and set the action as failed.
run().catch(error => {
    core.setFailed(`Action failed with error: ${error.message}`);
});
