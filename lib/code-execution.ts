import { Sandbox } from '@vercel/sandbox'
import { tool } from 'ai'
import { z } from 'zod'

// ============ CODE EXECUTION TOOL ============

const SUPPORTED_LANGUAGES = ['python', 'nodejs'] as const

const RUNTIME_MAP = {
  python: 'python3.13',
  nodejs: 'node24',
} as const

const COMMAND_MAP = {
  python: { cmd: 'python3', extension: 'py' },
  nodejs: { cmd: 'node', extension: 'js' },
} as const

export type CodeExecutionResult = {
  stdout: string
  stderr: string
  exitCode: number
  executionTimeMs: number
  error?: string
}

export const codeExecution = () =>
  tool({
    description: `Execute Python or Node.js code in an isolated sandbox. Use for calculations, data processing, testing code, or any computation. Max 30 second execution.`,
    inputSchema: z.object({
      code: z.string().describe('The code to execute'),
      language: z.enum(SUPPORTED_LANGUAGES).describe('Programming language: "python" or "nodejs"'),
    }),
    execute: async ({ code, language }): Promise<CodeExecutionResult> => {
      const startTime = Date.now()
      let sandbox: Sandbox | null = null

      try {
        sandbox = await Sandbox.create({
          runtime: RUNTIME_MAP[language],
          timeout: 30000,
        })

        const { cmd, extension } = COMMAND_MAP[language]
        const filename = `script.${extension}`

        await sandbox.writeFiles([{ path: filename, content: Buffer.from(code, 'utf-8') }])
        const result = await sandbox.runCommand(cmd, [filename])

        return {
          stdout: (await result.stdout()).trim(),
          stderr: (await result.stderr()).trim(),
          exitCode: result.exitCode,
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          stdout: '',
          stderr: '',
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      } finally {
        if (sandbox) await sandbox.stop().catch(() => {})
      }
    },
  })

// ============ REPO EXPLORATION TOOL ============

export type RepoExplorationResult = {
  response: string
  executionTimeMs: number
  error?: string
}

export const exploreRepo = (apiKey: string) =>
  tool({
    description: `Explore a public GitHub repository using an AI coding agent. Use this to understand codebases, find specific implementations, explain how features work, or answer questions about a repo's structure and code.`,
    inputSchema: z.object({
      repoUrl: z.string().describe('The GitHub repository URL (e.g., "https://github.com/vercel/ai")'),
      prompt: z.string().describe('What you want to know about the repository'),
    }),
    execute: async ({ repoUrl, prompt }): Promise<RepoExplorationResult> => {
      const startTime = Date.now()
      let sandbox: Sandbox | null = null

      try {
        sandbox = await Sandbox.create({
          runtime: 'node24',
          timeout: 300000, // 5 minutes for repo exploration
        })

        // Install OpenCode
        await sandbox.runCommand('bash', ['-c', 'curl -fsSL https://opencode.ai/install | bash'])

        // Create OpenCode config for OpenRouter with Claude Sonnet 4
        const opencodeConfig = {
          provider: {
            openrouter: {
              apiKey: apiKey,
            },
          },
          model: {
            default: {
              provider: 'openrouter',
              model: 'anthropic/claude-sonnet-4.5',
            },
          },
        }

        await sandbox.writeFiles([
          {
            path: '.opencode/config.json',
            content: Buffer.from(JSON.stringify(opencodeConfig, null, 2), 'utf-8'),
          },
        ])

        // Clone the repository
        const cloneResult = await sandbox.runCommand('git', ['clone', '--depth', '1', repoUrl, 'repo'])

        if (cloneResult.exitCode !== 0) {
          const stderr = await cloneResult.stderr()
          return {
            response: '',
            executionTimeMs: Date.now() - startTime,
            error: `Failed to clone repository: ${stderr}`,
          }
        }

        // Run OpenCode in non-interactive mode
        const result = await sandbox.runCommand('bash', [
          '-c',
          `cd repo && ~/.opencode/bin/opencode run "${prompt.replace(/"/g, '\\"')}"`,
        ])

        const stdout = await result.stdout()
        const stderr = await result.stderr()

        if (result.exitCode !== 0 && !stdout) {
          return {
            response: '',
            executionTimeMs: Date.now() - startTime,
            error: stderr || 'OpenCode execution failed',
          }
        }

        return {
          response: stdout,
          executionTimeMs: Date.now() - startTime,
        }
      } catch (error) {
        return {
          response: '',
          executionTimeMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      } finally {
        if (sandbox) await sandbox.stop().catch(() => {})
      }
    },
  })
