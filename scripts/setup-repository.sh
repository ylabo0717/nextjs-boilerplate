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

log_warning() {
  echo -e "\033[0;33m[WARNING]\033[0m $1"
}

# Display header
echo ""
echo "================================================"
echo "         Repository Setup Script               "
echo "================================================"
echo ""

# Auto-detect Git repository information
REPO_URL=""
if git remote get-url origin &>/dev/null; then
  REPO_URL=$(git remote get-url origin)
  log_info "Detected Git remote: ${REPO_URL}"
fi

# Extract GitHub repository name
GITHUB_REPO=""
if [[ "${REPO_URL}" =~ github\.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  OWNER="${BASH_REMATCH[1]}"
  REPO="${BASH_REMATCH[2]}"
  GITHUB_REPO="${OWNER}/${REPO}"
  log_info "Detected GitHub repository: ${GITHUB_REPO}"
else
  log_warning "Could not auto-detect GitHub repository from remote URL"
  
  # Prompt for manual input
  echo ""
  echo "Please enter your GitHub repository information:"
  read -p "Repository owner (e.g., 'myusername'): " OWNER
  read -p "Repository name (e.g., 'my-nextjs-app'): " REPO
  
  if [ -z "${OWNER}" ] || [ -z "${REPO}" ]; then
    log_error "Repository owner and name are required"
    exit 1
  fi
  
  GITHUB_REPO="${OWNER}/${REPO}"
fi

echo ""
log_info "Setting up repository: ${GITHUB_REPO}"
echo ""

# 1. Update package.json name field
log_info "Updating package.json..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.name = '${REPO}';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\\n');
console.log('Package name updated to: ${REPO}');
"

# 2. Update changeset config.json
log_info "Updating changeset configuration..."
node -e "
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), '.changeset', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Update changelog configuration
if (Array.isArray(config.changelog)) {
  const changelogConfig = config.changelog[1];
  if (changelogConfig && typeof changelogConfig === 'object') {
    changelogConfig.repo = '${GITHUB_REPO}';
    console.log('Updated repo field to: ${GITHUB_REPO}');
  }
}

// Format and write the file
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\\n');
console.log('Changeset config updated successfully');
"

# 3. Update README.md title (optional)
if [ -f "README.md" ]; then
  log_info "Updating README.md..."
  
  # Update the first heading to the new repository name
  sed -i.bak "1s/.*/# ${REPO}/" README.md && rm README.md.bak
  
  log_success "README.md updated"
fi

# 4. Install dependencies
echo ""
read -p "Would you like to install dependencies now? (y/n): " INSTALL_DEPS

if [[ "${INSTALL_DEPS}" =~ ^[Yy]$ ]]; then
  log_info "Installing dependencies with pnpm..."
  pnpm install
  log_success "Dependencies installed"
fi

# Completion message
echo ""
echo "================================================"
log_success "Repository setup completed successfully!"
echo "================================================"
echo ""
echo "Your repository '${GITHUB_REPO}' is now configured."
echo ""
echo "Next steps:"
echo "  1. Review and update the README.md file"
echo "  2. Configure your environment variables:"
echo "     cp .env.base.example .env.base"
echo "     cp .env.dev.example .env.dev"
echo "  3. Run 'pnpm dev' to start the development server"
echo ""
echo "For CI/CD:"
echo "  - The changeset configuration will be automatically"
echo "    updated in GitHub Actions using the repository context"
echo ""
log_info "Happy coding! 🚀"