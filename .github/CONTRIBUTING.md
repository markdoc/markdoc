# Contributing

If you have found a bug or have a feature suggestion, please feel free to [open an issue](https://github.com/markdoc/markdoc/issues).

If you’d like to make changes yourself, follow these steps:

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository and [clone](https://help.github.com/articles/cloning-a-repository/) it locally
1. Use the Node version specified in `.node-version`
1. Install [pnpm](https://pnpm.io/installation), using the version pinned in `package.json` (with Corepack, run `corepack enable`)
1. Run `pnpm install`
1. Build the library using `pnpm run build`
1. Test your changes with `pnpm test` and `pnpm run marktest`
1. Run `pnpm changeset` for changes to package behavior, public APIs, or published types, and commit the generated release note
1. Finally, submit a [pull request](https://help.github.com/articles/creating-a-pull-request-from-a-fork/)

Write release notes in terms of the user-visible fix or feature. Documentation,
tests, and internal tooling changes do not need a package release. See the
[Changesets guide](../.changeset/README.md) for bump selection, inspecting pending
changes, and preparing a version update.
