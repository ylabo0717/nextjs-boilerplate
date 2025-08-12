# Security Setup Guide

## Enabling GitHub Code Scanning

GitHub Code Scanning is a feature that helps identify security vulnerabilities in your code. This repository includes custom CodeQL queries for React-specific security issues.

### For Public Repositories (Free)

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Navigate to **Security & analysis** (in the left sidebar)
4. Find the **Code scanning** section
5. Click **Enable** for Code scanning
6. Select **Default** setup or **Advanced** setup:
   - **Default setup**: Uses GitHub's standard CodeQL queries
   - **Advanced setup**: Uses our custom configuration (recommended)

### For Private Repositories

Code scanning for private repositories requires **GitHub Advanced Security** license.

1. Ensure your organization has GitHub Advanced Security enabled
2. Follow the same steps as for public repositories

### Custom CodeQL Configuration

This repository includes:

- **Custom React security queries** at `.github/codeql/queries/react-security.ql`
  - Detects `dangerouslySetInnerHTML` usage with user input
  - Uses proper data flow tracking to reduce false positives

- **CodeQL configuration** at `.github/codeql/codeql-config.yml`
  - Specifies which paths to analyze
  - Includes custom queries
  - Excludes test files and build artifacts

### Workflow Configuration

The security workflow (`.github/workflows/security.yml`) includes:

1. **Dependency Audit**: Checks for known vulnerabilities in dependencies
2. **CodeQL Analysis**: Scans code for security vulnerabilities
3. **Secret Scanning**: Detects accidentally committed secrets
4. **License Check**: Ensures license compliance

The workflow is configured to:

- Run on push to main branch
- Run on pull requests
- Run daily at 3:00 AM UTC
- Continue even if Code Scanning is not enabled (with warnings)

### Troubleshooting

If you see the error "Code scanning is not enabled for this repository":

1. The workflow will continue to run other security checks
2. SARIF results will still be generated and uploaded as artifacts
3. Once you enable Code Scanning, the results will be visible in the Security tab

### Benefits of Code Scanning

- **Early detection** of security vulnerabilities
- **Automated security reviews** on every pull request
- **Custom rules** for React/Next.js specific issues
- **Integration** with GitHub Security tab for easy tracking
- **Historical tracking** of security issues over time

### Additional Resources

- [GitHub Code Scanning Documentation](https://docs.github.com/en/code-security/code-scanning)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Writing Custom CodeQL Queries](https://codeql.github.com/docs/writing-codeql-queries/about-codeql-queries/)
