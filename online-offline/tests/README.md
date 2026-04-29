# Playwright Test Suite

End-to-end tests for online//offline, covering the critical contributor and curator flows.

## Setup

### 1. Install Playwright browser

```bash
npx playwright install chromium
```

### 2. Configure test credentials

The auth helper reads credentials from environment variables. Add these to your `.env.local`:

```
TEST_CONTRIBUTOR1_EMAIL=maya@example.com
TEST_CONTRIBUTOR1_PASSWORD=your-password
TEST_CONTRIBUTOR2_EMAIL=daniel@example.com
TEST_CONTRIBUTOR2_PASSWORD=your-password
TEST_CURATOR_EMAIL=lena@example.com
TEST_CURATOR_PASSWORD=your-password
```

`tests/helpers/auth.ts` is gitignored — do not commit credentials.

### 3. Start the dev server

The Playwright config will auto-start `npm run dev` if it's not already running. If you want to start it manually:

```bash
npm run dev
```

## Running tests

```bash
# Run all tests (headless)
npm test

# Run with interactive UI
npm run test:ui

# Run a single spec file
npx playwright test tests/contributor.spec.ts

# Run in headed mode (see the browser)
npx playwright test --headed
```

## Test files

| File | Covers |
|------|--------|
| `tests/contributor.spec.ts` | Login, dashboard, submit content, collabs, communications, profile |
| `tests/curator.spec.ts` | Login, curate interface, creator/collab/comms selection, campaigns |
| `tests/helpers/auth.ts` | Shared `loginAs()` helper and `TEST_USERS` constants |

## Notes

- Tests run against `http://localhost:3000` (configurable in `playwright.config.ts`)
- Screenshots are saved on failure in `test-results/`
- Video is retained on failure in `test-results/`
- `test-results/` and `playwright-report/` are gitignored
