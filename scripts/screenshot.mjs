/**
 * Visual smoke: launch the built app, drive it through CDP, capture screenshots.
 * Usage: node scripts/screenshot.mjs [outDir]
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const outDir = process.argv[2] ?? path.join(process.cwd(), '.cache', 'shots')
fs.mkdirSync(outDir, { recursive: true })

const electronPath = process.env.DAYORDER_EXE ?? path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe')
const cacheRoot = path.join(process.cwd(), '.cache')
fs.mkdirSync(cacheRoot, { recursive: true })
const userData = fs.mkdtempSync(path.join(cacheRoot, 'shot-'))
const port = 9345

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const args = process.env.DAYORDER_EXE
  ? [`--remote-debugging-port=${port}`, `--user-data-dir=${userData}`, '--no-sandbox']
  : ['.', `--remote-debugging-port=${port}`, `--user-data-dir=${userData}`, '--no-sandbox']

const child = spawn(electronPath, args, {
  cwd: process.cwd(),
  env,
  stdio: ['ignore', 'pipe', 'pipe']
})

let stderr = ''
child.stderr.on('data', (chunk) => {
  stderr += String(chunk)
})

async function waitForTarget() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {
      // keep polling
    }
    if (child.exitCode !== null) break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`CDP endpoint did not come up (exit=${child.exitCode})\n${stderr.slice(-2000)}`)
}

const shot = async (page, name) => {
  await page.screenshot({ path: path.join(outDir, name) })
}

try {
  await waitForTarget()
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
  const context = browser.contexts()[0]
  const page = context.pages()[0] ?? (await context.waitForEvent('page'))
  page.on('console', (message) => {
    if (message.type() === 'error') console.log('[console.error]', message.text())
  })
  page.on('pageerror', (error) => console.log('[pageerror]', error.message))

  await page.waitForSelector('[data-testid=app-ready]', { timeout: 30_000 })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(400)
  await shot(page, '01-empty.png')

  await page.getByTestId('open-apply-template').click()
  await page.waitForTimeout(300)
  await shot(page, '02-apply-dialog.png')

  await page.getByTestId('apply-template-confirm').click()
  await page.waitForTimeout(400)
  const closeToast = page.getByRole('button', { name: '关闭提示' })
  if (await closeToast.count()) await closeToast.first().click()
  const dismissBanner = page.getByRole('button', { name: '知道了' })
  if (await dismissBanner.count()) await dismissBanner.first().click()
  await page.waitForTimeout(300)
  await shot(page, '03-day.png')

  const blockCount = await page.locator('[data-testid^="blockcard-"]').count()
  console.log('blocks after template:', blockCount)

  const first = page.locator('[data-testid^="blockcard-"]').first()
  if (blockCount > 0) {
    await first.click({ position: { x: 160, y: 12 } })
    await page.waitForTimeout(300)
    await shot(page, '04-inspector.png')
  }

  await page.getByRole('button', { name: /墨夜/ }).click()
  await page.waitForTimeout(400)
  await shot(page, '05-dark.png')

  await page.getByTestId('nav-templates').click()
  await page.waitForTimeout(400)
  await shot(page, '06-templates.png')

  await page.getByTestId('nav-settings').click()
  await page.waitForTimeout(300)
  await shot(page, '07-settings.png')

  await page.getByTestId('nav-day').click()
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+f')
  await page.waitForTimeout(250)
  await page.keyboard.type('讲座')
  await page.waitForTimeout(300)
  await shot(page, '08-search.png')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: '管理模块' }).click()
  await page.waitForTimeout(300)
  await shot(page, '09-modules.png')
  await page.keyboard.press('Escape')

  console.log('screenshots written to', outDir)
  await browser.close()
} finally {
  child.kill()
}

