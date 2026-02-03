# Speed Chat

A fully-featured AI chat application with support for multiple frontier models, file uploads, web search, code execution, and image generation. Built with Next.js 16, Convex, and Vercel AI SDK.

## Features

### Core Chat

- **Multi-model support** via OpenRouter (GPT-5.2, Claude Opus/Sonnet, Gemini 3, and more)
- **Persistent chat history** synced across devices
- **Draft auto-save** so you never lose unsent messages
- **Image generation** with configurable aspect ratios and reference images

### Tools

- **Web search** powered by Exa API for real-time information
- **Code execution** with Python 3.13 and Node.js 24 via Vercel Sandbox

### File Handling

- Upload images and PDFs alongside messages
- Drag-and-drop support
- Up to 5 files per message (4MB each)

### Organization

- Pin important conversations
- Branch/fork conversations from any message in a chat
- Full-text search across all chats and messages
- Share chats with public links

### UI

- Dark and light themes
- Rich formatting for code, LaTeX, and tables
- Keyboard shortcuts (Cmd+K for search, Cmd+Shift+O for new chat)

## Tech Stack

| Category       | Technologies               |
| -------------- | -------------------------- |
| Framework      | Next.js 16 (App Router)    |
| Backend        | Convex                     |
| AI             | Vercel AI SDK, OpenRouter  |
| Auth           | Convex Auth + Google OAuth |
| Styling        | TailwindCSS v4, shadcn/ui  |
| State          | Zustand                    |
| Search         | Exa API                    |
| Code Execution | Vercel Sandbox             |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (or pnpm/npm)
- A [Convex](https://convex.dev) account
- An [OpenRouter](https://openrouter.ai) API key
- Google OAuth credentials (for authentication)
- An [Exa](https://exa.ai) API key (for web search)
- [Vercel](https://vercel.com) OIDC token for sandbox access (for code execution)

### Installation

1. Clone and install dependencies:

```bash
git clone https://github.com/sudoanmol/speed-chat.git
cd speed-chat
bun install
```

2. Start the Convex dev server:

```bash
bun run dev:convex
```

3. Setup Convex Auth - follow the [Convex Auth docs](https://labs.convex.dev/auth/setup):

```bash
bunx @convex-dev/auth
```

4. Add the following variables to your `.env.local`:

```
EXA_API_KEY=your_exa_api_key
VERCEL_OIDC_TOKEN=your_vercel_oidc_token
```

5. Start the development server:

```bash
bun run dev # Starts both Next.js and Convex dev servers together using `mprocs`
```

## Project Structure

```
src/
  app/                    # Next.js pages and API routes
    api/chat/             # Chat streaming endpoint
    chat/[id]/            # Individual chat view
    generate-images/      # Image generation page
    share/[id]/           # Public shared chat view
  components/             # React components
    ai-elements/          # Message rendering (code, tools, reasoning)
    ui/                   # shadcn/ui components
  hooks/                  # Custom React hooks
  lib/                    # Utilities, types, and stores
convex/                   # Backend functions and schema
  schema.ts               # Database schema
  chat.ts                 # Chat CRUD operations
  chatActions.ts          # Chat-related actions (branching, pinning)
  search.ts               # Full-text search
  storage.ts              # File upload handling
  imageGeneration.ts      # Image generation logic
```

## Scripts

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `bun run dev`        | Start development server (Next.js + Convex) |
| `bun run build`      | Build for production                        |
| `bun run typecheck`  | Run TypeScript type checking                |
| `bun run lint`       | Run ESLint                                  |
| `bun run format`     | Format code with Prettier                   |
| `bun run shadcn-add` | Add shadcn/ui components                    |
