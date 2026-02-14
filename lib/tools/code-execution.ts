import { Sandbox } from '@vercel/sandbox'
import { tool } from 'ai'
import { z } from 'zod'

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
