# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this action, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email the maintainer directly or use [GitHub's private vulnerability reporting](https://github.com/kapilvats/testflight-distributor/security/advisories/new).

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Security Considerations

This action handles sensitive credentials:

- **API Private Key** — The `.p8` key is masked in logs via `core.setSecret()` and never written to disk
- **JWT Tokens** — Generated in-memory with 20-minute expiry, never logged
- **No external dependencies at runtime** — Only `@actions/core` and `@actions/http-client` to minimize supply chain risk

### Best Practices for Users

- Store your API key, key ID, and issuer ID as [GitHub encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- Use an API key with the minimum required role (App Manager)
- Rotate API keys periodically in App Store Connect
- Pin to a specific release tag (e.g., `@v1.0.0`) rather than `@main` for production workflows
