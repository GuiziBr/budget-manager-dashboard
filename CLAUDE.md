# CLAUDE.md

Frontend for the budget manager: Next.js 16 (App Router, `src/`), React 19, strict TypeScript, Tailwind v4, shadcn/ui, TanStack Query, react-hook-form + Zod, Biome, Vitest. Bootstrapped from `expenses_dashboard` (sibling project, used as the reference for patterns).

## Commands

- `npm run dev` start the dev server
- `npm run check` Biome lint, format and import order (CI runs it)
- `npm run fix` same with automatic fixes
- `npm run build` production build and type-check
- `npm run test:run` unit tests once; `npm run test:cov` with coverage thresholds (CI runs it)

Before finishing a change, run `check`, `build` and `test:cov`. Node 26 (`.nvmrc`).

## Conventions

- Style is enforced by Biome: tabs, no semicolons, no trailing commas, double quotes. Markdown and `docs/` are excluded from Biome.
- Import through the `@/*` alias (maps to `src/*`).
- File names: components `PascalCase.tsx`, hooks and lib files `kebab-case.ts`, shadcn primitives lowercase `kebab-case.tsx` in `src/components/ui/` (not linted).
- Tests live next to the code as `name.test.ts(x)`. Component tests start with `// @vitest-environment jsdom`. Shared helpers are in `src/test/` (`query-wrapper.tsx` gives an isolated `QueryClient`).
- No hard-coded UI strings in components: add them to `src/constants/translations.ts`.
- One hook file per API entity in `src/hooks/`: `useX` for lists and `useCreateX`, `useUpdateX`, `useDeleteX` mutations that invalidate the entity query key. Use `usePagedList` for paginated, sortable lists.
- API calls go through `src/lib/api.ts` (JSON, typed `ApiError`, `getWithHeaders` reads `x-total-count`). The base URL comes from `NEXT_PUBLIC_API_URL`.
- Pure logic goes in `src/lib/` and is held to a higher coverage bar (90%).
- Coverage thresholds in `vitest.config.ts` only go up, never down.
- Versions of next, react, typescript and biome are pinned (no `^`). Upgrade them deliberately.

## Design

Follow `DESIGN_SYSTEM.md`. Use semantic tokens only (`bg-card`, `text-muted-foreground`, `border-input`), never raw colours or `dark:` variants. Use `Button` variants instead of recolouring. Check new screens in light and dark, on desktop and at 390px wide. Tokens live in `src/app/globals.css`; the file wins over the doc if they differ.

## Structure notes

- Pages that need the app shell live in `src/app/(app)/`; its layout renders the sidebar, bottom tab bar and top bar once.
- Navigation entries and page titles are defined in `src/lib/navigation.ts`.
- There is no authentication yet. If added, prefer a server-set `HttpOnly` session cookie over a client-readable JWT.
- Docs go in `docs/` (`specs/`, `plans/`, `APIs/`, `ui/`).

## Git

Default branch is `development`; CI runs on pushes and PRs to it. Commits use conventional commit messages.
