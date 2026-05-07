# Contributing to testflight-distributor

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/kapilvats/testflight-distributor.git
cd testflight-distributor

# Install dependencies
npm install

# Run the full check (lint + test + build)
npm run all
```

### Prerequisites

- Node.js 20+
- npm 9+

## Project Structure

```
├── action.yml           # GitHub Action definition
├── src/
│   ├── main.ts          # Entry point — reads inputs, orchestrates
│   ├── app-store-connect.ts  # JWT auth + API client
│   └── wait-for-processing.ts # Build processing poll loop
├── __tests__/           # Jest tests
├── dist/                # Compiled bundle (committed)
└── .github/workflows/
    └── ci.yml           # Lint, test, build, dist check
```

## Making Changes

1. **Fork** the repository and create a branch from `main`
2. Make your changes in `src/`
3. Add or update tests in `__tests__/`
4. Run the full check:
   ```bash
   npm run all
   ```
5. **Rebuild `dist/`** — this is required. The compiled bundle is committed to the repo because GitHub Actions pulls it directly. If you skip this, CI will fail the diff check.
   ```bash
   npm run build
   ```
6. Commit everything including `dist/` changes
7. Open a pull request

## Available Scripts

| Script | Description |
|---|---|
| `npm test` | Run tests with Jest |
| `npm run lint` | Run ESLint |
| `npm run build` | Compile with ncc into `dist/` |
| `npm run all` | Lint + test + build (run before committing) |

## Writing Tests

Tests use Jest with `ts-jest`. The HTTP client is mocked — no real API calls are made during tests.

```bash
# Run tests
npm test

# Run tests in watch mode
npx jest --watch
```

When adding new API methods to `AppStoreConnectClient`, add corresponding tests in `__tests__/app-store-connect.test.ts` covering:
- Success case
- Error/not-found case
- API error response handling

## Code Style

- TypeScript strict mode
- ESLint with `@typescript-eslint` rules
- No external runtime dependencies beyond `@actions/core` and `@actions/http-client`
- JWT is generated with Node.js `crypto` — no JWT libraries

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Update tests for any behavior changes
- Ensure `npm run all` passes
- Include `dist/` changes in the commit
- Write a clear PR description explaining what and why

## Reporting Issues

- Use [GitHub Issues](https://github.com/kapilvats/testflight-distributor/issues)
- Include the action version, runner OS, and relevant workflow YAML
- Redact any API keys or sensitive information

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
