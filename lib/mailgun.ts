import formData from 'form-data'
import Mailgun from 'mailgun.js'

export function mailgunDomain() {
  return process.env.MAILGUN_DOMAIN || 'sandbox.mailgun.org'
}
export function canSend(to: string) {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) return false
  if (process.env.MAIL_MODE === 'live') return process.env.VERCEL_ENV !== 'preview'
  return (
    process.env.MAIL_MODE === 'sandbox' &&
    /^sandbox[a-z0-9]+\.mailgun\.org$/i.test(mailgunDomain()) &&
    to.toLowerCase() === process.env.MAILGUN_TEST_RECIPIENT?.trim().toLowerCase()
  )
}
export function getMailgunClient() {
  const key = process.env.MAILGUN_API_KEY
  return key
    ? new Mailgun(formData).client({
        username: 'api',
        key,
        url:
          process.env.MAILGUN_REGION === 'EU'
            ? 'https://api.eu.mailgun.net'
            : 'https://api.mailgun.net',
        timeout: 15000,
      })
    : null
}

export async function sendApplicationEmail(
  app: { id: string; title: string; applyEmail: string; coverLetter: string; attemptKey: string },
  cv: { filename: string; bytes: Buffer },
) {
  if (!canSend(app.applyEmail)) throw new Error('Mail sending is unavailable for this recipient.')
  const domain = mailgunDomain()
  const client = getMailgunClient()!
  return client.messages.create(domain, {
    from: 'JobFlow <applications@' + domain + '>',
    to: [app.applyEmail],
    subject: 'Application for ' + app.title,
    text: app.coverLetter,
    attachment: [{ filename: cv.filename, data: cv.bytes }],
    'h:Reply-To': 'reply-' + app.id + '@' + domain,
    'h:Message-Id': '<' + app.attemptKey + '@' + domain + '>',
    'v:attempt': app.attemptKey,
  })
}
export function detectOtp(subject: string, body: string) {
  return /\b(otp|one[- ]time|verification code|security code|2fa)\b/i.test(subject + ' ' + body)
}
