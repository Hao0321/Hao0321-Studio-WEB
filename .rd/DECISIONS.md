# Architecture Decisions

Append dated decisions with evidence and rollback conditions.

## 2026-08-12 — Restore brand system, retain discoverability work

- Decision: use the historical Liquid Glass v3 homepage as the visual baseline instead of the split-layout redesign.
- Preserve: `/works/`, `/about`, `/blog/`, `/tools/`, `/resources/`, `/pipeline/`, `/Freeworkshop/`, sitemap, robots, `llms.txt`, headers, and child game site.
- Improve: Hao-first copy, truthful one-person positioning, direct-answer content, Person/Organization/WebSite/WebPage/ItemList/FAQ structured data, and deferred loading for the 8.2 MB scroll sequence.
- Guardrail: do not replace the brand system during future SEO or information-architecture work.
- Rollback: visual source remains available at commit `196ea4b`; previous production state remains at `1fb391d`.
