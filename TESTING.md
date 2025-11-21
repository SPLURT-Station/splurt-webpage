# Testing Guide

This document describes the testing strategy and how to run tests for the S.P.L.U.R.T. Station website.

## Testing Stack

- **Test Runner**: Bun's built-in test runner (`bun:test`)
- **Type Checking**: Astro's built-in TypeScript checking (`astro check`)
- **E2E Testing**: Playwright (optional, for full browser testing)

## Test Structure

```
├── src/
│   ├── utils/
│   │   ├── ageGate.ts          # Utility functions
│   │   └── ageGate.test.ts     # Unit tests for age gate
│   ├── pages/
│   │   └── index.test.ts       # Page-level tests (placeholder)
│   └── ...
├── e2e/
│   └── age-gate.test.ts        # E2E tests (requires dev server)
└── package.json
```

## Running Tests

### Run All Tests

```bash
bun test
```

### Run Tests in Watch Mode

```bash
bun test:watch
```

### Run Tests with Coverage

```bash
bun test:coverage
```

### Run Specific Test File

```bash
bun test src/utils/ageGate.test.ts
```

### Run Type Checking

```bash
bun run astro check
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual functions and utilities in isolation.

**Location**: `src/**/*.test.ts`

**Examples**:

- Age gate localStorage utilities (`ageGate.test.ts`)
- Meta tag generation utilities (`metaTags.test.ts`)

**Recommended Tests**:

- ✅ Age gate localStorage operations
- ✅ Error handling (localStorage quota exceeded, disabled, etc.)
- ✅ Edge cases (undefined values, empty strings, etc.)

### 2. Component Tests

**Purpose**: Test Astro components for correct rendering and props.

**Location**: `src/**/*.test.ts` (alongside components)

**Recommended Tests**:

- ✅ Layout component meta tag generation
- ✅ WorkInProgress component structure
- ✅ Image optimization and asset handling
- ✅ Props validation

**Note**: Full component testing may require `@astrojs/testing` or Playwright for rendering tests.

### 3. Integration Tests

**Purpose**: Test how different parts of the application work together.

**Recommended Tests**:

- ✅ Build process completes successfully
- ✅ All pages can be rendered
- ✅ Assets are properly optimized
- ✅ SEO meta tags are correctly generated

### 4. E2E (End-to-End) Tests

**Purpose**: Test the full user flow in a browser environment.

**Location**: `e2e/**/*.test.ts`

**Recommended Tests**:

- ✅ Age gate shows on first visit
- ✅ Age gate hides after confirmation
- ✅ Age gate persists across page refreshes
- ✅ Navigation links work correctly
- ✅ Play button opens correct URL

**Setup** (requires Playwright):

```bash
bun add -d @playwright/test playwright
bunx playwright install
```

## Recommended Tests for This App

### High Priority

1. **Age Gate Functionality** ✅
   - [x] Unit tests for localStorage operations
   - [ ] E2E test: Age gate shows on first visit
   - [ ] E2E test: Age gate hides after clicking continue
   - [ ] E2E test: Age gate persists across refreshes

2. **Layout Component** ✅
   - [x] Meta tag URL generation
   - [ ] Test different imageStrategy options
   - [ ] Test fallback image handling
   - [ ] Test absolute vs relative URLs

3. **Build Process** ✅
   - [x] Build succeeds (already in CI)
   - [ ] Output directory structure
   - [ ] Asset optimization

### Medium Priority

4. **Navigation**
   - [ ] All nav links are valid
   - [ ] External links open correctly
   - [ ] Active state for current page

5. **Accessibility**
   - [ ] Age gate has proper ARIA attributes
   - [ ] Semantic HTML structure
   - [ ] Keyboard navigation

6. **SEO**
   - [ ] Meta tags are present
   - [ ] Open Graph tags are correct
   - [ ] Twitter Card tags are correct

### Low Priority

7. **Visual Regression** (requires visual testing tools)
   - [ ] Screenshot comparison
   - [ ] Responsive design checks

8. **Performance**
   - [ ] Lighthouse scores
   - [ ] Image optimization
   - [ ] Bundle size

## Writing New Tests

### Unit Test Example

```typescript
import { describe, test, expect } from "bun:test";
import { getAgeConfirmationStatus } from "../utils/ageGate";

describe("Age Gate", () => {
  test("should return false when localStorage is empty", () => {
    localStorage.clear();
    expect(getAgeConfirmationStatus()).toBe(false);
  });
});
```

### E2E Test Example (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test("age gate shows on first visit", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page.locator("#age-gate-overlay")).toBeVisible();
});
```

## CI/CD Integration

Tests are automatically run in GitHub Actions via `.github/workflows/test.yml`:

- TypeScript checking (`astro check`)
- Unit tests (`bun test`)
- Build test (`bun run build`)

## Best Practices

1. **Write tests alongside code** - Don't wait until the end
2. **Test edge cases** - What happens when localStorage fails? When images are missing?
3. **Keep tests simple** - One assertion per test when possible
4. **Use descriptive test names** - "should hide age gate after confirmation" not "test 1"
5. **Test user-facing behavior** - Focus on what users see and do
6. **Mock external dependencies** - Don't rely on external services in unit tests

## Resources

- [Bun Test Documentation](https://bun.com/docs/test/writing)
- [Astro Testing Guide](https://docs.astro.build/en/guides/testing/)
- [Playwright Documentation](https://playwright.dev/)
