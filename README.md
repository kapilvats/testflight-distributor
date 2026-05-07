# distribute-testflight

Distribute an already-uploaded TestFlight build to a specific beta group for external testing — filling the gap left by `apple-actions/upload-testflight-build`, which uploads but does not distribute.

## Usage

### Combined with `apple-actions/upload-testflight-build`

```yaml
- name: Upload to TestFlight
  uses: apple-actions/upload-testflight-build@v1
  with:
    app-path: build/App.ipa
    issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
    wait-for-processing: 'true'

- name: Distribute to TestFlight Group
  uses: kapilvats/testflight-distributor@v1
  with:
    issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
    bundle-id: 'com.example.myapp'
    build-number: '42'
    group-name: 'External Beta Testers'
```

### Standalone (with built-in wait)

```yaml
- name: Distribute to TestFlight Group
  uses: kapilvats/testflight-distributor@v1
  with:
    issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
    bundle-id: 'com.example.myapp'
    build-number: '42'
    group-name: 'External Beta Testers'
    wait-for-processing: 'true'
    max-wait-minutes: '30'
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api-key-id` | Yes | | App Store Connect API Key ID |
| `issuer-id` | Yes | | App Store Connect Issuer ID |
| `api-private-key` | Yes | | The `.p8` private key contents (PKCS8 format) |
| `app-id` | No | | App Store Connect App ID. If not provided, resolved from `bundle-id` |
| `bundle-id` | No | | App bundle identifier (e.g. `com.example.app`). Used to look up `app-id` if not provided |
| `build-number` | Yes | | The build number (CFBundleVersion) to distribute |
| `app-version` | No | | The app version (CFBundleShortVersionString) to filter builds |
| `group-name` | Yes | | Name of the TestFlight beta group to distribute to |
| `notify-testers` | No | `true` | Whether to notify external testers |
| `wait-for-processing` | No | `false` | Wait for build processing before distributing |
| `max-wait-minutes` | No | `60` | Maximum minutes to wait for processing |

Either `app-id` or `bundle-id` must be provided.

## Outputs

| Output | Description |
|---|---|
| `app-id` | The resolved App Store Connect App ID |
| `build-id` | The App Store Connect Build ID |
| `group-id` | The Beta Group ID the build was distributed to |

## Prerequisites

- An **App Store Connect API key** with at least the **App Manager** role
- The beta group must **already exist** in App Store Connect
- The build must be uploaded (e.g. via Xcode, `altool`, or `apple-actions/upload-testflight-build`)

## Notes

- **First-time external distribution**: Apple requires a beta app review for the first build of a new version distributed to external testers. This review is handled by Apple and may take up to 24 hours.
- This action uses the App Store Connect API v1 with JWT (ES256) authentication. No external dependencies beyond `@actions/core` and `@actions/http-client`.

## Versioning

This action follows [semantic versioning](https://semver.org/). The `v1` tag always points to the latest `v1.x.x` release.

- **Production**: pin to a major version tag — `kapilvats/testflight-distributor@v1`
- **Exact version**: pin to a specific release — `kapilvats/testflight-distributor@v1.0.0`
- **Latest (not recommended)**: `kapilvats/testflight-distributor@main`

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, guidelines, and how to submit a pull request.

## License

MIT
