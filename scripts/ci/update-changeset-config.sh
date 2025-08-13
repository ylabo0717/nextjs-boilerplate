#!/bin/bash

set -e

# Colored log output functions
log_info() {
  echo -e "\033[0;36m[INFO]\033[0m $1"
}

log_success() {
  echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_error() {
  echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# Get GitHub repository information
if [ -z "${GITHUB_REPOSITORY}" ]; then
  log_error "GITHUB_REPOSITORY environment variable is not set"
  exit 1
fi

log_info "Updating changeset config for repository: ${GITHUB_REPOSITORY}"

# Config file path
CONFIG_FILE=".changeset/config.json"

# Create backup (for debugging)
if [ -f "${CONFIG_FILE}" ]; then
  cp "${CONFIG_FILE}" "${CONFIG_FILE}.backup"
fi

# Update JSON using Node.js
node -e "
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), '.changeset', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Update changelog configuration
if (Array.isArray(config.changelog)) {
  const changelogConfig = config.changelog[1];
  if (changelogConfig && typeof changelogConfig === 'object') {
    changelogConfig.repo = process.env.GITHUB_REPOSITORY;
    console.log('Updated repo field to:', process.env.GITHUB_REPOSITORY);
  }
}

// Format and write the file
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\\n');
console.log('Config file updated successfully');
"

if [ $? -eq 0 ]; then
  log_success "Changeset config updated successfully"
  
  # Show updated content (for debugging)
  if [ "${DEBUG}" = "true" ]; then
    log_info "Updated config content:"
    cat "${CONFIG_FILE}"
  fi
else
  log_error "Failed to update changeset config"
  
  # Restore from backup
  if [ -f "${CONFIG_FILE}.backup" ]; then
    mv "${CONFIG_FILE}.backup" "${CONFIG_FILE}"
  fi
  
  exit 1
fi

# Remove backup file
rm -f "${CONFIG_FILE}.backup"