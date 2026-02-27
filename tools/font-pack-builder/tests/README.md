# Font Pack Builder - Test Configuration

## Test Tier System

This project uses a tiered testing approach for property-based tests to balance speed and coverage across different contexts.

### Test Tiers

| Tier | Runs | Use Case | When to Use |
|------|------|----------|-------------|
| **local** | 20 | Fast feedback during development | Default for local development |
| **pr** | 50 | Moderate coverage for pull requests | Automatically on PRs |
| **ci** | 100 | Full coverage for continuous integration | On main/develop branches |
| **release** | 200 | Extensive coverage for releases | On tagged releases |

### Running Tests

#### Local Development (Default)

```bash
npm test
```

This runs tests with the `local` tier (20 property test runs).

#### Specific Tier

```bash
# PR tier (50 runs)
TEST_TIER=pr npm test

# CI tier (100 runs)
TEST_TIER=ci npm test

# Release tier (200 runs)
TEST_TIER=release npm test
```

#### Watch Mode

```bash
npm run test:watch
```

### Writing Property-Based Tests

Property-based tests should use the `global.PROPERTY_TEST_RUNS` variable configured by the test tier system.

#### Example

```javascript
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Feature: font-pack-builder-extended-math, Property 1: Charset Configuration Loading', () => {
  it('should successfully parse any valid charset configuration', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string(),
          version: fc.string(),
          categories: fc.dictionary(
            fc.string(),
            fc.record({
              codepoints: fc.array(fc.hexaString({ minLength: 4, maxLength: 6 })),
              keepOriginalAdvance: fc.boolean(),
              enablePathCentering: fc.boolean()
            })
          )
        }),
        (config) => {
          const manager = new CharsetManager({ customConfig: config });
          const result = manager.load();
          
          expect(result.success).toBe(true);
          expect(result.charset).toBeDefined();
        }
      ),
      { numRuns: global.PROPERTY_TEST_RUNS }  // ← Use configured tier
    );
  });
});
```

### Property Test Naming Convention

All property-based tests must follow this naming convention:

```
Feature: font-pack-builder-extended-math, Property {number}: {property_text}
```

Example:
```
Feature: font-pack-builder-extended-math, Property 2: Homoglyph Group Consistency
```

This helps track which design document properties are covered by tests.

### CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) automatically runs tests with appropriate tiers:

- **Push to any branch**: `local` tier (fast feedback)
- **Pull requests**: `pr` tier (moderate coverage)
- **Push to main/develop**: `ci` tier (full coverage)
- **Tagged releases**: `release` tier (extensive coverage)

### Test Structure

```
tests/
├── setup.js                    # Test tier configuration
├── unit/                       # Unit tests
│   ├── charset-manager.test.js
│   ├── glyph-extractor.test.js
│   └── ...
├── integration/                # Integration tests
│   └── ...
└── properties/                 # Property-based tests
    ├── charset-loading.test.js
    ├── homoglyph-consistency.test.js
    └── ...
```

### Configuration Files

- **tests/setup.js**: Configures test tiers and global variables
- **vitest.config.js**: Vitest configuration with setup file reference
- **.github/workflows/test.yml**: CI/CD workflow configuration

### Troubleshooting

#### Tests running with wrong tier

Check the environment variable:
```bash
echo $TEST_TIER
```

#### Property tests too slow

Use a lower tier for development:
```bash
TEST_TIER=local npm test
```

#### CI tests failing

Run with CI tier locally to reproduce:
```bash
TEST_TIER=ci npm test
```

### Future Work

Property-based tests will be implemented in Phase 5 (Task 28). The test tier system is ready and configured for use.
