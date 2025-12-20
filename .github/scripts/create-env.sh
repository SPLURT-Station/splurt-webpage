#!/bin/bash
# Script to create .env file from GitHub secrets and .env.example template
# This script reads .env.example and replaces values with GitHub secrets where available
# GitHub secrets are passed with SECRET_ prefix to avoid name collisions

set -e

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo "🔧 Creating .env file from GitHub secrets..."

# Check if .env.example exists
if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "❌ Error: $ENV_EXAMPLE not found"
  exit 1
fi

# Create or clear .env file
> "$ENV_FILE"

# Read .env.example line by line
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
    echo "$line" >> "$ENV_FILE"
    continue
  fi

  # Extract variable name (everything before =, trim whitespace)
  if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)$ ]]; then
    var_name="${BASH_REMATCH[1]}"
    default_value="${BASH_REMATCH[2]}"
    
    # Check if there's a GitHub secret for this variable
    # Secrets are passed with SECRET_ prefix to avoid collisions and ensure they're set
    secret_env_name="SECRET_${var_name}"
    secret_value="${!secret_env_name}"
    
    if [ -n "$secret_value" ]; then
      # Use the secret value
      echo "${var_name}=${secret_value}" >> "$ENV_FILE"
      echo "  ✓ Set ${var_name} from GitHub secret"
    else
      # Use the default value from .env.example
      echo "$line" >> "$ENV_FILE"
      if [ -n "$default_value" ]; then
        echo "  → Using default for ${var_name}"
      fi
    fi
  else
    # Line doesn't match expected format, preserve it as-is
    echo "$line" >> "$ENV_FILE"
  fi
done < "$ENV_EXAMPLE"

echo "✅ .env file created successfully"
echo ""
echo "📋 Summary of environment variables:"
grep -v "^#" "$ENV_FILE" | grep -v "^$" | cut -d'=' -f1 | while read -r var; do
  if [ -n "$var" ]; then
    echo "  - $var"
  fi
done

