# Security Documentation

## Overview

This project implements comprehensive security measures through GitHub Actions workflows and automated dependency management.

## Security Features

### 1. Automated Security Scanning

#### Security Workflow (`.github/workflows/security.yml`)

Runs automatically on:

- Every push to `main` branch
- Every pull request to `main` branch
- Daily at 3:00 AM UTC
- Manual trigger via workflow dispatch

**Components:**

##### Dependency Audit

- Scans for known vulnerabilities using `pnpm audit`
- Fails CI if high or critical vulnerabilities are found
- Generates audit reports as artifacts

##### CodeQL Analysis

- Static code analysis for JavaScript/TypeScript
- Detects common security vulnerabilities
- Custom queries for React-specific security issues
- SARIF results uploaded to GitHub Security tab

##### Secret Scanning (Gitleaks)

- Scans for accidentally committed secrets
- Custom patterns for JWT tokens, API keys, database URLs
- Configurable via `.gitleaks.toml`

##### License Compliance

- Checks for problematic licenses (GPL, AGPL, etc.)
- Generates license report
- Warns but doesn't fail CI for license issues

### 2. Dependency Management

#### Dependabot (`.github/dependabot.yml`)

Automated dependency updates with:

- **Schedule**: Weekly updates on Mondays at 3:00 AM UTC
- **Grouping**: Related dependencies are updated together
  - Development dependencies
  - Production dependencies
  - Next.js & React ecosystem
  - Tailwind CSS related
  - shadcn/ui components
- **Auto-merge**: Ready for patch updates (requires configuration)

#### Dependency Update Workflow (`.github/workflows/dependency-update.yml`)

Manual or scheduled dependency updates:

- **Schedule**: Weekly on Mondays at 1:00 AM UTC
- **Update Types**: patch, minor, major, latest
- **Automated Testing**: Runs lint, typecheck, and build after updates
- **Pull Request Creation**: Automatic PR with update summary

### 3. Configuration Files

#### CodeQL Configuration (`.github/codeql/codeql-config.yml`)

- Customized paths for analysis
- Excludes test files and build outputs
- Includes custom React security queries

#### Gitleaks Configuration (`.gitleaks.toml`)

- Custom secret detection patterns
- Allowlist for false positives
- Ignores test files and documentation

## Security Best Practices

### For Developers

1. **Never commit secrets**
   - Use environment variables for sensitive data
   - Add `.env` files to `.gitignore`
   - Use `.env.example` for documentation

2. **Review security alerts**
   - Check GitHub Security tab regularly
   - Address Dependabot alerts promptly
   - Review CodeQL findings

3. **Update dependencies regularly**
   - Merge Dependabot PRs after review
   - Run `pnpm audit` locally before commits
   - Keep production dependencies minimal

### CI/CD Security

1. **Fail fast on security issues**
   - High/critical vulnerabilities block merges
   - Secret detection prevents commits
   - Type and lint errors must be fixed

2. **Regular scanning**
   - Daily security scans on main branch
   - Every PR is scanned before merge
   - Weekly dependency updates

## Responding to Security Issues

### Vulnerability Found

1. **Immediate Action**
   - Don't panic
   - Check severity level
   - Review affected components

2. **Resolution Steps**

   ```bash
   # Check for vulnerabilities
   pnpm audit

   # Try automatic fix
   pnpm audit fix

   # Update specific package
   pnpm update [package-name]

   # If major update needed
   pnpm add [package-name]@latest
   ```

3. **Verification**
   - Run tests after updates
   - Check for breaking changes
   - Verify build succeeds

### Secret Exposed

1. **Immediate Action**
   - Rotate the exposed secret immediately
   - Remove from repository history if needed
   - Update all systems using the secret

2. **Prevention**
   - Use secret scanning pre-commit hooks
   - Store secrets in secure vaults
   - Use GitHub Secrets for CI/CD

## Security Checklist

### Before Committing

- [ ] No hardcoded secrets or API keys
- [ ] No sensitive data in comments
- [ ] Dependencies are up to date
- [ ] No high/critical vulnerabilities

### Before Merging PR

- [ ] Security workflow passes
- [ ] CodeQL analysis complete
- [ ] No new security warnings
- [ ] Dependencies reviewed

### Weekly Maintenance

- [ ] Review Dependabot PRs
- [ ] Check security alerts
- [ ] Update dependencies
- [ ] Review audit logs

## Security Contacts

For security issues, please:

1. Do NOT create public issues
2. Contact the maintainers directly
3. Use GitHub's security advisory feature
4. Allow time for patch before disclosure

## Additional Resources

- [GitHub Security Features](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
