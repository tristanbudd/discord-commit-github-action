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
        const textContent = core.getInput('text-content', { required: false }) || '';
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
            let formattedMessage = commit.message || 'No commit message provided';

            // Format the commit message to ensure it fits within discord embed limits.
            const maxLength = 1024;
            if (formattedMessage.length > maxLength) {
                const suffix = (remaining) => `... (and ${remaining} more characters)`;

                let remainingLength = formattedMessage.length - maxLength;
                let suffixText = suffix(remainingLength);

                let availableLength = maxLength - suffixText.length;

                while (availableLength < 0) {
                    remainingLength++;
                    suffixText = suffix(remainingLength);
                    availableLength = maxLength - suffixText.length;
                }

                const truncatedMessage = formattedMessage.slice(0, availableLength);
                formattedMessage = `${truncatedMessage}${suffixText}`;
            } else {
                formattedMessage = `\`\`\`\n${formattedMessage}\n\`\`\``;
            }

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

            let message = '```\n';

            const sections = [
                ['Added', addedFiles],
                ['Modified', modifiedFiles],
                ['Removed', removedFiles],
            ];

            for (const [label, files] of sections) {
                message += `${label}:\n`;
                if (files.length) message += files.join('\n') + '\n\n';
                else message += '\n';
            }

            message = message.trimEnd() + '\n```';

            // Format the changed files message to ensure it fits within Discord embed limits.
            const maxLength = 1024;
            if (message.length > maxLength) {
                const suffix = '... (truncated)';
                const availableLength = maxLength - suffix.length;
                message = message.slice(0, availableLength) + suffix;
            }

            fields.push({
                name: 'Changed Files',
                value: message,
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
            embed.footer = {
                text: embedFooterText,
                icon_url: embedFooterIconURL || embedFooterIcon
            };
        }
        if (embedFooterTimestamp) {
            embed.timestamp = new Date().toISOString();
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

        if (!response.ok) {
            core.setFailed(`Failed to send webhook: ${response.statusText}`);
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
