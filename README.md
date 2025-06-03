# Astro Starter Kit: Basics

```sh
deno create astro@latest -- --template basics
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy.yml
│       ├── test.yml
│       ├── status-check.yml
│       ├── dependency-update.yml
│       └── deno-update.yml
├── package.json
└── tsconfig.json
```

To learn more about the folder structure of an Astro project, refer to
[our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal using
**Deno** as the runtime:

| Command                  | Action                                       |
| :----------------------- | :------------------------------------------- |
| `deno install`           | Installs dependencies                        |
| `deno task dev`          | Starts local dev server at `localhost:4321`  |
| `deno task build`        | Build your production site to `./dist/`      |
| `deno task preview`      | Preview your build locally, before deploying |
| `deno task check`        | Run Astro's built-in type checking           |
| `deno lint`              | Lint code with Deno's built-in linter        |
| `deno fmt`               | Format code with Deno's built-in formatter   |
| `deno fmt --check`       | Check code formatting without modifying      |
| `deno outdated`          | Check for outdated dependencies              |
| `deno outdated --update` | Update dependencies to compatible versions   |
| `deno upgrade`           | Update Deno runtime to latest version        |

## 🔄 CI/CD Pipeline

This project includes a comprehensive CI/CD setup with GitHub Actions using
**Deno** as the runtime:

### Workflows

- **CI** (`ci.yml`): Runs on pushes to master and PRs
  - Code linting with `deno lint`
  - Type checking with `deno check`
  - Format checking with `deno fmt --check`
  - Project build verification
  - Security audit

- **Tests** (`test.yml`): Runs tests and Astro checks
  - Astro type checking
  - Unit tests (if any exist)
  - Build testing

- **Deploy** (`deploy.yml`): Deploys to GitHub Pages on master
  - Builds the site for production
  - Deploys to GitHub Pages automatically

- **Dependency Updates** (`dependency-update.yml`): Automated dependency
  management
  - Checks for outdated dependencies weekly using `deno outdated`
  - Creates PRs for compatible updates automatically
  - Reports major version updates for manual review

- **Deno Updates** (`deno-update.yml`): Runtime update notifications
  - Checks for new Deno versions monthly
  - Creates GitHub issues when updates are available
  - Provides upgrade instructions and considerations

- **Status Check** (`status-check.yml`): Provides CI summary on PRs

### Setup Instructions

1. **Update Configuration**: Replace `username` in `astro.config.mjs` with your
   GitHub username
2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Set source to "GitHub Actions"
3. **Branch Protection** (recommended):
   - Require CI checks to pass before merging
   - Require branches to be up to date before merging

### Dependency Management

This project uses **Deno's built-in dependency management** instead of
traditional package managers:

- **Automatic Updates**: Dependencies are checked weekly and updated
  automatically via PR
- **Deno Runtime**: Uses
  [`deno outdated`](https://docs.deno.com/runtime/reference/cli/outdated/) for
  dependency checking
- **GitHub Actions**: Managed separately via Dependabot for workflow updates
- **Manual Control**: Major version updates require manual review and approval

### Runtime Configuration

- **Package.json**: Uses Astro's default configuration with minimal
  Deno-specific additions
- **TypeScript**: Configured via `tsconfig.json` using Astro's strict
  configuration
- **Caching**: Deno dependencies are cached automatically using
  `denoland/setup-deno@v2`
- **Lock File**: `deno.lock` ensures reproducible builds across environments

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into
our [Discord server](https://astro.build/chat).
