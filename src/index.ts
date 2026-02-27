import fs from 'node:fs'
import path from 'node:path'
import { exec } from 'node:child_process'
import prompts from 'prompts'
import pc from 'picocolors'

const TEMPLATES = ['nextjs'] as const

function openBrowser(url: string) {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open'
  exec(`${cmd} ${url}`)
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log()
  console.log(`  ${pc.bold(pc.cyan('create-based-cms'))} — scaffold a Based CMS client project`)
  console.log()

  // Parse CLI args
  const args = process.argv.slice(2)
  let projectName = args[0]
  let templateName: string | undefined

  // Check for flags
  const templateIdx = args.indexOf('--template')
  if (templateIdx !== -1) {
    templateName = args[templateIdx + 1]
  }
  const localMode = args.includes('--local')

  // Filter out flags from project name
  if (projectName?.startsWith('--')) {
    projectName = undefined
  }

  // Prompt for project name if not provided
  if (!projectName) {
    const response = await prompts({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-cms-app',
      validate: (value: string) =>
        /^[a-zA-Z0-9_-]+$/.test(value) || 'Only alphanumeric characters, dashes, and underscores',
    })
    if (!response.projectName) {
      console.log(pc.red('Cancelled.'))
      process.exit(1)
    }
    projectName = response.projectName as string
  }

  // Prompt for template if not provided and multiple exist
  if (!templateName) {
    if (TEMPLATES.length === 1) {
      templateName = TEMPLATES[0]
    } else {
      const response = await prompts({
        type: 'select',
        name: 'template',
        message: 'Template:',
        choices: TEMPLATES.map((t) => ({ title: t, value: t })),
      })
      if (!response.template) {
        console.log(pc.red('Cancelled.'))
        process.exit(1)
      }
      templateName = response.template as string
    }
  }

  // ─── Connection setup ────────────────────────────────────────────────────────

  let slug: string | undefined
  let key: string | undefined

  const { setupChoice } = await prompts({
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
    console.log(pc.red('Cancelled.'))
    process.exit(1)
  }

  if (setupChoice === 'enter') {
    const answers = await prompts([
      {
        type: 'text',
        name: 'slug',
        message: 'Project slug (BASED-CMS-SLUG):',
        validate: (v: string) => (v.trim().length > 0 ? true : 'Slug cannot be empty'),
      },
      {
        type: 'text',
        name: 'key',
        message: 'Key (BASED-CMS-KEY):',
        validate: (v: string) => (v.trim().length > 0 ? true : 'Key cannot be empty'),
      },
    ])
    if (!answers.slug || !answers.key) {
      console.log(pc.red('Cancelled.'))
      process.exit(1)
    }
    slug = (answers.slug as string).trim()
    key = (answers.key as string).trim()
  } else if (setupChoice === 'open') {
    const { cmsUrl } = await prompts({
      type: 'text',
      name: 'cmsUrl',
      message: 'CMS dashboard URL:',
      initial: 'https://cms.your-domain.com',
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

  // ─── Scaffold ────────────────────────────────────────────────────────────────

  const templateDir = path.join(__dirname, '..', 'templates', templateName)
  if (!fs.existsSync(templateDir)) {
    console.log(pc.red(`Template "${templateName}" not found.`))
    process.exit(1)
  }

  const targetDir = path.resolve(process.cwd(), projectName)
  if (fs.existsSync(targetDir)) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Directory "${projectName}" already exists. Overwrite?`,
      initial: false,
    })
    if (!overwrite) {
      console.log(pc.red('Cancelled.'))
      process.exit(1)
    }
    fs.rmSync(targetDir, { recursive: true, force: true })
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

  // --local: rewrite cms-client dependency to file: path
  if (localMode) {
    const cmsClientDir = path.join(__dirname, '..', '..', 'cms-client')
    const pkgJsonPath = path.join(targetDir, 'package.json')
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as {
      dependencies: Record<string, string>
    }
    pkgJson.dependencies['cms-client'] = `file:${cmsClientDir}`
    fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n')
    console.log(`  ${pc.green('Local mode:')} cms-client → ${pc.dim(cmsClientDir)}`)
  }

  // Write .env.local if any credentials were provided
  if (slug || key) {
    const lines: string[] = []
    lines.push(`BASED-CMS-SLUG=${slug ?? ''}`)
    lines.push(`BASED-CMS-KEY=${key ?? ''}`)
    fs.writeFileSync(path.join(targetDir, '.env.local'), lines.join('\n') + '\n')
    console.log(`  ${pc.green('Wrote')} .env.local`)
  }

  // ─── Next steps ──────────────────────────────────────────────────────────────

  console.log()
  console.log(`  ${pc.green('Done!')} Next steps:`)
  console.log()
  console.log(`  ${pc.cyan('cd')} ${projectName}`)
  console.log(`  ${pc.cyan('pnpm install')}        ${pc.dim('# or npm install / yarn')}`)
  if (!slug || !key) {
    console.log(`  ${pc.dim('# Add to .env.local:')}`)
    if (!slug) console.log(`  ${pc.cyan('BASED-CMS-SLUG=')}${pc.dim('my-project')}`)
    if (!key) console.log(`  ${pc.cyan('BASED-CMS-KEY=')}${pc.dim('bcms_test-...')}`)
  }
  console.log(`  ${pc.cyan('pnpm dev')}`)
  console.log()
}

function processTemplateFiles(dir: string, vars: { projectName: string }) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      processTemplateFiles(fullPath, vars)
    } else if (entry.isFile()) {
      let content = fs.readFileSync(fullPath, 'utf-8')
      let changed = false
      for (const [key, value] of Object.entries(vars)) {
        const placeholder = `{{${key.toUpperCase()}}}`
        if (content.includes(placeholder)) {
          content = content.replaceAll(placeholder, value)
          changed = true
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content)
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
