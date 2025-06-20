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

        const embedTitle = core.getInput('embed-title') || 'New Commit';
        const embedDescription = core.getInput('embed-description') || 'A new commit has been posted';
        const showCommitMessage = core.getInput('show-commit-message').toLowerCase() === 'true';
        const colourChanges = core.getInput('colour-changes').toLowerCase() === 'true';
        const showChangedFiles = core.getInput('show-changed-files').toLowerCase() === 'true';
        const showTimestamp = core.getInput('show-timestamp').toLowerCase() === 'true';
        const embedColour = core.getInput('embed-colour') || '#FFFFFF';
        const embedFooterText = core.getInput('embed-footer-text') || '';
        const embedImageUrl = core.getInput('embed-image-url') || '';
        const embedThumbnailUrl = core.getInput('embed-thumbnail-url') || '';
        const embedAuthorName = core.getInput('embed-author-name') || '';
        const embedAuthorUrl = core.getInput('embed-author-url') || '';

        const commit = github.context.payload.head_commit;
        const repoURL = `https://github.com/${context.repo.owner}/${context.repo.repo}`;
        const commitURL = commit ? commit.url.replace('api.', '').replace('/repos', '') : null;

        let fields = [];

        if (showCommitMessage && commit) {
            fields.push({
                name: 'Commit Message',
                value: commit.message || 'No commit message provided',
                inline: false
            });
        }

        if (showChangedFiles && commit && commit.modified && commit.modified.length > 0) {
            fields.push({
                name: 'Changed Files',
                value: commit.modified.map(f => `\`${f}\``).join('\n'),
                inline: false,
            });
        }

        let colourDecimal = hexToDecimal(embedColour);

        if (colourChanges && commit) {
            if (commit.added & commit.added.length > 0) {
                colourDecimal = hexToDecimal('#00FF00'); // Green for added files
            } else if (commit.removed && commit.removed.length > 0) {
                colourDecimal = hexToDecimal('#FF0000'); // Red for removed files
            }
        }

        const embed = {
            title: embedTitle,
            description: embedDescription,
            color: colourDecimal,
            url: commitURL || repoURL,
            fields: fields,
            timestamp: showTimestamp && commit ? commit.timestamp : undefined,
        };

        if (embedFooterText || showTimestamp) {
            embed.timestamp = new Date().toISOString();
        }
        if (embedImageUrl) {
            embed.image = { url: embedImageUrl };
        }
        if (embedThumbnailUrl) {
            embed.thumbnail = { url: embedThumbnailUrl };
        }
        if (embedAuthorName) {
            embed.author = {
                name: embedAuthorName,
                url: embedAuthorUrl || repoURL,
            };
        }

        const payload = {embeds: [embed] };

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

run().then(r => {
    core.info('Action completed successfully');
});