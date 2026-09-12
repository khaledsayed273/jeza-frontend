# AGENTS.md

Client-only React SPA for "مواكبة" (Muwakaba), an Arabic-first Saudi HR / Saudization platform. The backend API is a separate codebase/process and is **not** in this repository.

## Scope & Investigation

* **Do not scan the entire repository by default.**
* Start with the exact page, component, API endpoint, hook, file, or feature mentioned by the user.
* For an API task, start at `client/src/lib/api.ts` and trace only the affected query/mutation and its consumers.
* For a page task, inspect that page and its directly related components/API calls only.
* For a calculator task, inspect the specific calculator first; do not scan other calculators.
* Expand the investigation only when the relevant execution path requires it.
* Repository-wide searches are only for explicit audits, migrations, "find all", removal, or reference-check tasks.
* Do not read unrelated files or rediscover architecture unnecessarily.
* Keep changes limited to the requested scope; avoid unrelated refactoring.
* Prefer the smallest correct change.

## Architecture

* All app code is under `client/src`; Vite root is `client/`.
* Routing uses **wouter**, with routes in `client/src/App.tsx`.
* API access goes through `client/src/lib/api.ts`; it is a custom fetch + TanStack Query wrapper, not actual tRPC.
* The backend is external and runs separately on port `8080`.
* Do not add backend/server code to this repository.
* New feature pages normally involve the page, its route in `App.tsx`, and the relevant Home/service entry when applicable.
* `todo.md` is historical project context; consult it only when relevant to the requested feature.

## Data

* Runtime application/business/content data must come from the external backend/API.
* Do not introduce hardcoded production datasets in the client as a replacement for API data.
* Static UI configuration, constants, calculator formulas, enums, icons, and technical configuration may remain in code.
* Do not duplicate backend data in client files.

## UI / Conventions

* Arabic-first bilingual UI: use `LanguageContext` and `t("Arabic", "English")`.
* LanguageContext controls `dir` (`rtl`/`ltr`).
* Default theme is dark via `ThemeContext`.
* Tailwind CSS v4; theme tokens are CSS variables in `client/src/index.css`.
* Use the existing shadcn/ui conventions; do not introduce unrelated UI systems.
* Excel/PDF exports use the existing `xlsx`, `docx`, `html2canvas`, and branding helpers.
* Aliases: `@` → `client/src`, `@shared` → `shared`.

## Environment

* Use **pnpm**, not npm.
* `pnpm dev` — Vite on port `3000`.
* `pnpm check` — TypeScript verification; this is the main verification gate.
* `pnpm build` — production build.
* `pnpm format` — Prettier.
* Backend environment variables such as `DATABASE_URL` and `JWT_SECRET` belong to the external backend, not this client.
* `VITE_FRONTEND_FORGE_API_KEY` / `VITE_FRONTEND_FORGE_API_URL` are client-side variables used by the map feature.

## Verification

* Run only checks relevant to the change.
* Normally use `pnpm check`; run `pnpm build` when the change affects build/runtime behavior.
* Do not run unrelated expensive commands.

## Core Rule

**Solve the user's request using the smallest relevant scope. Do not inspect the repository file-by-file unless the task genuinely requires a repository-wide investigation.**
