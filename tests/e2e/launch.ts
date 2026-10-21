import { chromium, type Browser, type Page } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export interface LaunchedApp {
  browser: Browser
  page: Page
  close: () => Promise<void>
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Playwright's bundled Electron launcher is not compatible with Electron 44
 * here, so launch the app ourselves and drive it over the DevTools protocol.
 */
export async function launchApp(userData: string): Promise<LaunchedApp> {
  const port = 9400 + Math.floor(Math.random() * 300)
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE

  let child: ChildProcess | null = spawn(
    path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe'),
    ['.', `--remote-debugging-port=${port}`, `--user-data-dir=${userData}`, '--no-sandbox'],
    { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let stderr = ''
  child.stderr?.on('data', (chunk) => {
    stderr += String(chunk)
  })

  let ready = false
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) {
        ready = true
        break
      }
    } catch {
      // keep polling
    }
    if (child.exitCode !== null) break
    await wait(200)
  }
  if (!ready) {
    child.kill()
    throw new Error(`Electron did not expose CDP on ${port}: ${stderr.slice(-1500)}`)
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  const context = browser.contexts()[0]
  const page = context.pages()[0] ?? (await context.waitForEvent('page'))
  await page.waitForSelector('[data-testid=app-ready]', { timeout: 30_000 })
  await page.setViewportSize({ width: 1440, height: 900 })

  const waitForExit = async (): Promise<void> => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (!child || child.exitCode !== null) return
      await wait(100)
    }
  }

  return {
    browser,
    page,
    close: async () => {
      // Close the window through the app so the "flush before quit" path runs.
      try {
        await page.evaluate(() => window.close())
      } catch {
        // renderer may already be gone
      }
      await waitForExit()
      try {
        await browser.close()
      } catch {
        // ignore disconnect errors
      }
      child?.kill()
      child = null
      await wait(300)
    }
  }
}

export function makeUserData(prefix: string): string {
  const cache = path.join(process.cwd(), '.cache')
  fs.mkdirSync(cache, { recursive: true })
  return fs.mkdtempSync(path.join(cache, `${prefix}-`))
}
