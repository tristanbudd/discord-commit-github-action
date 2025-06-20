# Discord Commit | Github Action
![](https://img.shields.io/github/stars/tristanbudd/discord-commit-github-action.svg) ![](https://img.shields.io/github/forks/tristanbudd/discord-commit-github-action.svg) ![](https://img.shields.io/github/issues/tristanbudd/discord-commit-github-action.svg)

## What does this do?
This GitHub Action automatically posts commit messages to a specified Discord channel whenever the repository is updated. It serves as a convenient way to notify team members and developers about changes directly through Discord, a popular chat platform.

The action offers extensive customization options for the message format, allowing you to tailor how the commit information is presented. It can display a wide range of details within the message, making it easy to keep everyone informed about repository updates in real time.

---

## Features
- Customizable embeds (title, description, colors, images, etc.)
- Smart color-coding based on commit changes (+/-)
- Optionally displays changed files (with GitHub token)
- Shows branch, author, and commit message
- Provides commit URL for quick access

---

## Preview Images
Below are examples of the action in use via different workflow configurations:

### Minimal Configuration  
A simple setup that uses only the required inputs to send a basic Discord embed.

[`.github/workflows/minimal-test.yml`](https://github.com/tristanbudd/discord-commit-github-action/tree/master/.github/workflows/minimal-test.yml)

![Minimal Example](https://github.com/user-attachments/assets/7852d0a6-058a-4812-87eb-24b69723057b)

### Full Configuration  
A fully customized embed using all available fields such as color, images, author icons, and changed files.

[`.github/workflows/full-test.yml`](https://github.com/tristanbudd/discord-commit-github-action/tree/master/.github/workflows/full-test.yml)

![Full Example](https://github.com/user-attachments/assets/34455789-ef0c-4227-9812-123a12dadb7a)

---

## Inputs
| Name                     | Required | Description                                                                                      |
|--------------------------|----------|--------------------------------------------------------------------------------------------------|
| `webhook-url`           | ✅ Yes   | Webhook URL from Discord. See: the [intro to webhook docs](https://discord.com/developers/docs/resources/webhook) for details |
| `github-token`          | ❌ No    | GitHub token for accessing commit data (ONLY REQUIRED FOR CHANGED FILES)                        |
| `text-content`          | ❌ No    | Message content to send alongside the embed                                                     |
| `embed-title`           | ❌ No    | Title of the embed                                                                               |
| `embed-description`     | ❌ No    | Description content for the embed                                                               |
| `embed-colour`          | ❌ No    | Embed colour in hex (e.g., `#FFFFFF` for white). Automatically adjusts with `colour-changes`    |
| `embed-author-name`     | ❌ No    | Name shown as embed author                                                                      |
| `embed-author-icon-url` | ❌ No    | URL of the author icon shown in the embed                                                       |
| `embed-author-url`      | ❌ No    | URL linked to the author's name in the embed                                                    |
| `embed-thumbnail-url`   | ❌ No    | URL of the thumbnail image shown in the embed                                                   |
| `embed-image-url`       | ❌ No    | URL of a larger image to display in the embed                                                   |
| `embed-footer-text`     | ❌ No    | Text shown in the embed footer                                                                  |
| `embed-footer-icon-url` | ❌ No    | URL of the icon shown in the footer                                                             |
| `embed-footer-timestamp`| ❌ No    | Whether to include a timestamp in the embed footer (`true`/`false`)                             |
| `show-commit-message`   | ❌ No    | Whether to show the commit message in the embed (`true`/`false`)                                |
| `colour-changes`        | ❌ No    | Colour the embed based on commit additions/deletions (`true`/`false`)                           |
| `show-changed-files`    | ❌ No    | Show a list of changed files (requires `github-token`) (`true`/`false`)                         |
| `show-commit-branch`    | ❌ No    | Display the branch name of the commit (`true`/`false`)                                          |
| `show-commit-author`    | ❌ No    | Show the commit author's name and avatar (`true`/`false`)                                       |
| `show-commit-link`      | ❌ No    | Include a link to the specific commit in the embed (`true`/`false`)                             |

---

## Usage

You can view example configurations here:

[`.github/workflows`](https://github.com/tristanbudd/discord-commit-github-action/tree/master/.github/workflows)

---

### GitHub Secrets

It is **strongly recommended** to use **GitHub Secrets** for sensitive values like the `webhook-url` and `github-token`.

#### To create a secret:
1. Go to your repo’s **Settings** → **Secrets and Variables** → **Actions** → **Repository Secrets**
2. Click **"New repository secret"**
3. Use it in workflows like this: `${{ secrets.SECRET_NAME }}`

---

### Manual Trigger (For Testing)

To test the action manually before enabling it on `push`, use `workflow_dispatch`.

**How to trigger**:  
GitHub → **Actions** → Select your workflow → Click **“Run workflow”**

```yaml
name: Send Test Discord Commit Message - Manual Trigger

on:
  workflow_dispatch:

jobs:
  discord_notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: tristanbudd/discord-commit-github-action@master
        with:
          webhook-url: ${{ secrets.WEBHOOK_URL }}
          # Add more inputs as needed
```

---

### Running Automatically on Push

Trigger the action on every commit push:

```yaml
name: Send Discord Commit Message on Push

on: [push]

jobs:
  discord_notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: tristanbudd/discord-commit-github-action@master
        with:
          webhook-url: ${{ secrets.WEBHOOK_URL }}
          # Add more inputs as needed
```

---

## Further Information

- **Embed customization**: Adjust titles, descriptions, colors, icons, and more.
- **Smart embed coloring**: Optionally auto-colors the embed based on additions/deletions.
- **File change visibility**: Show changed files using the GitHub API (requires `github-token`).
- **Branch and commit data**: Show branch, commit link, and author with avatars.
- **Testable setup**: Use manual triggers to test your embeds before full automation.

---

### Discord Webhook Limitations

Discord embeds are powerful but have some constraints:

- Max total embed size: **6000 characters**
- Long file change lists may be truncated
- Discord has **rate limits** — avoid firing the action too frequently in active repos

Official Resources:
- [Intro to Webhooks](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
- [Discord API Reference](https://discord.com/developers/docs/resources/webhook)

---

## Support

Have a question or need help?

Open an issue on GitHub:  
[https://github.com/tristanbudd/discord-commit-github-action/issues](https://github.com/tristanbudd/discord-commit-github-action/issues)

---

## License

[MIT](LICENSE)
