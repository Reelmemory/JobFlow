// Run against the PR preview with a development Clerk instance and isolated fixture schema.
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { readFile } = require('node:fs/promises')
const { chromium } = require('playwright-core')

async function verify(input) {
  const entry = new URL(input)
  assert.ok(entry.hostname.startsWith('jobflow-') && entry.hostname.endsWith('.vercel.app'))
  assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'))
  const clerkHost = Buffer.from(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.split('_')[2],
    'base64',
  )
    .toString()
    .replace(/\$$/, '')
  const headers = { Authorization: 'Bearer ' + process.env.CLERK_SECRET_KEY }
  const tokenResult = await fetch('https://api.clerk.com/v1/testing_tokens', {
    method: 'POST',
    headers,
  })
  assert.equal(tokenResult.status, 200)
  const { token } = await tokenResult.json()
  const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome' })
  const base = entry.origin
  async function session() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await context.route('https://' + clerkHost + '/**', (route) => {
      const url = new URL(route.request().url())
      url.searchParams.set('__clerk_testing_token', token)
      return route.continue({ url: url.href })
    })
    const page = await context.newPage()
    await page.goto(entry.href)
    await page.goto(base + '/sign-up')
    return page
  }
  const ready = (page) =>
    page.waitForFunction(() => Boolean(window.Clerk?.loaded && window.Clerk.session))
  const proceed = (page) =>
    page
      .getByRole('button', { name: /^continue$/i })
      .last()
      .click()
  async function signup() {
    const email = 'jobflow-' + Date.now() + '+clerk_test@example.com',
      password = randomUUID() + 'aA7!'
    const page = await session()
    await page.locator('[name=emailAddress]').fill(email)
    await page.locator('[name=password]').fill(password)
    await proceed(page)
    await page
      .locator('input[autocomplete="one-time-code"],input[name=code]')
      .first()
      .pressSequentially('424242')
    await page.waitForURL('**/dashboard', { timeout: 45000 })
    await ready(page)
    await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor()
    return { page, email, password }
  }
  try {
    const a = await signup(),
      b = await signup()
    console.log('Two synthetic mobile sign-ups passed')
    const page = a.page
    await page.reload()
    await ready(page)
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    )
    await page.goto(base + '/dashboard/profile')
    await page.locator('input[type=file]').setInputFiles('tests/fixtures/cv.pdf')
    await page.getByText(/Resume uploaded\./).waitFor({ timeout: 45000 })
    const profile = await (await page.request.get(base + '/api/profile')).json()
    const url = base + profile.profile.resumeUrl
    const own = await page.request.get(url)
    assert.equal(own.status(), 200)
    assert.deepEqual(await own.body(), await readFile('tests/fixtures/cv.pdf'))
    assert.equal((await b.page.request.get(url)).status(), 404)
    for (const ext of ['docx', 'txt']) {
      const bytes = await readFile('tests/fixtures/cv.' + ext)
      const result = await b.page.request.post(base + '/api/profile/resume', {
        multipart: {
          file: { name: 'cv.' + ext, mimeType: 'application/octet-stream', buffer: bytes },
        },
      })
      assert.equal(result.status(), 200)
      assert.deepEqual(await (await b.page.request.get(base + '/api/profile/resume')).body(), bytes)
    }
    console.log(
      'Refresh, profile action PDF upload, API DOCX/TXT uploads, exact bytes and cross-account denial passed',
    )
    await page.locator('.cl-userButtonTrigger:visible').first().click()
    await page.getByText('Sign out', { exact: true }).last().click()
    await page.waitForURL((url) => !url.pathname.startsWith('/dashboard'), { timeout: 20000 })
    await page.goBack().catch(() => {})
    await page.waitForFunction(() => !location.pathname.startsWith('/dashboard'))
    assert.equal((await page.request.get(url)).status(), 401)
    console.log('Sign-out followed by Back and private download denial passed')
    await page.goto(base + '/sign-in')
    await page.locator('[name=identifier],[name=emailAddress]').first().fill(a.email)
    if (!(await page.locator('[name=password]').isVisible())) await proceed(page)
    await page.locator('[name=password]').fill(a.password)
    await proceed(page)
    const code = page.locator('input[autocomplete="one-time-code"],input[name=code]').first()
    await Promise.race([page.waitForURL('**/dashboard'), code.waitFor()])
    if (await code.isVisible()) await code.pressSequentially('424242')
    await page.waitForURL('**/dashboard')
    await ready(page)
    const id = await page.evaluate(() => window.Clerk.session.id)
    const revoked = await fetch('https://api.clerk.com/v1/sessions/' + id + '/revoke', {
      method: 'POST',
      headers,
    })
    assert.ok(revoked.ok)
    console.log('Fresh sign-in passed. Waiting for the revoked session token to expire.')
    await page.waitForTimeout(70000)
    await page.goto(base + '/dashboard')
    await page.waitForURL('**/sign-in**')
    assert.equal((await page.request.get(url)).status(), 401)
    console.log('Expired session redirected to Clerk and lost CV access.')
  } finally {
    await browser.close()
  }
}

const main = async () => {
  let url = process.env.JOBFLOW_PREVIEW_URL
  if (!url) {
    const reader = require('node:readline').createInterface({ input: process.stdin })
    for await (const line of reader) {
      url = line.trim()
      break
    }
    reader.close()
  }
  await verify(url)
}
main().catch((error) => {
  console.error(String(error.message).replace(/_vercel_share=[^\s&]+/g, '_vercel_share=[redacted]'))
  process.exitCode = 1
})
