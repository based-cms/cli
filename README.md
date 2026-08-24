# @based-cms/get-started

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

Scaffold a new Next.js 16 app prewired for Based CMS.

## Usage

```bash
npx @based-cms/get-started my-app
```

The CLI walks you through picking a template and (optionally) connecting the
new app to your CMS project — enter a slug and key, open the dashboard to
create a project, or skip and configure `.env.local` later.

Project names must be lowercase npm-safe directory names
(`^[a-z0-9][a-z0-9._-]*$`). The CLI never overwrites an existing directory —
if the target exists and is not empty it exits and asks for another name.

## What it scaffolds

- Next.js 16 App Router project template
- `@based-cms/client` integration with starter section definitions
  (`lib/sections.ts`) registered once per server boot via `instrumentation.ts`
- A friendly setup page when `BASED_CMS_SLUG` / `BASED_CMS_KEY` aren't
  configured yet, instead of a crash
- `.env.example` documenting the required variables

## Options

| Flag | Description |
| --- | --- |
| `--template <name>` | Template to use (default: `nextjs`) |
| `--slug <slug>` | Project slug (`BASED_CMS_SLUG`) — skips the setup prompt |
| `--key <key>` | API key (`BASED_CMS_KEY`) — skips the setup prompt |
| `--skip-setup` | Skip the CMS connection step entirely |
| `--install` | Run the package manager install after scaffolding |
| `--local` | Point `@based-cms/client` at a sibling `client/` checkout (for developing the SDK itself) |
| `-y`, `--yes` | Accept defaults and never prompt |
| `-h`, `--help` | Show help |
| `-v`, `--version` | Print the CLI version |

Flags and the project name can appear in any order; `--flag=value` also works.

## Non-interactive usage

Every prompt can be answered by a flag, so the CLI works in scripts and CI:

```bash
npx @based-cms/get-started my-app \
  --slug my-project \
  --key bcms_test-... \
  --install
```

When stdin/stdout is not a TTY, the CLI never prompts: it uses the provided
flags, skips the connection setup if `--slug`/`--key` are missing, and
requires the project name as an argument (or `--yes` to use the default
`my-cms-app`).

The package manager for `--install` (and the printed next steps) is detected
from `npm_config_user_agent` — run through `pnpm dlx` / `yarn dlx` / `bunx`
to use those, with npm as the fallback.

## Environment variables

The scaffolded app reads:

| Variable | Description |
| --- | --- |
| `BASED_CMS_SLUG` | Project slug from the CMS dashboard |
| `BASED_CMS_KEY` | `bcms_test-...` or `bcms_live-...` key from Project Settings |

## Development

```bash
pnpm install
pnpm build        # bundle to dist/
pnpm test         # vitest unit tests
pnpm type-check   # tsc --noEmit
```
