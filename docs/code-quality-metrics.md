# Code Quality Metrics Documentation

## Overview

This project implements comprehensive code quality analysis using ESLint plugins for TypeScript/JavaScript static analysis. The system measures complexity, maintainability, duplication, and other quality metrics without relying on external paid services.

## Available Metrics

### 1. **Complexity Metrics** 🧩

- **Cyclomatic Complexity**: Measures the number of independent paths through code
- **Cognitive Complexity**: Measures how difficult code is to understand
- **Maximum Complexity**: Highest complexity value in the codebase
- **Average Complexity**: Mean complexity across all files

### 2. **Maintainability Metrics** 🏗️

- **Maintainability Index**: Score from 0-100 (higher is better)
- **Rating**: Letter grade (A-F) based on maintainability
- **Technical Debt**: Estimated time to fix issues

### 3. **Code Quality Indicators** 🎯

- **TypeScript Errors**: Type safety violations
- **ESLint Errors**: Code standard violations
- **ESLint Warnings**: Non-critical issues
- **Test Coverage**: Percentage of code covered by tests

### 4. **File Metrics** 📁

- **Lines of Code**: Average and maximum per file
- **Large Files**: Files exceeding 300 lines
- **File Count**: Total files analyzed

### 5. **Duplication Metrics** 🔄

- **Duplicate Strings**: Repeated string literals
- **Duplicate Functions**: Similar code blocks
- **Duplication Percentage**: Estimated duplicate code ratio

## Tools and Plugins

### ESLint Plugins

1. **eslint-plugin-sonarjs**
   - Detects code smells and complexity issues
   - Rules for cognitive complexity, duplicate code, and more
   - Configuration in `eslint.config.mjs`

2. **eslint-plugin-jsdoc**
   - Ensures proper documentation
   - Validates JSDoc comments
   - Checks parameter and return descriptions

3. **eslint-plugin-unicorn**
   - Modern JavaScript best practices
   - Performance optimizations
   - Consistent code patterns

## Usage

### Local Analysis

```bash
# Run complete code quality analysis
pnpm quality:analyze

# Generate unified quality report
pnpm quality:report

# Run both analysis and report
pnpm quality:full
```

### Available Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `pnpm quality:analyze` | Run ESLint-based complexity analysis |
| `pnpm quality:report`  | Generate unified quality report      |
| `pnpm quality:full`    | Run analysis and generate report     |
| `pnpm quality:check`   | Basic quality gate checks            |
| `pnpm lint`            | Run ESLint with all plugins          |

## Quality Thresholds

### Recommended Limits

| Metric                | Good  | Warning | Error |
| --------------------- | ----- | ------- | ----- |
| Cyclomatic Complexity | < 5   | 5-10    | > 10  |
| Cognitive Complexity  | < 10  | 10-15   | > 15  |
| Maintainability Index | > 85  | 70-85   | < 70  |
| File Length           | < 200 | 200-300 | > 300 |
| Function Length       | < 20  | 20-50   | > 50  |
| Duplicate Strings     | 0     | 1-3     | > 3   |

### ESLint Configuration

Current settings (can be adjusted in `eslint.config.mjs`):

```javascript
'sonarjs/cognitive-complexity': ['warn', 15],  // Cognitive complexity limit
'sonarjs/no-duplicate-string': ['warn', { threshold: 3 }],    // Max duplicate strings
'sonarjs/no-identical-functions': 'error',     // No duplicate functions
```

## Reports

### 1. JSON Metrics

- **Location**: `metrics/code-quality-latest.json`
- **Contents**:
  - Raw metrics data
  - Detailed file analysis
  - Timestamp and history

### 2. Unified Quality Report

- **Location**: `metrics/unified-report.md`
- **Contents**:
  - Combined metrics from all sources
  - Health score (0-100)
  - Actionable recommendations
  - Markdown format for easy reading

## GitHub Actions Integration

### Automated Analysis

The `code-quality.yml` workflow runs:

- **Weekly**: Every Monday at 00:00 UTC
- **On PR**: When code changes are pushed
- **Manual**: Via workflow dispatch

Features:

- Automatic PR comments with quality report
- Issue creation for critical problems (health score < 60)
- Artifact storage of reports
- GitHub summary generation

### PR Comment Example

```markdown
📊 Unified Quality Report

Overall Health Score: 85/100 ✅

Performance Metrics:

- Build Time: 2m 30s ✅
- Bundle Size: 3.2 MB ✅

Code Quality:

- TypeScript Errors: 0 ✅
- Maintainability: 82.5 (B) ✅
- Avg Complexity: 4.3 ✅

Recommendations:

- ✅ Code quality is excellent!
```

## Interpreting Results

### Health Score

The overall health score (0-100) indicates:

- **80-100**: Excellent - High quality, well-maintained code
- **60-79**: Good - Acceptable quality with some improvements needed
- **40-59**: Fair - Significant improvements recommended
- **0-39**: Poor - Immediate attention required

### Complexity Guidelines

**Cyclomatic Complexity**:

- **1-4**: Simple, easy to test
- **5-7**: Moderate, still manageable
- **8-10**: Complex, consider refactoring
- **>10**: Too complex, should be refactored

**Cognitive Complexity**:

- **1-5**: Easy to understand
- **6-10**: Requires some attention
- **11-15**: Difficult to understand
- **>15**: Very difficult, needs refactoring

### Maintainability Index

- **100-90**: Highly maintainable (A)
- **89-80**: Moderately maintainable (B)
- **79-70**: Somewhat maintainable (C)
- **69-60**: Difficult to maintain (D)
- **<60**: Very difficult to maintain (F)

## Best Practices

### Improving Complexity

1. **Extract Functions**: Break large functions into smaller ones
2. **Early Returns**: Use guard clauses to reduce nesting
3. **Simplify Conditionals**: Use lookup tables or polymorphism
4. **Remove Duplication**: Extract common code to shared functions

### Improving Maintainability

1. **Add Documentation**: Write clear JSDoc comments
2. **Use Descriptive Names**: Make code self-documenting
3. **Keep Files Small**: Split large modules
4. **Follow Patterns**: Use consistent coding patterns

### Example Refactoring

**Before** (High Complexity):

```javascript
function processData(data) {
  if (data) {
    if (data.type === 'A') {
      if (data.value > 100) {
        // process A high
      } else {
        // process A low
      }
    } else if (data.type === 'B') {
      // process B
    }
  }
}
```

**After** (Low Complexity):

```javascript
function processData(data) {
  if (!data) return;

  const processors = {
    A: processTypeA,
    B: processTypeB,
  };

  const processor = processors[data.type];
  if (processor) processor(data);
}

function processTypeA(data) {
  return data.value > 100 ? processHighValue(data) : processLowValue(data);
}
```

## Troubleshooting

### Common Issues

1. **ESLint complexity warnings**
   - Review flagged files for refactoring opportunities
   - Adjust thresholds if too strict for your project
   - Use `// eslint-disable-next-line` for justified exceptions

2. **Low maintainability scores**
   - Add JSDoc comments
   - Reduce file size
   - Simplify complex logic

3. **High duplication percentage**
   - Extract common code to utility functions
   - Use configuration objects for repeated patterns
   - Consider creating reusable components

## Future Improvements

- [ ] Integration with VS Code for real-time feedback
- [ ] Historical trend charts
- [ ] Team-specific quality goals
- [ ] Automated refactoring suggestions
- [ ] Performance impact analysis
- [ ] Advanced TypeScript-specific metrics
