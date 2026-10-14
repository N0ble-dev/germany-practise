# Neon tooling changes

The requested [Neon skill](https://neon.com/.well-known/agent-skills/neon/SKILL.md) was fetched and read. Its overview matched the installed project skill. All eight relevant skills were already present under `.agents/skills`: Neon, Postgres, branches, Auth, object storage, Functions, AI Gateway and the egress optimizer. The installed Neon CLI is version 8.0.12; it was reused.

The seven general Neon skills were refreshed with the official scoped installer, explicitly selecting Codex. Auth was fetched separately from its documented skill/reference URLs. The overview and its two Auth reference files changed; a file-level comparison report is kept in the ignored cache. Unrelated frontend/animation skills were not refreshed. The previous Neon skill directories are backed up under `.cache/neon-skills-before/`.

The Neon MCP connection was missing. The project-level configuration written by the official CLI was not visible to this installed Codex CLI, so that newly created entry was moved to `.cache/neon-project-mcp-config.toml`. The supported global configuration now contains one additional server:

```toml
[mcp_servers.Neon]
type = "http"
url = "https://mcp.neon.tech/mcp"
```

This uses OAuth and stores no new API key. `codex mcp list --json` confirms `Neon` is enabled and currently **not signed in**. Existing `C:/Users/DELL/.codex/config.toml` settings and comments were preserved exactly as the prefix of the updated file. A backup is in `.cache/codex-config.before-neon-mcp.toml`. These ignored backups may contain private settings and should remain local.

No new Neon project, branch, bucket or Function was provisioned. No live database migration was run. Database/Auth/calendar environment values were preserved; the only application environment additions from the content implementation were the seven explicitly requested content-access assignments for the supplied Google account. No browser OAuth flow was launched unattended.

To activate the MCP connection, run `codex mcp login Neon` yourself or connect Neon through Codex, then restart the Codex session so its tool list reloads. For the development branch migration, refresh the separate Neon CLI login with `neon auth --profile DEFAULT`. The fetched skill reserves browser authentication for the human account holder. [Neon MCP setup instructions](https://neon.com/.well-known/agent-skills/neon/SKILL.md).

Updated skills are available on the next turn. The new content pipeline's complete code/setup summary is in [content-pipeline-setup.md](content-pipeline-setup.md).

## Follow-up on 14 October 2026

The saved Neon CLI session now works; no new browser login, MCP installation or configuration rewrite was needed. For the [exam implementation](exam-preparation-implementation.md), migrations were tested on existing `vercel-dev` and applied there before production. A temporary pre-migration production recovery branch was created with expiry on 21 October, 04:00 UTC. Catalog/exam migrations are now applied to both branches, and the same original exam pack is staged privately as an unpublished draft. Runtime database/Auth/calendar environment settings were preserved; no reviews, publications, synthetic users or learner attempts were created.
