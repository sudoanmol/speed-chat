## Project Rules for AI Agents

- Use bun as package manager.
- Use shadcn/ui as component library. Install components using `bun run shadcn-add <component>`.
- Queries should use `useQueryWithStatus` from `@/lib/utils` instead of `useQuery` from `convex/react`. It's wrapper for `useQuery` from `convex/react` and exports: isPending, isError, data, error, isLoading, isSuccess for each query.
- Mutations from convex should use `useMutation` from `convex/react` and be wrapped in try-catch blocks. The error in the catch block should use `toast.error(getErrorMessage(error))` with `getErrorMessage` imported from `@/lib/error`
- Use `toast` from `react-hot-toast` for all toast notifications.
- Use Image from `next/image` for all images.
- Use Link from `next/link` for app links and `<a>` for external links.
- Break down complex components into smaller components.
- Use kebab-case naming convention for file names.
- Use Lucide React for icons.
- Use `cn` from `@/lib/utils` for all class name merging.
- Never create markdown files (`.md`) after you are done. Never!
- Never cast to any type. Always use correct types.
- Use `convex-helpers/server/relationships` for queries with single indexes. These cannot be used with compound indexes. It exports `getOneFrom` (one-to-many), `getManyFrom` (many-to-one), `getAll` (all items), and `getManyVia` (many-to-many) functions.
- Use authedMutation, authedQuery, and authedAction from convex/user.ts when the convex functions need authed user. It puts the authed user's userId into ctx so you can use ctx.userId directly.
