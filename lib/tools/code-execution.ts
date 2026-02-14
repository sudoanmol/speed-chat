import { Sandbox } from '@vercel/sandbox'
import { tool } from 'ai'
import { z } from 'zod'

const SUPPORTED_LANGUAGES = ['python'] as const
const BASE_EXECUTION_TIMEOUT_MS = 30_000
const DEPENDENCY_EXECUTION_TIMEOUT_MS = 120_000
const MAX_DEPENDENCIES = 20

const RUNTIME_MAP = {
  python: 'python3.13',
} as const

const COMMAND_MAP = {
  python: { cmd: 'python3', extension: 'py' },
} as const

type DependencyInstaller = 'none' | 'pip'

export type CodeExecutionSetup = {
  dependencies: string[]
  installer: DependencyInstaller
  stdout: string
  stderr: string
}

export type CodeExecutionResult = {
  stdout: string
  stderr: string
  exitCode: number
  executionTimeMs: number
  setup?: CodeExecutionSetup
  error?: string
}

const normalizeDependencies = (dependencies: string[] | undefined): string[] => {
  if (!dependencies) return []

  const normalizedDependencies: string[] = []

  for (const dependency of dependencies) {
    const normalizedDependency = dependency.trim()

    if (normalizedDependency.length === 0) continue
    if (normalizedDependencies.includes(normalizedDependency)) continue

    normalizedDependencies.push(normalizedDependency)
  }

  return normalizedDependencies
}

const formatPhaseLog = (phase: string, output: string): string => {
  if (output.length === 0) return ''
  return `=== ${phase} ===\n${output}`
}

const installDependencies = async (
  sandbox: Sandbox,
  dependencies: string[]
): Promise<{
  installer: Extract<DependencyInstaller, 'pip'>
  stdout: string
  stderr: string
  exitCode: number
}> => {
  const requirementsFile = 'requirements.txt'
  await sandbox.writeFiles([{ path: requirementsFile, content: Buffer.from(dependencies.join('\n'), 'utf-8') }])

  const pipInstallResult = await sandbox.runCommand('python3', [
    '-m',
    'pip',
    'install',
    '--disable-pip-version-check',
    '--no-input',
    '--requirement',
    requirementsFile,
  ])
  const pipStdout = (await pipInstallResult.stdout()).trim()
  const pipStderr = (await pipInstallResult.stderr()).trim()

  return {
    installer: 'pip',
    stdout: formatPhaseLog('setup (pip)', pipStdout),
    stderr: formatPhaseLog('setup (pip)', pipStderr),
    exitCode: pipInstallResult.exitCode,
  }
}

export const codeExecution = () =>
  tool({
    description: `Execute Python code in an isolated sandbox. Optionally install dependencies first via the dependencies array. Max 30 second execution, or 120 seconds when dependencies are installed.`,
    inputSchema: z.object({
      code: z.string().describe('The code to execute'),
      language: z.enum(SUPPORTED_LANGUAGES).describe('Programming language: "python"'),
      dependencies: z
        .array(z.string().trim().min(1).max(120))
        .max(MAX_DEPENDENCIES)
        .optional()
        .describe('Optional Python packages to install before execution, for example ["numpy", "pandas"]'),
    }),
    execute: async ({ code, language, dependencies }): Promise<CodeExecutionResult> => {
      const startTime = Date.now()
      let sandbox: Sandbox | null = null
      const normalizedDependencies = normalizeDependencies(dependencies)
      let setup: CodeExecutionSetup = {
        dependencies: normalizedDependencies,
        installer: 'none',
        stdout: '',
        stderr: '',
      }

      try {
        sandbox = await Sandbox.create({
          runtime: RUNTIME_MAP[language],
          timeout: normalizedDependencies.length > 0 ? DEPENDENCY_EXECUTION_TIMEOUT_MS : BASE_EXECUTION_TIMEOUT_MS,
        })

        if (normalizedDependencies.length > 0) {
          const installResult = await installDependencies(sandbox, normalizedDependencies)

          setup = {
            dependencies: normalizedDependencies,
            installer: installResult.installer,
            stdout: installResult.stdout,
            stderr: installResult.stderr,
          }

          if (installResult.exitCode !== 0) {
            return {
              stdout: '',
              stderr: '',
              exitCode: installResult.exitCode,
              executionTimeMs: Date.now() - startTime,
              setup,
              error: 'Dependency installation failed before code execution.',
            }
          }
        }

        const { cmd, extension } = COMMAND_MAP[language]
        const filename = `script.${extension}`

        await sandbox.writeFiles([{ path: filename, content: Buffer.from(code, 'utf-8') }])
        const result = await sandbox.runCommand(cmd, [filename])

        return {
          stdout: (await result.stdout()).trim(),
          stderr: (await result.stderr()).trim(),
          exitCode: result.exitCode,
          executionTimeMs: Date.now() - startTime,
          setup,
        }
      } catch (error) {
        return {
          stdout: '',
          stderr: '',
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          setup,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      } finally {
        if (sandbox) await sandbox.stop().catch(() => {})
      }
    },
  })
