import fs from 'node:fs'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'
import prompts from 'prompts'
import pc from 'picocolors'
import {
  buildEnvLocal,
  detectPackageManager,
  parseArgs,
  substituteTemplateVars,
  validateProjectName,
  type PackageManager,
} from './lib'

const TEMPLATES = ['nextjs'] as const

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
    ) as { version?: string }
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

function printHelp() {
  console.log(`
  ${pc.bold('create-based-app')} — scaffold a Based CMS client project

  ${pc.bold('Usage:')}
    npx @based-cms/get-started [project-name] [options]

  ${pc.bold('Options:')}
    --template <name>   Template to use (default: nextjs)
    --slug <slug>       Project slug (BASED_CMS_SLUG) — skips the setup prompt
    --key <key>         API key (BASED_CMS_KEY) — skips the setup prompt
    --skip-setup        Skip the CMS connection step entirely
    --install           Run the package manager install after scaffolding
    --local             Point @based-cms/client at a sibling client/ checkout
    -y, --yes           Accept defaults and never prompt (non-interactive)
    -h, --help          Show this help
    -v, --version       Print the CLI version

  ${pc.bold('Non-interactive example:')}
    npx @based-cms/get-started my-app --slug my-project --key bcms_test-... --install
`)
}

/**
 * Open a URL in the default browser WITHOUT shell string interpolation —
 * the URL is user-typed, so it is always passed as an argument, never
 * concatenated into a command line.
 */
