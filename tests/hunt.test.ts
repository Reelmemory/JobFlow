import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createHmac, randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import EmbeddedPostgres from 'embedded-postgres'
import nock from 'nock'

test('scheduled application lifecycle in an isolated PostgreSQL cluster', async (t) => {
  const socket = createServer().listen(0, '127.0.0.1')
  await new Promise<void>((resolve) => socket.once('listening', resolve))
  const port = (socket.address() as { port: number }).port
  await new Promise<void>((resolve) => socket.close(() => resolve()))
  const databaseDir = await mkdtemp(join(tmpdir(), 'jobflow-test-'))
  const password = randomUUID()
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password,
    port,
    persistent: false,
    autoRehydrateSymlinks: true,
    onLog: process.env.DEBUG_PG ? console.log : () => {},
    initdbFlags: ['--encoding=UTF8'],
  })
  await pg.initialise()
  const pgCtl = join(
    process.cwd(),
    'node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe',
  )
  if (process.platform === 'win32') {
    execFileSync(
      pgCtl,
      [
        'start',
        '-D',
        databaseDir,
        '-o',
        '-p ' + port + ' -h 127.0.0.1',
        '-l',
        join(databaseDir, 'server.log'),
        '-w',
      ],
      { windowsHide: true, stdio: 'ignore' },
    )
  } else await pg.start()
  console.log('PostgreSQL ready')
  let disconnect = async () => {}
  t.after(async () => {
    await disconnect()
    nock.cleanAll()
    nock.enableNetConnect()
    if (process.platform === 'win32') {
      execFileSync(pgCtl, ['stop', '-D', databaseDir, '-m', 'fast', '-w'], {
        windowsHide: true,
        stdio: 'ignore',
      })
      await rm(databaseDir, { recursive: true })
    } else await pg.stop()
  })
  const domain = 'sandbox123.mailgun.org',
    recipient = 'fixture@training.test'
  Object.assign(process.env, {
    DATABASE_URL:
      'postgresql://postgres:' + password + '@127.0.0.1:' + port + '/postgres?sslmode=disable',
    MAIL_MODE: 'sandbox',
    MAILGUN_DOMAIN: domain,
    MAILGUN_API_KEY: 'fixture',
    MAILGUN_WEBHOOK_SIGNING_KEY: 'fixture-signing',
    MAILGUN_TEST_RECIPIENT: recipient,
    GROK_API_KEY: 'fixture',
    GROK_BASE_URL: 'https://fixture-ai.test/v1',
    CRON_SECRET: 'fixture-cron',
  })
  execFileSync(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate'],
    { stdio: 'pipe' },
  )
  console.log('Schema ready')
  const { prisma } = await import('../lib/prisma')
  disconnect = () => prisma.$disconnect()
  const { storeResume, downloadResume } = await import('../lib/resume-storage')
  const { GET: cron } = await import('../app/api/cron/hunt/route')
  const { POST: webhook } = await import('../app/api/webhooks/mailgun/route')
  const { dispatch } = await import('../lib/dispatch')
  const [a, b] = await Promise.all(
    ['alpha', 'beta'].map((id) =>
      prisma.user.create({ data: { clerkId: id, email: id + '@example.test' } }),
    ),
  )
  const evidence = 'I documented Windows printer tickets in a school lab.'
  for (const ext of ['txt', 'pdf', 'docx']) {
    const bytes = await readFile(join('tests', 'fixtures', 'cv.' + ext))
    console.log('Checking', ext)
    const cv = await storeResume(a.id, new File([new Uint8Array(bytes)], 'cv.' + ext))
    assert.ok('success' in cv, ext + ' extraction')
    assert.ok(cv.preview.includes(evidence))
    assert.deepEqual((await downloadResume(a.clerkId, null))?.bytes, bytes)
  }
  console.log('PDF, DOCX and TXT round-tripped')
  const version = (await prisma.profile.findUniqueOrThrow({ where: { userId: a.id } }))
    .currentResumeId!
  assert.equal(await downloadResume(b.clerkId, version), null)
  const bad = await storeResume(a.id, new File(['invalid'], 'bad.pdf'))
  assert.ok('error' in bad)
  assert.equal((await downloadResume(a.clerkId, null))?.filename, 'cv.docx')
  const replacement = await storeResume(a.id, new File([evidence + ' Updated.'], 'new.txt'))
  assert.ok('success' in replacement)
  const settings = { autoHunt: true, dailyQuota: 1, huntResumeId: version }
  await prisma.user.update({ where: { id: a.id }, data: settings })

  const listing = {
    id: 1,
    title: 'Junior IT Support',
    company_name: 'Fixture One',
    candidate_required_location: 'Worldwide',
    description:
      'Junior IT support training, no experience required. Send your CV to ' + recipient + '.',
    url: 'https://training.test/open',
  }
  const listings = [
    listing,
    { ...listing, id: 2, company_name: 'Fixture Two' },
    { ...listing, id: 3, company_name: 'Portal', description: 'Training. Use our portal.' },
    { ...listing, id: 4, company_name: 'Unclear', candidate_required_location: 'Remote' },
    { ...listing, id: 5, company_name: 'Expired', expiration_date: '2020-01-01' },
    {
      ...listing,
      id: 6,
      company_name: 'Same contact',
      description: 'Email privacy@training.test about data protection.',
    },
  ]
  nock.disableNetConnect()
  nock('https://remotive.com')
    .persist()
    .get('/api/remote-jobs')
    .query(true)
    .reply(200, { jobs: listings })
  nock('https://boards-api.greenhouse.io').persist().get(/.*/).reply(200, { jobs: [] })
  nock('https://api.lever.co').persist().get(/.*/).reply(200, [])
  nock('https://fixture-ai.test')
    .persist()
    .post('/v1/chat/completions')
    .reply(200, (_uri: string, input: unknown) => {
      assert.ok(JSON.stringify(input).includes(evidence))
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                letter: evidence + ' I would welcome the opportunity to contribute.',
                missing: [],
                evidence: [evidence],
              }),
            },
          },
        ],
      }
    })
  let sends = 0
  let sentBody = Buffer.alloc(0)
  const attachment = await readFile('tests/fixtures/cv.docx')
  nock('https://api.mailgun.net')
    .persist()
    .post('/v3/' + domain + '/messages')
    .reply(function (_uri: string, body: unknown) {
      const payload = Buffer.isBuffer(body)
        ? body
        : Buffer.from(String(body), /^[0-9a-f]+$/i.test(String(body)) ? 'hex' : 'utf8')
      sentBody = Buffer.from(payload)
      sends++
      return [200, { id: '<accepted-' + sends + '@' + domain + '>', message: 'Queued' }]
    })
  const tick = () =>
    cron(
      new Request('http://localhost/api/cron/hunt', {
        headers: { authorization: 'Bearer fixture-cron' },
      }),
    )
  assert.equal((await cron(new Request('http://localhost/api/cron/hunt'))).status, 401)
  console.log('Starting overlapping cron requests')
  const runs = await Promise.all([tick(), tick()])
  console.log('Overlapping runs completed')
  for (const run of runs) assert.equal(run.status, 200, JSON.stringify(await run.json()))
  assert.equal(
    sends,
    1,
    JSON.stringify(
      await prisma.application.findMany({
        select: { company: true, delivery: true, reviewReason: true, applyEmail: true },
      }),
    ),
  )
  assert.ok(sentBody.includes(attachment), 'exact pinned CV bytes')
  for (const value of [recipient, 'filename="cv.docx"', evidence, 'reply-'])
    assert.ok(sentBody.includes(value), value)
  assert.equal((await tick()).status, 200)
  assert.equal(sends, 1)
  const apps = await prisma.application.findMany({ where: { userId: a.id } })
  assert.equal(apps.length, 5)
  assert.ok(apps.every((app) => app.coverLetter.includes(evidence)))
  const submitted = apps.find((app) => app.delivery === 'submitted')!
  assert.ok(submitted.submittedAt)
  assert.equal(submitted.resumeId, version)
  assert.ok(apps.find((app) => app.company === 'Portal')?.reviewReason)
  assert.ok(apps.find((app) => app.company === 'Unclear')?.reviewReason)
  assert.equal(await dispatch(b.id, submitted.id, false), 'Application unavailable.')
  assert.equal(await prisma.application.count({ where: { userId: b.id } }), 0)
  const sig = () => {
    const timestamp = String(Math.floor(Date.now() / 1000)),
      token = randomUUID()
    return {
      timestamp,
      token,
      signature: createHmac('sha256', 'fixture-signing')
        .update(timestamp + token)
        .digest('hex'),
    }
  }
  const reply = (signature = sig()) =>
    webhook(
      new Request('http://localhost/webhook', {
        method: 'POST',
        body: new URLSearchParams({
          ...signature,
          sender: recipient,
          recipient: 'reply-' + submitted.id + '@' + domain,
          subject: 'Interview',
          'body-plain': 'Can we meet?',
          'Message-Id': '<fixture-reply@test>',
        }),
      }),
    )
  assert.equal((await reply({ ...sig(), signature: 'invalid' })).status, 403)
  assert.equal((await reply()).status, 200)
  await reply()
  assert.equal(
    await prisma.email.count({ where: { userId: a.id, applicationId: submitted.id } }),
    1,
  )
  assert.equal(await prisma.email.count({ where: { userId: b.id } }), 0)
  await webhook(
    new Request('http://localhost/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        signature: sig(),
        'event-data': { event: 'delivered', 'user-variables': { attempt: submitted.attemptKey } },
      }),
    }),
  )
  assert.equal(
    (await prisma.application.findUniqueOrThrow({ where: { id: submitted.id } })).delivery,
    'delivered',
  )
  await prisma.user.update({ where: { id: a.id }, data: { autoHunt: false, dailyQuota: 3 } })
  assert.equal((await tick()).status, 200)
  assert.equal(sends, 1)
  const second =
    apps.find((app) => app.company === 'Fixture Two' && !app.submittedAt) ||
    apps.find((app) => app.company === 'Fixture One' && !app.submittedAt)!
  assert.equal(await dispatch(a.id, second.id, true), 'Paused or needs review.')
  await prisma.application.update({
    where: { id: second.id },
    data: { delivery: 'queued', attemptedAt: new Date(), attemptKey: 'uncertain' },
  })
  nock('https://api.mailgun.net')
    .get('/v3/' + domain + '/events')
    .query({ 'message-id': 'uncertain@' + domain })
    .reply(200, { items: [{ event: 'accepted' }], paging: {} })
  assert.equal((await tick()).status, 200)
  assert.equal(
    (await prisma.application.findUniqueOrThrow({ where: { id: second.id } })).delivery,
    'submitted',
  )
  assert.equal(sends, 1)
})
