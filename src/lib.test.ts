import { describe, expect, it } from 'vitest'
import {
  buildEnvLocal,
  detectPackageManager,
  parseArgs,
  substituteTemplateVars,
  validateProjectName,
} from './lib'

describe('validateProjectName', () => {
  it('accepts lowercase npm-safe names', () => {
    expect(validateProjectName('my-cms-app')).toBeNull()
    expect(validateProjectName('app2')).toBeNull()
    expect(validateProjectName('a')).toBeNull()
    expect(validateProjectName('0start')).toBeNull()
    expect(validateProjectName('dot.mid_underscore-dash')).toBeNull()
  })

  it('rejects empty and whitespace-only names', () => {
    expect(validateProjectName('')).not.toBeNull()
    expect(validateProjectName('   ')).not.toBeNull()
  })

  it('rejects uppercase', () => {
    expect(validateProjectName('MyApp')).not.toBeNull()
    expect(validateProjectName('APP')).not.toBeNull()
  })

  it('rejects dot and dot-dot', () => {
    expect(validateProjectName('.')).not.toBeNull()
    expect(validateProjectName('..')).not.toBeNull()
  })

  it('rejects paths', () => {
    expect(validateProjectName('../../etc')).not.toBeNull()
    expect(validateProjectName('/tmp/x')).not.toBeNull()
    expect(validateProjectName('foo/bar')).not.toBeNull()
    expect(validateProjectName('foo\\bar')).not.toBeNull()
  })

  it('rejects names starting with dot, dash, or underscore', () => {
    expect(validateProjectName('.hidden')).not.toBeNull()
    expect(validateProjectName('-flag')).not.toBeNull()
    expect(validateProjectName('_priv')).not.toBeNull()
  })

  it('rejects overlong names', () => {
    expect(validateProjectName('a'.repeat(215))).not.toBeNull()
    expect(validateProjectName('a'.repeat(214))).toBeNull()
  })
})

describe('parseArgs', () => {
  it('parses a bare project name', () => {
    const parsed = parseArgs(['my-app'])
    expect(parsed.projectName).toBe('my-app')
    expect(parsed.errors).toEqual([])
  })

  it('parses flags before the positional', () => {
    const parsed = parseArgs(['--template', 'nextjs', 'my-app'])
    expect(parsed.projectName).toBe('my-app')
    expect(parsed.template).toBe('nextjs')
    expect(parsed.errors).toEqual([])
  })

  it('parses flags after the positional', () => {
    const parsed = parseArgs(['my-app', '--template', 'nextjs', '--local'])
    expect(parsed.projectName).toBe('my-app')
    expect(parsed.template).toBe('nextjs')
    expect(parsed.local).toBe(true)
  })

  it('parses --flag=value form', () => {
    const parsed = parseArgs(['my-app', '--slug=proj', '--key=bcms_test-abc'])
    expect(parsed.slug).toBe('proj')
    expect(parsed.key).toBe('bcms_test-abc')
    expect(parsed.errors).toEqual([])
  })

  it('parses boolean flags and aliases', () => {
    const parsed = parseArgs(['-y', '--skip-setup', '--install'])
    expect(parsed.yes).toBe(true)
    expect(parsed.skipSetup).toBe(true)
    expect(parsed.install).toBe(true)
    expect(parsed.projectName).toBeUndefined()

    expect(parseArgs(['-h']).help).toBe(true)
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-v']).version).toBe(true)
    expect(parseArgs(['--version']).version).toBe(true)
  })

  it('does not swallow a flag as the project name', () => {
    const parsed = parseArgs(['--local'])
    expect(parsed.projectName).toBeUndefined()
    expect(parsed.local).toBe(true)
  })

  it('errors on a value flag with a missing value', () => {
    const parsed = parseArgs(['my-app', '--template'])
    expect(parsed.errors).toHaveLength(1)
    expect(parsed.errors[0]).toContain('--template')
  })

  it('errors when a value flag is followed by another flag', () => {
    const parsed = parseArgs(['--template', '--local', 'my-app'])
    expect(parsed.errors.some((e) => e.includes('--template'))).toBe(true)
    // --local must still be recognized, not eaten as the template value
    expect(parsed.local).toBe(true)
    expect(parsed.projectName).toBe('my-app')
  })

  it('errors on unknown flags', () => {
    const parsed = parseArgs(['my-app', '--frobnicate'])
    expect(parsed.errors).toEqual(['Unknown option: --frobnicate'])
  })

  it('errors on extra positionals', () => {
    const parsed = parseArgs(['one', 'two'])
    expect(parsed.projectName).toBe('one')
    expect(parsed.errors).toEqual(['Unexpected argument: two'])
  })
})

describe('substituteTemplateVars', () => {
  it('replaces upper-cased placeholders', () => {
    expect(
      substituteTemplateVars('{"name": "{{PROJECTNAME}}"}', { projectName: 'my-app' })
    ).toBe('{"name": "my-app"}')
  })

  it('replaces every occurrence', () => {
    expect(
      substituteTemplateVars('{{PROJECTNAME}} + {{PROJECTNAME}}', { projectName: 'x' })
    ).toBe('x + x')
  })

  it('leaves unknown placeholders and other content untouched', () => {
    expect(
      substituteTemplateVars('{{OTHER}} stays; so does {plain}', { projectName: 'x' })
    ).toBe('{{OTHER}} stays; so does {plain}')
  })
})

describe('detectPackageManager', () => {
  it('detects pnpm, yarn, and bun from the user agent', () => {
    expect(detectPackageManager('pnpm/9.1.0 npm/? node/v20.11.0 linux x64')).toBe('pnpm')
    expect(detectPackageManager('yarn/4.1.0 npm/? node/v20.11.0 linux x64')).toBe('yarn')
    expect(detectPackageManager('bun/1.1.0 npm/? node/v20.11.0 linux x64')).toBe('bun')
    expect(detectPackageManager('npm/10.5.0 node/v20.11.0 linux x64')).toBe('npm')
  })

  it('falls back to npm when unset or unrecognized', () => {
    expect(detectPackageManager(undefined)).toBe('npm')
    expect(detectPackageManager('')).toBe('npm')
    expect(detectPackageManager('something-else/1.0')).toBe('npm')
  })
})

describe('buildEnvLocal', () => {
  it('writes both vars with underscore names', () => {
    expect(buildEnvLocal('my-project', 'bcms_test-abc')).toBe(
      'BASED_CMS_SLUG=my-project\nBASED_CMS_KEY=bcms_test-abc\n'
    )
  })

  it('leaves missing values empty', () => {
    expect(buildEnvLocal(undefined, 'k')).toBe('BASED_CMS_SLUG=\nBASED_CMS_KEY=k\n')
    expect(buildEnvLocal('s', undefined)).toBe('BASED_CMS_SLUG=s\nBASED_CMS_KEY=\n')
  })
})
