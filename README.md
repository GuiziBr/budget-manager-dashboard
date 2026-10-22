# Budget Manager Dashboard

Frontend for the budget manager, built with Next.js and React.

## Tech Stack

| Category           | Technology                                                                    |
| ------------------ | ----------------------------------------------------------------------------- |
| Framework          | [Next.js 16](https://nextjs.org/) (App Router, `src/`)                        |
| Library            | [React 19](https://react.dev/)                                                |
| Language           | TypeScript (strict)                                                           |
| Styling            | [Tailwind CSS v4](https://tailwindcss.com/) (tokens in `src/app/globals.css`) |
| Data Fetching      | [TanStack Query v5](https://tanstack.com/query/latest)                        |
| UI Components      | [shadcn/ui](https://ui.shadcn.com/) (Radix UI)                                |
| Forms              | [react-hook-form](https://react-hook-form.com/) + [Zod](https://zod.dev/)     |
| Icons              | [lucide-react](https://lucide.dev/)                                           |
| Notifications      | [sonner](https://sonner.emilkowal.ski/)                                       |
| Linter / Formatter | [Biome](https://biomejs.dev/)                                                 |
| Tests              | Vitest + Testing Library + jsdom                                              |

## Project Structure

```text
src/
├── app/            # App Router: layouts, pages, error boundaries
│   └── (app)/      # Route group that shares the app shell (sidebar, tab bar, top bar)
├── components/     # Feature components, tests next to the source
│   └── ui/         # shadcn/ui primitives
├── constants/      # All UI strings (translations.ts)
├── hooks/          # TanStack Query hooks, one file per API entity
├── lib/            # API client, navigation, pure logic
├── providers/      # Query and theme providers
├── test/           # Vitest setup and shared helpers
└── types/          # Shared TypeScript types
```

## Getting Started

Requires Node.js 26 (`nvm use`).

```bash
npm install
cp .env.example .env   # set NEXT_PUBLIC_API_URL to the backend origin (not :3000, that is Next)
npm run dev
```

## Scripts

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `npm run dev`      | Start the development server                     |
| `npm run build`    | Production build and type-check                  |
| `npm start`        | Start the production server                      |
| `npm run lint`     | Biome lint only                                  |
| `npm run check`    | Biome lint, format and import order (used by CI) |
| `npm run fix`      | `check` with automatic fixes                     |
| `npm run format`   | Biome format only                                |
| `npm test`         | Vitest in watch mode                             |
| `npm run test:run` | Vitest once                                      |
| `npm run test:cov` | Vitest with coverage and thresholds (used by CI) |

Coverage thresholds in `vitest.config.ts` are a ratchet: raise them as the project grows, never lower them.

## Conventions

- Tests live next to the code as `name.test.ts(x)`; component tests start with `// @vitest-environment jsdom`.
- One hook file per API entity: `useX` for lists, `useCreateX`, `useUpdateX`, `useDeleteX` mutations that invalidate the entity query key. Use `usePagedList` for paginated, sortable lists. The API client expects JSON and an `x-total-count` header on paginated lists.
- No hard-coded UI strings in components: use `src/constants/translations.ts`.
- Import through the `@/*` alias. Components are `PascalCase.tsx`, hooks and lib files are `kebab-case.ts`.
- Style is enforced by Biome: tabs, no semicolons, no trailing commas, double quotes.
- Visual rules are in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md): semantic tokens only, no raw colours.

## Authentication

Not included yet. When it is needed, prefer a server-set `HttpOnly`, `Secure`, `SameSite` session cookie (login through a route handler or server action) over a client-readable JWT cookie, and add a `src/proxy.ts` route gate.