function openBrowser(url: string) {
  const ignore = () => {
    /* best-effort: a browser failing to open is not fatal */
  }
  if (process.platform === 'darwin') {
    execFile('open', [url], ignore)
  } else if (process.platform === 'win32') {
    // `start` is a cmd built-in, so cmd.exe re-parses the whole command line —
    // an unquoted URL would be split at metacharacters like `&` (common in
    // query strings) and the remainder executed as a command. Pass the URL as
    // a single pre-quoted token (embedded quotes stripped so it can't break
    // out) with verbatim arguments so Node doesn't re-mangle the quoting.
    // The extra `""` fills start's window-title slot.
    const child = spawn(
      'cmd',
      ['/c', 'start', '""', `"${url.replace(/"/g, '')}"`],
      { windowsVerbatimArguments: true, stdio: 'ignore' }
    )
    child.on('error', ignore)
  } else {
    execFile('xdg-open', [url], ignore)
  }
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function runInstall(pm: PackageManager, cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(pm, ['install'], {
      cwd,
      stdio: 'inherit',
      // npm/pnpm/yarn are .cmd shims on Windows
      shell: process.platform === 'win32',
    })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

function fail(message: string): never {
  console.log(pc.red(message))
  process.exit(1)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }
  if (args.version) {
    console.log(getVersion())
    return
  }
  if (args.errors.length > 0) {
    for (const err of args.errors) console.log(pc.red(err))
    console.log(pc.dim('Run with --help for usage.'))
    process.exit(1)
  }

  const interactive = process.stdout.isTTY === true && process.stdin.isTTY === true && !args.yes

  console.log()
  console.log(`  ${pc.bold(pc.cyan('create-based-app'))} — scaffold a Based CMS client project`)
  console.log()

  // ─── Project name ────────────────────────────────────────────────────────────

  let projectName = args.projectName
  if (projectName !== undefined) {
    // argv-supplied names get the SAME validation as the prompt — no path or
    // uppercase name ever reaches the filesystem
    const problem = validateProjectName(projectName)
    if (problem) fail(`Invalid project name "${projectName}": ${problem}`)
  } else if (args.yes) {
    projectName = 'my-cms-app'
  } else if (!interactive) {
    fail('Project name required in non-interactive mode. Usage: create-based-app <project-name> [options]')
  } else {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-cms-app',
      validate: (value: string) => validateProjectName(value) ?? true,
    })
    if (!response.projectName) {
      fail('Cancelled.')
    }
    projectName = response.projectName as string
  }

  // ─── Template ────────────────────────────────────────────────────────────────

  let templateName = args.template
  if (templateName !== undefined) {
    if (!(TEMPLATES as readonly string[]).includes(templateName)) {
      fail(`Unknown template "${templateName}". Available: ${TEMPLATES.join(', ')}`)
    }
  } else if (TEMPLATES.length === 1 || !interactive) {
    templateName = TEMPLATES[0]
  } else {
    const response = await prompts({
      type: 'select',
      name: 'template',
      message: 'Template:',
      choices: TEMPLATES.map((t) => ({ title: t, value: t })),
    })
    if (!response.template) {
      fail('Cancelled.')
    }
    templateName = response.template as string
  }

  // ─── Connection setup ────────────────────────────────────────────────────────

  let slug = args.slug
  let key = args.key

  const setupResolved = args.skipSetup || (slug !== undefined && key !== undefined)
  // Exactly one of --slug/--key was given — the user intends to connect,
  // so only the missing half needs resolving.
  const partialCreds =
    !args.skipSetup && (slug !== undefined) !== (key !== undefined)

  if (!setupResolved && !interactive) {
    if (partialCreds) {
      const provided = slug !== undefined ? '--slug' : '--key'
      const missing = slug !== undefined ? '--key' : '--slug'
      console.log(`  ${pc.dim(`Non-interactive: using the provided ${provided}; ${missing} not set — pass it or edit .env.local later.`)}`)
    } else {
      // Non-interactive without credentials: behave like --skip-setup
      console.log(`  ${pc.dim('Non-interactive: skipping CMS connection setup (use --slug/--key or edit .env.local later).')}`)
    }
  } else if (!setupResolved) {
    const { setupChoice } = partialCreds
      ? // A credential flag was already given — skip the menu, just complete it
        { setupChoice: 'enter' as const }
      : await prompts({
      type: 'select',
      name: 'setupChoice',
      message: 'Connect to Based CMS:',
      choices: [
        {
          title: 'Enter credentials',
          value: 'enter',
          description: 'I have a slug and key from the CMS dashboard',
        },
        {
          title: 'Open CMS dashboard',
          value: 'open',
          description: 'Create a project and get credentials',
        },
        {
          title: 'Skip for now',
          value: 'skip',
          description: "I'll configure .env.local later",
        },
      ],
    })

    if (setupChoice === undefined) {
      fail('Cancelled.')
    }

    if (setupChoice === 'enter') {
      // `type: null` skips a prompt — an argv-supplied credential is kept,
      // never re-asked or overwritten.
      const answers = await prompts([
        {
          type: slug === undefined ? 'text' : null,
          name: 'slug',
          message: 'Project slug (BASED_CMS_SLUG):',
          validate: (v: string) => (v.trim().length > 0 ? true : 'Slug cannot be empty'),
        },
        {
          type: key === undefined ? 'text' : null,
          name: 'key',
          message: 'Key (BASED_CMS_KEY):',
          validate: (v: string) => (v.trim().length > 0 ? true : 'Key cannot be empty'),
        },
      ])
      if ((slug === undefined && !answers.slug) || (key === undefined && !answers.key)) {
        fail('Cancelled.')
      }
      if (answers.slug) slug = (answers.slug as string).trim()
      if (answers.key) key = (answers.key as string).trim()
    } else if (setupChoice === 'open') {
      const { cmsUrl } = await prompts({
        type: 'text',
        name: 'cmsUrl',
        message: 'CMS dashboard URL:',
        initial: 'https://based-cms.dev',
        validate: (v: string) => (isValidUrl(v) ? true : 'Enter a valid URL'),
      })

      if (cmsUrl) {
        console.log()
        console.log(`  ${pc.dim('Opening CMS dashboard...')}`)
        openBrowser(cmsUrl as string)
        console.log(`  ${pc.dim('Create a project → Project Settings → copy slug and key')}`)
        console.log()

        const answers = await prompts([
          {
            type: 'text',
            name: 'slug',
            message: 'Project slug (or Enter to skip):',
          },
          {
            type: 'text',
            name: 'key',
            message: 'Key (or Enter to skip):',
          },
        ])
        if (answers.slug && (answers.slug as string).trim()) {
          slug = (answers.slug as string).trim()
        }
        if (answers.key && (answers.key as string).trim()) {
          key = (answers.key as string).trim()
        }
      }
    }
  }

  // ─── Scaffold ────────────────────────────────────────────────────────────────

  const templateDir = path.join(__dirname, '..', 'templates', templateName)
  if (!fs.existsSync(templateDir)) {
    fail(`Template "${templateName}" not found.`)
  }

  const targetDir = path.resolve(process.cwd(), projectName)
  // NEVER delete an existing directory — a scaffolder must not rm anything it
  // didn't just create. An existing empty directory is fine to fill.
  if (fs.existsSync(targetDir)) {
    if (!fs.statSync(targetDir).isDirectory()) {
      fail(`"${projectName}" already exists and is not a directory. Choose another name.`)
    }
    if (fs.readdirSync(targetDir).length > 0) {
      fail(
        `Directory "${projectName}" already exists and is not empty.\n` +
          'Choose another name, or remove the directory yourself and re-run.'
      )
    }
  }

  console.log()
  console.log(`  ${pc.green('Scaffolding')} ${pc.bold(projectName)}...`)
  fs.cpSync(templateDir, targetDir, { recursive: true })

  processTemplateFiles(targetDir, { projectName })
  renameTmplFiles(targetDir)

  // Rename _gitignore → .gitignore
  const gitignoreSrc = path.join(targetDir, '_gitignore')
  if (fs.existsSync(gitignoreSrc)) {
    fs.renameSync(gitignoreSrc, path.join(targetDir, '.gitignore'))
  }

  // --local: rewrite the @based-cms/client dependency to a file: path pointing
  // at the sibling client/ checkout (repo layout: based-cms/{cli,client,app})
  if (args.local) {
    const clientDir = path.join(__dirname, '..', '..', 'client')
    if (fs.existsSync(clientDir)) {
      const pkgJsonPath = path.join(targetDir, 'package.json')
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as {
        dependencies: Record<string, string>
      }
      pkgJson.dependencies['@based-cms/client'] = `file:${clientDir}`
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n')
      console.log(`  ${pc.green('Local mode:')} @based-cms/client → ${pc.dim(clientDir)}`)
    } else {
      console.log(
        `  ${pc.yellow('Warning:')} --local given but ${pc.dim(clientDir)} does not exist — using the registry version of @based-cms/client instead.`
      )
    }
  }

  // Write .env.local if any credentials were provided
  if (slug || key) {
    fs.writeFileSync(path.join(targetDir, '.env.local'), buildEnvLocal(slug, key))
    console.log(`  ${pc.green('Wrote')} .env.local`)
  }

  // ─── Install ─────────────────────────────────────────────────────────────────

  const pm = detectPackageManager(process.env.npm_config_user_agent)
  let installed = false

  let wantInstall = args.install
  if (!wantInstall && interactive) {
    const { install } = await prompts({
      type: 'confirm',
      name: 'install',
      message: `Install dependencies with ${pm}?`,
      initial: true,
    })
    wantInstall = install === true
  }

  if (wantInstall) {
    console.log()
    console.log(`  ${pc.green('Installing')} dependencies with ${pm}...`)
    installed = await runInstall(pm, targetDir)
    if (!installed) {
      console.log(`  ${pc.yellow('Install failed')} — run ${pc.cyan(`${pm} install`)} manually.`)
    }
  }

  // ─── Next steps ──────────────────────────────────────────────────────────────

  console.log()
  console.log(`  ${pc.green('Done!')} Next steps:`)
  console.log()
  console.log(`  ${pc.cyan('cd')} ${projectName}`)
  if (!installed) {
    console.log(`  ${pc.cyan(`${pm} install`)}`)
  }
  if (!slug || !key) {
    console.log(`  ${pc.dim('# Add to .env.local:')}`)
    if (!slug) console.log(`  ${pc.cyan('BASED_CMS_SLUG=')}${pc.dim('my-project')}`)
    if (!key) console.log(`  ${pc.cyan('BASED_CMS_KEY=')}${pc.dim('bcms_test-...')}`)
  }
  console.log(`  ${pc.cyan(`${pm} run dev`)}`)
  console.log()
}

function processTemplateFiles(dir: string, vars: { projectName: string }) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      processTemplateFiles(fullPath, vars)
    } else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      const substituted = substituteTemplateVars(content, vars)
      if (substituted !== content) {
        fs.writeFileSync(fullPath, substituted)
      }
    }
  }
}

function renameTmplFiles(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      renameTmplFiles(fullPath)
    } else if (entry.name.endsWith('.tmpl')) {
      fs.renameSync(fullPath, fullPath.slice(0, -5))
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
