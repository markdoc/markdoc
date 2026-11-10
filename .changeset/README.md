# Changesets

Run commands from the repository root using the Node version in `.node-version`.

## Add release notes

Run `pnpm changeset` for changes to public APIs, runtime behavior, or published
types. Select the affected packages, write a user-facing summary, and commit the
generated `.changeset/*.md` file with your change.

Documentation, tests, and internal tooling changes can omit a changeset.

For Markdoc's 0.x releases:

- `patch`: compatible fixes.
- `minor`: new APIs or intentional breaking changes; include migration guidance.
- `major`: an intentional move to 1.0.

## Check versions

- `pnpm changeset:status`: inspect pending releases.
- `pnpm version-packages`: generate version, changelog, and lockfile updates.
  Use a disposable checkout to rehearse; this command does not publish.

## Release

1. Merge changes into `main`. A Core-team reviewer approves the `Release` job to
   open or update the **Version Packages** PR.
2. Review the version, changelog, and lockfile changes. Close and reopen the
   bot-created PR to trigger its required `build` check, then merge once it passes.
3. Approve the next `Release` job to publish packages and create Git tags and
   GitHub releases.
