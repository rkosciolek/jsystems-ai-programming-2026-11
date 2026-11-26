# Brief T17 — chat view (replaces the temporary first-message view)

- **Task:** T17, issue #26. Prerequisites T15, T16 accepted. Concurrent: none on these files.
- **Worker:** Luna (OpenCode). Repo root `/home/labuser/Dokumenty/repo/jsystems-ai-programming-2026-11`, app in `app/`.

## Read
- `docs/ADR/003-frontend.md` §3.4 entirely (useChat seeding, transport `body`, `dataPartSchemas`, header bar, badge source order, collapsible summary < 768 px, message list with stick-to-bottom + "scroll to latest", Streamdown with raw HTML disabled, "Zmieniona ocena" chip, muted-but-readable disclaimer, typing indicator, prompt input rules incl. IME, counter from 1800, `maxLength` 2000, no attachments, error + Ponów via `regenerate()`, 404 detection via a transport `fetch` wrapper → "Sprawa wygasła. Rozpocznij nową sprawę." + Nowa sprawa + input disabled, AlertDialog for Nowa sprawa), §3.5 badge colors, §3.6, §8 rows "Badge source", "Chat input", "Chat retry", TD-301, TD-303.
- `docs/PRD.md` §9.3, AC-32…AC-44, AC-46, AC-50, AC-52.
- T16 report `docs/.agents_brief/poc-implementation-plan-T16-api-chat.report.md` (stream contract).
- Code: `app/src/app/page.tsx` and `page-state.ts` (chat state), `app/src/components/first-message-view/**` (temporary; reuse its badge and dialog logic, then remove the folder), `app/src/components/ui/{message,message-scroller,input-group,collapsible,alert-dialog,badge,button}.tsx` (AI Elements patterns from ui.shadcn.com — use them), `app/src/lib/domain`, `app/src/lib/i18n/pl.ts` (add nothing; report missing strings). `app/AGENTS.md`.
- `npx ctx7@latest docs /vercel/ai/ai_7.0.0 "useChat DefaultChatTransport body fetch dataPartSchemas regenerate status"`.

## Editable files
`app/src/components/chat/**`, `app/src/components/first-message-view/**` (delete it), `app/src/app/page.tsx` (chat branch only), `app/tests/unit/chat/**`, `app/tests/unit/page-state/**` (only to replace references to the removed view).

## Steps
1. RTL tests first (mock `useChat` or the transport where ADR-003 §8 says so): badge source (metadata only, then a `data-decision` part); "Zmieniona ocena" chip; input whitespace disabled, 2000 cap, Enter sends, Shift+Enter newline, IME composing does not send; counter from 1800; typing indicator for `submitted` and `streaming` without text; `status=error` → inline error under the last user message + Ponów calls `regenerate` and the user message is not duplicated; 404 wrapper → expired text, input disabled, Nowa sprawa; summary collapsed under 768 px; no attachment control; New case dialog cancel/confirm. Red → record.
2. Implement; `npm test`, lint, typecheck, build green. Do not start servers; the Q4 gate does that.

## Tool guidance (plan §4.2)
1. `--help` → Context7 → official docs last. Research via `opencode run -m opencode/deepseek-v4.1-flash-free --agent plan "<q>; answer with sources"`.
2. npm only, never install. No git. Never open `.env`. Edit only the listed files. Report contradictions and missing `pl.ts` strings.

## Report
`docs/.agents_brief/poc-implementation-plan-T17-chat-view.report.md`: files, red/green with counts, ADR-003 §8 row → test table, missing strings, contradictions.
