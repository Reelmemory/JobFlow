// Run after redeploying the isolated preview used by verify-preview.cjs.
const assert = require('node:assert/strict')
const { readFile } = require('node:fs/promises')
const { randomUUID } = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const { createClerkClient } = require('@clerk/backend')
const { chromium } = require('playwright-core')

async function main() {
  const entry = new URL(process.env.JOBFLOW_PREVIEW_URL)
  assert.ok(/^jobflow-.*\.vercel\.app$/.test(entry.hostname))
  assert.ok(process.env.CLERK_SECRET_KEY?.startsWith('sk_test_'))
  const schema = process.env.JOBFLOW_QA_SCHEMA
  assert.match(schema || '', /^jobflow_hunt_preview_[a-z0-9_]+$/)
  const url = new URL(process.env.DATABASE_URL)
  url.searchParams.set('schema', schema)
  url.searchParams.delete('channel_binding')
  const db = new PrismaClient({ datasources: { db: { url: url.href } } })
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome' })
  const page = await browser.newPage()
  const sessions = []
  try {
    await page.goto(entry.href)
    const actors = []
    for (const filename of ['cv.pdf', 'cv.docx']) {
      const cv = await db.resume.findFirstOrThrow({
        where: { filename, user: { email: { endsWith: '+clerk_test@example.com' } } },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      })
      assert.match(cv.user.email, /^jobflow-\d+\+clerk_test@example\.com$/)
      const account = await clerk.users.getUser(cv.user.clerkId)
      assert.ok(account.emailAddresses.some((a) => a.emailAddress === cv.user.email))
      const session = await clerk.sessions.createSession({ userId: account.id })
      sessions.push(session.id)
      const headers = { Authorization: 'Bearer ' + (await clerk.sessions.getToken(session.id)).jwt }
      const marker = randomUUID()
      const app = await db.application.create({
        data: {
          userId: cv.userId,
          title: 'QA role ' + marker,
          company: 'Synthetic privacy check',
          coverLetter: 'Fixture letter ' + marker,
          resumeId: cv.id,
        },
      })
      await db.email.create({
        data: {
          userId: cv.userId,
          applicationId: app.id,
          from: 'fixture@example.test',
          subject: 'Reply ' + marker,
          body: 'Fixture reply ' + marker,
        },
      })
      actors.push({ cv, headers, marker })
    }
    assert.notEqual(actors[0].cv.userId, actors[1].cv.userId)
    for (const [i, actor] of actors.entries()) {
      const other = actors[1 - i]
      const get = (p) => page.request.get(entry.origin + p, { headers: actor.headers })
      const download = await get('/api/profile/resume?version=' + actor.cv.id)
      assert.equal(download.status(), 200)
      assert.deepEqual(await download.body(), await readFile('tests/fixtures/' + actor.cv.filename))
      assert.equal((await get('/api/profile/resume?version=' + other.cv.id)).status(), 404)
      const apps = await (await get('/dashboard/applications')).text()
      assert.ok(apps.includes('Fixture letter ' + actor.marker))
      assert.ok(!apps.includes(other.marker))
      const inbox = await (await get('/api/emails')).text()
      assert.ok(inbox.includes('Fixture reply ' + actor.marker))
      assert.ok(!inbox.includes(other.marker))
    }
    console.log(
      'After redeploy both previous uploads retained exact bytes. Two owners saw only their own CV, application, letter and linked reply.',
    )
    assert.equal((await page.request.get(entry.origin + '/api/cron/hunt')).status(), 401)
    assert.ok(process.env.JOBFLOW_QA_CRON_SECRET)
    for (let i = 0; i < 2; i++) {
      const result = await page.request.get(entry.origin + '/api/cron/hunt', {
        headers: { Authorization: 'Bearer ' + process.env.JOBFLOW_QA_CRON_SECRET },
      })
      assert.equal(result.status(), 200)
      assert.deepEqual(await result.json(), { accounts: 0, processed: 0, errors: 0 })
    }
    console.log(
      'Deployed cron rejected anonymous access and completed two authenticated runs with all accounts paused.',
    )
  } finally {
    await Promise.allSettled(sessions.map((id) => clerk.sessions.revokeSession(id)))
    await browser.close()
    await db.$disconnect()
  }
}
main().catch((error) => {
  console.error(String(error.message).replace(/_vercel_share=[^\s&]+/g, '_vercel_share=[redacted]'))
  process.exitCode = 1
})
