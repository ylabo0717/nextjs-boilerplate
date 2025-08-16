# Test Coverage Improvement Task Definition

## Purpose

Improve the quality of the test suite while incrementally increasing code coverage.

## Scope

- In scope: Application code under `src/` and existing unit/integration/E2E test suites (Vitest / Playwright).
- Out of scope: Type definitions, generated artifacts, documentation, and third‑party code.

## Definition of Done (DoD)

- Phase 1: Achieve global test coverage ≥ 80%. All tests must pass locally and in CI. Do not skip tests.
- Phase 2: Increase coverage toward 100% where feasible. For unreachable or defensive branches, document the rationale and record them as exceptions.
- Avoid duplication with existing tests; consolidate or refactor redundant cases.
- Cover critical paths: utilities, logging, error handling, boundary values, and failure flows.

## Policy and Guidelines

- Prioritize defect detection and regression prevention over superficial line coverage.
- Prefer unit tests; use integration tests for cross‑module behavior and external interactions.
- Mocking policy: control external I/O, time, randomness, and environment variables. For logging, verify effects (content and call counts) without excessive mocking.
- Minimize snapshot tests; prefer explicit assertions that validate structure and contracts.
- Flake prevention: use reliable wait conditions and timeouts, and eliminate non‑determinism.

## Priorities

1. Exceptional paths, boundary values, and error handling
2. Core utilities (e.g., `src/utils/`, `src/lib/logger/`)
3. Public APIs and service/repository layers
4. Remaining low‑risk branches

## Procedure

1. Analyze current coverage and identify gaps.
2. Design tests to close gaps (avoid duplication; include boundary and negative cases).
3. Implement, run, and iterate. On failures, determine whether the root cause is in the tests or implementation and fix accordingly.
4. Produce a report: coverage deltas, discovered defects, and remaining gaps with follow‑ups.

## Prohibitions

- Do not use `test.skip`, `test.only`, or equivalents.
- Do not rely excessively on snapshot tests.
- Do not leave stray console output (except when explicitly testing logging).
- Do not write brittle tests that overfit implementation details.

## Deliverables

- List of added/updated tests with rationale.
- Coverage report with before/after comparison.
- Record of discovered defects and corresponding fixes (when applicable).

## Notes

- When 100% coverage is not possible, document untested code paths and provide alternative assurance (e.g., contract or integration tests).
- Enforce thresholds via Vitest coverage settings and CI quality gates as appropriate.
