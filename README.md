# ⚡ Speed Chat

A fast, full-featured AI chat app with multi-model support, real-time sync, web search, code execution, and image generation. Built with Next.js 16, Convex, and Vercel AI SDK.

## Features

**Chat** — Switch between frontier models (GPT-5.2, Claude Opus/Sonnet, Gemini 3, and more) via OpenRouter. Chat history syncs across devices with auto-saved drafts.

**Image Generation** — Generate images with configurable aspect ratios and reference images using Nano Banana models.

**Tools** — Web search (Exa), code execution (Python 3.13 & Node.js 24 via Vercel Sandbox), and interactive clarification questions when the model needs more context.

**Files** — Drag-and-drop or select images and PDFs into messages.

**Custom Instructions** — Add personal context (name, profession, and background) plus response preferences. These are persisted in Convex and automatically appended to the system prompt on every request for a personalized experience.

**Organization** — Pin conversations, branch from any message, full-text search across all chats, and share with public links.

**UI** — Dark/light themes, rich rendering for code blocks (Shiki), LaTeX, and tables. Keyboard shortcuts available (Cmd+K search, Cmd+Shift+O new chat).

## Tech Stack

| Layer          | Tech                       |
| -------------- | -------------------------- |
| Framework      | Next.js 16 (App Router)    |
| Backend        | Convex                     |
| AI             | Vercel AI SDK, OpenRouter  |
| Auth           | Convex Auth + Google OAuth |
| Styling        | Tailwind CSS v4, shadcn/ui |
| State          | Zustand                    |
| Search         | Exa API                    |
| Code Execution | Vercel Sandbox             |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh)
- [Convex](https://convex.dev) account
- [OpenRouter](https://openrouter.ai) API key
- Google OAuth credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [Exa](https://exa.ai) API key (web search)
- [Vercel](https://vercel.com) OIDC token (code execution)

### Setup

1. Clone the repo and install dependencies:

```bash
git clone https://github.com/sudoanmol/speed-chat.git
cd speed-chat
bun install
```

2. Start the Convex dev server and follow the [Convex Auth setup](https://labs.convex.dev/auth/setup):

```bash
bun run dev:convex
bunx @convex-dev/auth
```

3. Add additional environment variables to `.env.local`:

```
EXA_API_KEY=
VERCEL_OIDC_TOKEN=
```

4. Start development servers:

```bash
bun run dev               # Next.js + Convex via mprocs
```

## Project Structure

```
src/
  app/                    # Pages and API routes
    api/chat/             # Chat streaming endpoint
    chat/[id]/            # Individual chat view
    generate-images/      # Image generation
    share/[id]/           # Public shared chat view
  components/
    ai-elements/          # Message rendering (code, tools, reasoning)
    ui/                   # shadcn/ui primitives
  hooks/                  # Custom React hooks
  lib/                    # Utilities, types, stores
convex/                   # Backend
  schema.ts               # Database schema
  chat.ts                 # Chat CRUD
  chatActions.ts          # Branching, pinning
  search.ts               # Full-text search
  storage.ts              # File uploads
  imageGeneration.ts      # Image generation
```

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `bun run dev`        | Dev server (Next.js + Convex)  |
| `bun run build`      | Production build               |
| `bun run typecheck`  | TypeScript + Convex type check |
| `bun run lint`       | ESLint                         |
| `bun run format`     | Prettier                       |
| `bun run shadcn-add` | Add shadcn/ui components       |
