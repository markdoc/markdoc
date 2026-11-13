# Changesets

Run commands from the repository root using the Node version in `.node-version`.

## Add release notes

Run `pnpm changeset` for changes to public APIs, runtime behavior, or published
types. Select the affected packages, write a user-facing summary, and commit the
generated `.changeset/*.md` file with your change.

Documentation, tests, and internal tooling changes can omit a changeset.

`@markdoc/markdoc` and `@markdoc/next.js` are versioned independently. Select
both when a change requires releases of both packages. The integration tests
use the local Markdoc workspace; the published integration retains its existing
peer dependency ranges.

For Markdoc's 0.x releases:

- `patch`: compatible fixes.
- `minor`: new APIs or intentional breaking changes; include migration guidance.
- `major`: an intentional move to 1.0.

## Check versions

- `pnpm changeset:status`: inspect pending releases.
- `pnpm version-packages`: generate version, changelog, and lockfile updates.
  Use a disposable checkout to rehearse; this command does not publish.

## Release

1. Merge changes into `main`. The `Release` workflow automatically opens or updates
   the **Version Packages** PR when changesets are present.
2. Review the version, changelog, and lockfile changes. Close and reopen the
   bot-created PR to trigger its required `build` check, then merge once it passes.
3. If any public package version is not yet on npm, a Core-team reviewer approves the `publish`
   job in the `Release` workflow to publish packages and create Git tags and
   GitHub releases.

Each published package must configure npm trusted publishing for the GitHub
repository `markdoc/markdoc`, workflow `release.yml`, and environment `release`.
Before the first release of `@markdoc/next.js` from this repository, update its
trusted publisher from `markdoc/next.js` to `markdoc/markdoc` in the package's npm
settings. Changesets publishes only versions missing from npm.
