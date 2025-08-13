---
'nextjs-boilerplate': minor
---

Add verbose option to quality check scripts for better debugging

### New Features

- **Verbose Mode for Quality Checks**: Added `--verbose` flag support to quality check scripts
  - `pnpm quality:check:verbose` - Run quality gate checks with detailed output
  - `pnpm quality:analyze:verbose` - Analyze code quality with debug information
  - `pnpm quality:report:verbose` - Generate reports with verbose logging
  - `pnpm quality:full:verbose` - Run full quality analysis in verbose mode

### Improvements

- **Enhanced Debugging**: Verbose mode now displays:
  - Command execution details
  - Timing information for each check
  - Configuration values and thresholds
  - Detailed file-by-file analysis results
  - Full error output for troubleshooting

- **Lint-staged Coverage**: Fixed glob patterns to ensure all files including root directory files are checked by pre-commit hooks

### Developer Experience

This update significantly improves the debugging experience when troubleshooting CI/CD failures. Simply add the `--verbose` flag to any quality script to get detailed diagnostic information.
