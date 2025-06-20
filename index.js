const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

function hexToDecimal(hex) {
    if (!hex) return 0xffffff; // Default to white if no hex is provided
    if (hex.startsWith('#')) hex = hex.slice(1);

    return parseInt(hex, 16);
}

async function run() {
    try {
        const webhookURL = core.getInput('webhook-url', { required: true });

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
        const showColourChanges = core.getInput('show-colour-changes', { required: false }) === 'true';
        const showChangedFiles = core.getInput('show-changed-files', { required: false }) === 'true';
        const showCommitBranch = core.getInput('show-commit-branch', { required: false }) === 'true';
        const showCommitAuthor = core.getInput('show-commit-author', { required: false }) === 'true';
        const showCommitLink = core.getInput('show-commit-link', { required: false }) === 'true';

        const context = github.context;
        const commit = github.context.payload.head_commit;
        const repoURL = `https://github.com/${context.repo.owner}/${context.repo.repo}`;
        const commitURL = commit ? commit.url.replace('api.', '').replace('/repos', '') : null;

        let fields = [];

        if (showCommitMessage && commit) {
            let formattedMessage;

            if (showColourChanges && commit.message) {
                const lines = commit.message.split('\n');
                const processedLines = lines.map(line => {
                    if (line.startsWith('+') || line.startsWith('-')) {
                        return line;
                    } else {
                        return ' ' + line;
                    }
                });
                formattedMessage = `\`\`\`diff\n${processedLines.join('\n')}\n\`\`\``;

            } else {
                formattedMessage = `\`\`\`\n${commit.message || 'No commit message provided'}\n\`\`\``;
            }

            fields.push({
                name: 'Commit Message',
                value: formattedMessage,
                inline: false
            });
        }

        if (showChangedFiles && commit) {
            const addedFiles = Array.isArray(commit.added) ? commit.added : [];
            const modifiedFiles = Array.isArray(commit.modified) ? commit.modified : [];
            const removedFiles = Array.isArray(commit.removed) ? commit.removed : [];

            let formattedMessage;

            if (showColourChanges && (addedFiles.length > 0 || modifiedFiles.length > 0 || removedFiles.length > 0)) {
                const addedLines = addedFiles.map(file => `+${file}`).join('\n');
                const modifiedLines = modifiedFiles.map(file => ` ${file}`).join('\n');
                const removedLines = removedFiles.map(file => `-${file}`).join('\n');
                formattedMessage = `\`\`\`diff\n${addedLines}\n${modifiedLines}\n${removedLines}\n\`\`\``;
            } else {
                formattedMessage = `\`\`\`\nAdded:\n${addedFiles.join('\n')}\nModified:\n${modifiedFiles.join('\n')}\nRemoved:\n${removedFiles.join('\n')}\n\`\`\``;
            }

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

            const displayName = username
                ? `${authorName} (${username})`
                : authorName;

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
            throw new Error(`Failed to send webhook: ${response.statusText}`);
        }

        core.info('Webhook sent successfully');
    } catch (error) {
        core.setFailed(error.message);
    }
}

run()