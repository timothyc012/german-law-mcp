# Architecture

## Goal

Create one Theo-facing legal/tax experience without physically merging unrelated
repositories.

Theo acts as the orchestrator:

1. Interpret the user's legal/tax task.
2. Select a route from `routing-matrix.md`.
3. Use MCP tools directly when the task is tool-sized.
4. Hand off to a workspace specialist when the task needs a full workflow,
   local libraries, document state, or domain-specific RAG.
5. Report source status, assumptions, and confidence.

## Canonical Components

### Orchestrator

`theo-legal` remains the front door. It owns tone, safety posture, source
discipline, and routing decisions.

### MCP Engines

`german-law-mcp` and `steuer-mcp` should be wired into Claude Code and Codex as
MCP servers. These are suitable for direct calls because they expose bounded
tools with structured outputs.

### Workspace Specialists

`legal-research`, `gdpr-expert`, and `contract-review` should remain separate
workspaces. Theo should treat them as specialist workflows:

- use `legal-research` for multi-jurisdiction and broad legal research;
- use `gdpr-expert` for EU privacy and data-protection deep work;
- use `contract-review` for document review, redlines, drafting, and rereview.

## Non-Goals

- Do not vendor large knowledge bases into this pack.
- Do not rewrite or inherit git history from unrelated source repositories.
- Do not make this pack the only source of truth for statutes, cases, or tax
  rules.
- Do not store secrets, client documents, generated reports, or local profiles
  in the shareable package.

## Recommended Repository Strategy

For a clean GitHub contributor list, create a new repository from this pack's
files only:

1. Copy `theo-legal-tax-pack/` to a fresh directory.
2. Initialize a new git repository there.
3. Commit as the desired human author.
4. Push to a new GitHub repo.

This avoids inheriting contributors from any other source repository.
