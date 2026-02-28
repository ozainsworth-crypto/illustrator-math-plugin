/**
 * Test Setup Configuration
 * 
 * Configures test execution tiers for property-based testing.
 * Different tiers use different iteration counts to balance speed and coverage.
 */

import { beforeAll } from 'vitest';

// Determine test tier from environment variable
// Defaults to 'local' for fast feedback during development
const TEST_TIER = process.env.TEST_TIER || 'local';

/**
 * Property-based test iteration counts by tier
 * 
 * - local (20): Fast feedback during development
 * - pr (50): Moderate coverage for pull requests
 * - ci (100): Full coverage for continuous integration
 * - release (200): Extensive coverage for release builds
 */
const PROPERTY_TEST_RUNS = {
  local: 20,
  pr: 50,
  ci: 100,
  release: 200
};

// Validate tier
if (!PROPERTY_TEST_RUNS[TEST_TIER]) {
  console.warn(`Unknown TEST_TIER "${TEST_TIER}", defaulting to "local"`);
  global.PROPERTY_TEST_RUNS = PROPERTY_TEST_RUNS.local;
} else {
  global.PROPERTY_TEST_RUNS = PROPERTY_TEST_RUNS[TEST_TIER];
}

// Log test tier configuration
beforeAll(() => {
  console.log(`\n🧪 Running tests in "${TEST_TIER}" tier (${global.PROPERTY_TEST_RUNS} property test runs)\n`);
});

// Export for direct import if needed
export { PROPERTY_TEST_RUNS, TEST_TIER };
