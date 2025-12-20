# GitHub Actions Scripts

## create-env.sh

This script creates a `.env` file from GitHub secrets and the `.env.example` template.

### How it works

1. Reads `.env.example` to get the structure and default values
2. Checks for GitHub secrets with matching variable names
3. Uses secret values if available, otherwise uses defaults from `.env.example`
4. Creates a `.env` file in the project root

### Setting up GitHub Secrets

To use this script, add secrets in your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secrets matching the variable names from `.env.example`:

#### Required Secrets (if you want to override defaults)

- `PUBLIC_MEDIA_SPLASH_SOURCE_TYPE`
- `PUBLIC_MEDIA_SPLASH_BASE_URL`
- `PUBLIC_MEDIA_SPLASH_PATTERNS`
- `PUBLIC_MEDIA_SCREENSHOT_SOURCE_TYPE`
- `PUBLIC_MEDIA_SCREENSHOT_BASE_URL`
- `PUBLIC_MEDIA_SCREENSHOT_PATTERNS`
- `PUBLIC_MEDIA_MAX_IMAGES_PER_CATEGORY`
- `MEDIA_CACHE_DURATION`
- `PUBLIC_YOUTUBE_PLAYLIST_ID`
- `PUBLIC_YOUTUBE_PLAYLIST_URL`
- `PUBLIC_YOUTUBE_API_KEY` ⚠️ **Recommended to set as secret**
- `PUBLIC_YOUTUBE_DEFAULT_SONG_INDEX`

### Notes

- Secrets are **optional** - if not set, the script uses default values from `.env.example`
- The script preserves comments and formatting from `.env.example`
- Only variables with matching secrets will be overridden
- Empty secrets are treated as "not set" and will use defaults

### Security

- Never commit `.env` files to the repository (already in `.gitignore`)
- Use GitHub Secrets for sensitive values like API keys
- The script logs which variables were set from secrets (without showing values)
