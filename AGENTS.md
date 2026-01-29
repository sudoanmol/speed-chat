# Project Rules for AI Agents

## General Rules

- This is a Next.js 16 app dir + Convex project.
- Use bun as package manager.
- Use shadcn/ui as component library. Install components using `bun run shadcn-add <component>`.
- Queries should use `useQueryWithStatus` from `@/lib/utils` instead of `useQuery` from `convex/react`. It's wrapper for `useQuery` from `convex/react` and exports: isPending, isError, data, error, isLoading, isSuccess for each query.
- Mutations from convex should use `useMutation` from `convex/react` and be wrapped in try-catch blocks. The error in the catch block should use `toast.error(getErrorMessage(error))` with `getErrorMessage` imported from `@/lib/convex-error`
- Use `toast` from `sonner` for all toast notifications.
- Use Image from `next/image` for all images.
- Use Link from `next/link` for app links and `<a>` for external links.
- Break down complex components into smaller components.
- Use kebab-case naming convention for file names.
- Use Lucide React for icons.
- Use `cn` from `@/lib/utils` for all class name merging.
- Never create markdown files (`.md`) after you are done. Never!
- Never cast to any type.
- Use `convex-helpers/server/relationships` for queries with single indexes. These cannot be used with compound indexes. It exports `getOneFrom` (one-to-many), `getManyFrom` (many-to-one), `getAll` (all items), and `getManyVia` (many-to-many) functions.
- Use authedMutation, authedQuery, and authedAction from convex/user.ts when the convex functions need authed user. It puts the authed user's userId into ctx so you can use ctx.userId directly.

## Scripts

- `bun run dev` - Start dev server (runs Next.js and Convex in parallel via mprocs). NEVER RUN THIS. ALWAYS ASSUME DEV SERVERS ARE ALREADY RUNNING.
- `bun run build` - Build for production
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Run ESLint with auto-fix
- `bun run format` - Format code with Prettier
- `bun run typecheck` - Run TypeScript type checking + generate Convex types
- `bun run shadcn-add <component>` - Add shadcn/ui components
