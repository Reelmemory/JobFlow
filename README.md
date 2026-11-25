# JobFlow

JobFlow discovers roles using your profile, drafts letters with OpenAI or Grok and sends email applications with the CV version you selected. The dashboard, applications and recruiter inbox require Clerk sign-in. [Open JobFlow](https://usejobflow.vercel.app)

## Run locally

Use Node 22.20+ or 24, Next.js 16 App Router, Clerk and PostgreSQL. Copy `.env.example` to `.env` and configure a development database and Clerk instance. Run `npm ci`, `npx prisma generate`, `npm run db:push` on the **new database**, then `npm run dev`. Existing production installations use the upgrade below.

Upload a selectable-text PDF, DOCX or UTF-8 TXT up to 4,000,000 bytes in Profile. Save roles, locations, country of residence and years of relevant experience. Each upload creates a private immutable version in Neon. Old local-filesystem CVs require one re-upload to enable download and sending. Replacing a CV preserves previous drafts and the CV selected for Auto-Hunt.

Discovery filters the MyJobMag Nigeria feed, Remotive and employer ATS listings against your saved preferences. Techmap is optional. Related support roles and uncertain location or experience requirements appear with a review reason and original link.

Choose **Prepare draft** in Job Matches, then open **Applications** to inspect the letter, listing, address and attachment before sending. Under **Profile → Auto-Hunt**, choose a version and daily cap, then enable. The default cap is three. The scheduler starts at 07:00 UTC once daily, within Vercel's scheduling window. Pause at any time. Changes to saved preferences apply to future runs. Manual sends count toward that day's automatic allowance. The dashboard uses UTC for daily counts.

## Deployment

1. Back up the existing Neon database. Test the upgrade on a branch first. For the schema at commit `5b80245`, run `npx prisma db execute --schema prisma/schema.prisma --file prisma/upgrade-auto-hunt.sql` **once**, before deploying the new code. This transactional upgrade preserves existing records, marks historical sends with an outbound receipt, and flags uncertain history. A fresh empty database uses `npm run db:push`.
2. Keep the Vercel production domain `usejobflow.vercel.app`. Configure Clerk's sign-in and sign-up paths as shown in the environment example. Fallback redirects go to `/dashboard`. Remove obsolete FORCE redirect variables if you want authenticated deep links to return to their original destination.
3. Set `OPENAI_API_KEY` for OpenAI cover letters. `OPENAI_MODEL` defaults to `gpt-4.1-mini`. With no OpenAI key, JobFlow uses `GROK_API_KEY` or `XAI_API_KEY` and `GROK_MODEL`. Uploads and preference saving work independently. An unavailable model leaves a review item with a preparation retry.
4. Set a random `CRON_SECRET` of at least 32 bytes in Vercel. Vercel calls `GET /api/cron/hunt` with the Bearer secret. Cron runs on production deployments. Exercise a preview with the same authenticated GET against its isolated database. [Vercel Cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
5. Configure the sandbox below, then redeploy to load the environment. Keep mail off until the sandbox test succeeds.

## Mailgun sandbox

Set `MAIL_MODE=sandbox`, `MAILGUN_DOMAIN=sandbox<id>.mailgun.org` (use the exact domain in Mailgun), `MAILGUN_API_KEY` and the account **HTTP webhook signing key** in `MAILGUN_WEBHOOK_SIGNING_KEY`. Set `MAILGUN_REGION` to `US` or `EU`. Under the sandbox domain's Setup tab, add your test mailbox and accept its verification email. Set `MAILGUN_TEST_RECIPIENT` to that exact address. The application sends only if the published apply-to address matches. Set JOBFLOW_SANDBOX_CLERK_ID to a synthetic Clerk user ID to discover the built-in Junior IT Support Trainee vacancy on that account. Upload a synthetic CV, select it, save the default preferences, set a cap of one and enable Auto-Hunt. Invoke the cron endpoint twice. Expect one email with that exact CV. Reply from the verified mailbox and open the linked application from Inbox. [Sandbox setup](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-sandbox)

In Receiving → Routes, create a route with expression `match_recipient(".*@YOUR_ESCAPED_DOMAIN$")` (escape each dot in the exact sending domain), actions `forward("https://usejobflow.vercel.app/api/webhooks/mailgun")`, then `stop()`. For a preview sandbox use the preview URL and ensure Mailgun can reach that endpoint. Under Webhooks, set **Delivered, Temporary failure and Permanent failure** to the same HTTPS endpoint. The API acceptance response sets submitted. Signed events advance delivery. A reply to the generated per-application address lands in its owner's Inbox. [Webhook formats](https://documentation.mailgun.com/docs/mailgun/user-manual/webhooks/securing-webhooks)

## Guidepost Labs sending domain

Add a dedicated subdomain such as `jobs.<your-guidepost-domain>` in the selected Mailgun region. Make these DNS changes on the subdomain only. Mailgun supplies the domain-specific DKIM selector and value.

| DNS owner | Type | Value |
| --- | --- | --- |
| Sending subdomain | TXT | `v=spf1 include:mailgun.org ~all` (merge the include if SPF already exists) |
| DKIM selector shown by Mailgun | TXT or CNAME | Exact key or managed signing CNAME records displayed for this domain |
| Sending subdomain | MX, priority 10 | US: `mxa.mailgun.org` and `mxb.mailgun.org`. EU: `mxa.eu.mailgun.org` and `mxb.eu.mailgun.org` |
| Tracking hostname from Mailgun, if enabled | CNAME | Mailgun's displayed regional tracking target |

Verify the domain and both MX records in Mailgun. Change the route expression and webhooks for this domain. Set production `MAILGUN_DOMAIN`, regional API credentials and signing key. After a successful sandbox acceptance and reply, set production `MAIL_MODE=live`, redeploy, choose the CV and cap, and enable Auto-Hunt in **your own account**. Live sending requires a Vercel production deployment. [Domain verification](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-verify)

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`. The focused integration test creates a disposable PostgreSQL cluster and intercepts external job, Grok and Mailgun HTTP requests. It exercises the cron and webhook handlers, real binary fixtures and overlapping runs. See [PROJECT.md](PROJECT.md) for deployment observations and outstanding provider checks.

For browser verification, run `node --env-file=.env scripts/verify-preview.cjs` with JOBFLOW_PREVIEW_URL set to the isolated preview's accessible URL. Use a development Clerk instance, Chrome and synthetic accounts. After redeploying against the same preview schema, run `node --env-file=.env scripts/verify-preview-data.cjs` with JOBFLOW_QA_SCHEMA and JOBFLOW_QA_CRON_SECRET set for that branch. The second check reopens the previous uploads, compares two accounts' private records and calls cron twice while all preview accounts are paused.
