# Markdoc agent plugin

Three skills for building with Markdoc in Codex and Claude Code:

- [setup-markdoc](skills/setup-markdoc/SKILL.md): add Markdoc to an application
  and connect parsing, validation, transformation, and rendering.
- [write-markdoc](skills/write-markdoc/SKILL.md): write or edit documents using
  the application's tags, variables, conditionals, and partials.
- [create-markdoc-tag](skills/create-markdoc-tag/SKILL.md): define a custom tag,
  its schema, and its rendered element or component.

Both clients load the same skill files. The plugin contains instructions and
examples, with no runtime dependencies, hooks, or connected services.

## Install

### Codex

```sh
codex plugin marketplace add markdoc/markdoc
codex plugin add markdoc@markdoc-plugins
```

### Claude Code

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

From the Markdoc repository root, add the local marketplace using `.` in place
of `markdoc/markdoc` in the commands above. Claude Code also supports loading the
plugin for a single session:

```sh
claude --plugin-dir ./plugins/markdoc
```

Validate Claude Code's plugin and marketplace manifests from the repository root:

```sh
claude plugin validate ./plugins/markdoc
claude plugin validate .
```

The plugin version is separate from the npm package versions. Keep `plugin.json`
and `.claude-plugin/plugin.json` versions in sync when releasing plugin changes.
Check examples against released Markdoc packages before documenting new APIs.

Manifest references: [Codex](https://developers.openai.com/plugins/build/plugins)
and [Claude Code](https://code.claude.com/docs/en/plugins-reference).
