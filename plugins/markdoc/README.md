# Markdoc agent plugin

Three skills for building with Markdoc in Codex and Claude Code:

- [setup-markdoc](skills/setup-markdoc/SKILL.md): add Markdoc to an application
  and connect parsing, validation, transformation, and rendering.
- [write-markdoc](skills/write-markdoc/SKILL.md): write or edit documents using
  the application's tags, variables, conditionals, and partials.
- [create-markdoc-tag](skills/create-markdoc-tag/SKILL.md): define a custom tag,
  its schema, and its rendered element or component.

Both clients load the same skill files. Each skill provides a task workflow and
fetches relevant documentation from markdoc.dev for APIs and examples. The
plugin has no runtime dependencies, hooks, or connected services.

## Install

### skills.sh

From your application's directory, use the [skills CLI](https://skills.sh/docs/cli)
to install the skills for Codex and Claude Code:

```sh
pnpm dlx skills add https://markdoc.dev --agent codex claude-code
```

With npm, run `npx skills add https://markdoc.dev`. Choose the
skills and agents when prompted, or use `--skill write-markdoc` to select one.
Installation is project-local by default; add `--global` to use it across projects.
You can also use `markdoc/markdoc` as the source to install from GitHub.

This installs standalone skills. The marketplace commands below install them
together as the `markdoc` plugin.

### Codex plugin

```sh
codex plugin marketplace add markdoc/markdoc
codex plugin add markdoc@markdoc-plugins
```

### Claude Code plugin

```sh
claude plugin marketplace add markdoc/markdoc
claude plugin install markdoc@markdoc-plugins
```

Start a new session after installation. Ask the agent to work on Markdoc content
or integrate Markdoc with your application. For example:

> Add a warning callout tag to my Markdoc schema and use it in the setup guide.

The skills inspect the application's installed versions and conventions before
choosing an implementation.

## Local development

Check the local plugin in Claude Code without installing it, from the repository
root:

```sh
claude --plugin-dir ./plugins/markdoc plugin list
claude --plugin-dir ./plugins/markdoc
```

The list should show `markdoc@inline` as loaded. In the session, open `/plugin`
to inspect its three skills, or invoke `/markdoc:write-markdoc`. Use
`/reload-plugins` after editing skill files.

For Codex, register the local marketplace from the repository root:

```sh
codex plugin marketplace add .
codex plugin add markdoc@markdoc-plugins
codex plugin list --marketplace markdoc-plugins
```

Start a fresh Codex session in a consuming application and check that all three
skills appear in the skill picker. Select one and confirm it can read its
linked documentation. To test a pushed branch, use
`codex plugin marketplace add markdoc/markdoc --ref BRANCH` instead of `.`.

Validate Claude Code's plugin and marketplace manifests from the repository root:

```sh
claude plugin validate ./plugins/markdoc
claude plugin validate .
```

For skills.sh, list the local skills without installing them:

```sh
pnpm dlx skills add ./plugins/markdoc --list
```

To test a pushed branch, use
`https://github.com/markdoc/markdoc/tree/BRANCH` as the source. To test website
discovery before deployment, start the docs site and run
`pnpm dlx skills add http://localhost:3000 --list`. Each should list
`setup-markdoc`, `write-markdoc`, and `create-markdoc-tag`.

The plugin version is separate from the npm package versions. Keep `plugin.json`
and `.claude-plugin/plugin.json` versions in sync when releasing plugin changes.
Keep documentation links current and check guidance against released Markdoc packages.

Manifest references: [Codex](https://developers.openai.com/plugins/build/plugins)
and [Claude Code](https://code.claude.com/docs/en/plugins-reference).
