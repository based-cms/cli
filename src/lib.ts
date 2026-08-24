// Pure logic for create-based-app — no fs/process side effects, unit-testable.

// ─── Project name validation ─────────────────────────────────────────────────

/**
 * npm-safe project names: lowercase letters/digits, then lowercase letters,
 * digits, `.`, `_`, `-`. Rejects `.`/`..`, paths, uppercase, and leading
 * dots/dashes. Applied to BOTH the interactive prompt and argv-supplied names.
 */
export const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/

/**
 * Returns `null` when the name is valid, otherwise a human-readable reason.
 */
export function validateProjectName(name: string): string | null {
  if (!name.trim()) {
    return 'Project name cannot be empty.'
  }
  if (name.includes('/') || name.includes('\\')) {
    return 'Project name must be a plain directory name, not a path.'
  }
  if (name === '.' || name === '..') {
    return 'Project name must be a plain directory name, not "." or "..".'
  }
  if (!PROJECT_NAME_RE.test(name)) {
    return 'Use lowercase letters, digits, ".", "_" and "-", starting with a letter or digit (npm package name rules).'
  }
  if (name.length > 214) {
    return 'Project name must be 214 characters or fewer.'
  }
  return null
}

// ─── Argument parsing ────────────────────────────────────────────────────────

export interface ParsedArgs {
  projectName: string | undefined
  template: string | undefined
  slug: string | undefined
  key: string | undefined
  local: boolean
  help: boolean
  version: boolean
  skipSetup: boolean
  yes: boolean
  install: boolean
  /** Human-readable parse errors (unknown flags, missing values, extra args) */
  errors: string[]
}

const VALUE_FLAGS: Record<string, 'template' | 'slug' | 'key'> = {
  '--template': 'template',
  '--slug': 'slug',
  '--key': 'key',
}

const BOOL_FLAGS: Record<string, 'local' | 'help' | 'version' | 'skipSetup' | 'yes' | 'install'> = {
  '--local': 'local',
  '--help': 'help',
  '-h': 'help',
  '--version': 'version',
  '-v': 'version',
  '--skip-setup': 'skipSetup',
  '--yes': 'yes',
  '-y': 'yes',
  '--install': 'install',
}

/**
 * Parse argv (already sliced past node + script). Flags and the positional
 * project name may appear in any order; `--flag value` and `--flag=value`
 * both work. Never throws — problems are collected in `errors`.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    projectName: undefined,
    template: undefined,
    slug: undefined,
    key: undefined,
    local: false,
    help: false,
    version: false,
    skipSetup: false,
    yes: false,
    install: false,
    errors: [],
  }

  const positionals: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === undefined) continue

    // --flag=value form
    const eqIdx = arg.startsWith('--') ? arg.indexOf('=') : -1
    if (eqIdx !== -1) {
      const flag = arg.slice(0, eqIdx)
      const value = arg.slice(eqIdx + 1)
      const target = VALUE_FLAGS[flag]
      if (target) {
        parsed[target] = value
      } else {
        parsed.errors.push(`Unknown option: ${flag}`)
      }
      continue
    }

    const valueTarget = VALUE_FLAGS[arg]
    if (valueTarget) {
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('-')) {
        parsed.errors.push(`Missing value for ${arg}`)
      } else {
        parsed[valueTarget] = next
        i++
      }
      continue
    }

    const boolTarget = BOOL_FLAGS[arg]
    if (boolTarget) {
      parsed[boolTarget] = true
      continue
    }

    if (arg.startsWith('-')) {
      parsed.errors.push(`Unknown option: ${arg}`)
      continue
    }

    positionals.push(arg)
  }

  if (positionals.length > 0) {
    parsed.projectName = positionals[0]
  }
  for (const extra of positionals.slice(1)) {
    parsed.errors.push(`Unexpected argument: ${extra}`)
  }

  return parsed
}

// ─── Template variable substitution ──────────────────────────────────────────

/**
 * Replace `{{KEY}}` placeholders (keys upper-cased) in template file content.
 * Unknown placeholders are left untouched.
 */
export function substituteTemplateVars(
  content: string,
  vars: Record<string, string>
): string {
  let out = content
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key.toUpperCase()}}}`, value)
  }
  return out
}

// ─── Package manager detection ───────────────────────────────────────────────

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

/**
 * Detect the package manager that launched us from `npm_config_user_agent`
 * (e.g. "pnpm/9.1.0 npm/? node/v20.11.0 linux x64"). Falls back to npm.
 */
export function detectPackageManager(userAgent: string | undefined): PackageManager {
  if (!userAgent) return 'npm'
  if (userAgent.startsWith('pnpm')) return 'pnpm'
  if (userAgent.startsWith('yarn')) return 'yarn'
  if (userAgent.startsWith('bun')) return 'bun'
  return 'npm'
}

// ─── .env.local content ──────────────────────────────────────────────────────

/**
 * Build the .env.local contents for whatever credentials were provided.
 */
export function buildEnvLocal(slug: string | undefined, key: string | undefined): string {
  return [`BASED_CMS_SLUG=${slug ?? ''}`, `BASED_CMS_KEY=${key ?? ''}`].join('\n') + '\n'
}
