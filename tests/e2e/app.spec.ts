import { test, expect } from '@playwright/test'
import { launchApp, makeUserData, type LaunchedApp } from './launch'

let app: LaunchedApp

test.afterEach(async () => {
  await app?.close()
})

test('applies the class template and persists across restart', async () => {
  const userData = makeUserData('persist')
  app = await launchApp(userData)

  await app.page.getByTestId('open-apply-template').click()
  await expect(app.page.getByTestId('apply-template-confirm')).toBeVisible()
  await app.page.getByTestId('apply-template-confirm').click()

  await expect(app.page.locator('[data-testid^="blockcard-"]')).toHaveCount(9)
  await expect(app.page.getByTestId('day-title')).toContainText('周三')
  await expect(app.page.getByTestId('save-status')).toContainText('已保存')
  await app.page.screenshot({ path: 'test-results/day-template.png' })

  await app.close()
  app = await launchApp(userData)

  await expect(app.page.locator('[data-testid^="blockcard-"]')).toHaveCount(9)
  const firstBlock = app.page.locator('[data-testid^="blockcard-"]').first()
  await expect(firstBlock).toContainText('起床')
})

test('creates a block with concrete items through the inspector', async () => {
  app = await launchApp(makeUserData('create'))

  await app.page.keyboard.press('n')
  await expect(app.page.getByTestId('block-title')).toBeVisible()
  await app.page.getByTestId('block-title').fill('上午学习')
  await app.page.getByTestId('new-item').fill('听讲座')
  await app.page.getByTestId('new-item').press('Enter')
  await app.page.getByTestId('new-item').fill('上课')
  await app.page.getByTestId('new-item').press('Enter')

  await expect(app.page.locator('[data-testid^="blockcard-"]')).toHaveCount(1)
  await expect(app.page.locator('[data-testid^="blockcard-"]').first()).toContainText('听讲座')
  await app.page.screenshot({ path: 'test-results/day-custom.png' })
})

test('creates a block by dragging on the timeline', async () => {
  app = await launchApp(makeUserData('drag'))
  const page = app.page

  await page.evaluate(() => {
    const scroll = document.querySelector('[data-testid="timeline-scroll"]') as HTMLElement | null
    if (scroll) scroll.scrollTop = 0
  })
  await page.waitForTimeout(200)

  const surface = page.getByTestId('timeline-surface')
  const box = await surface.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  const pxPerMin = 72 / 60
  const startY = box.y + 480 * pxPerMin
  const endY = box.y + 600 * pxPerMin
  await page.mouse.move(box.x + 220, startY)
  await page.mouse.down()
  await page.mouse.move(box.x + 220, endY, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByTestId('block-start')).toHaveValue('08:00')
  await expect(page.getByTestId('block-end')).toHaveValue('10:00')
  await expect(page.locator('[data-testid^="blockcard-"]')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/day-dragged.png' })
})

test('edits a template and applies it to another day', async () => {
  app = await launchApp(makeUserData('template'))
  const page = app.page

  await page.getByRole('button', { name: '编辑模板' }).first().click()
  await expect(page.getByLabel('模板名称')).toBeVisible()
  await page.getByLabel('模板名称').fill('我的上课日')
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: '应用模板' }).click()
  await expect(page.getByTestId('apply-template-confirm')).toBeVisible()
  await page.getByTestId('apply-template-confirm').click()
  await expect(page.locator('[data-testid^="blockcard-"]')).toHaveCount(9)
})

