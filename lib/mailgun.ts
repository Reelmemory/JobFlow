import formData from 'form-data'
import Mailgun from 'mailgun.js'
import fs from 'fs/promises'
import { absoluteResumePath } from '@/lib/resume-storage'

export function mailgunConfigured() {
  return Boolean(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN)
}

export function mailgunDomain() {
  return process.env.MAILGUN_DOMAIN || 'sandbox.mailgun.org'
}

export function getMailgunClient() {
  const apiKey = process.env.MAILGUN_API_KEY
  if (!apiKey) return null
  const mg = new Mailgun(formData)
  return mg.client({ username: 'api', key: apiKey })
}

export type SendApplicationEmailParams = {
  fromAddress: string
  fromName?: string | null
  to: string
  bcc?: string | null
  subject: string
  text: string
  applicationId: string
  resumeUrl?: string | null
  resumeFileName?: string | null
}

export async function sendApplicationEmail(params: SendApplicationEmailParams) {
  const client = getMailgunClient()
  const domain = process.env.MAILGUN_DOMAIN
  if (!client || !domain) {
    throw new Error('Mailgun is not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.')
  }

  const from = params.fromName
    ? `${params.fromName} <${params.fromAddress}>`
    : params.fromAddress

  const message: Record<string, unknown> = {
    from,
    to: [params.to],
    subject: params.subject,
    text: params.text,
    'h:Reply-To': params.fromAddress,
    'h:X-JobFlow-Application-Id': params.applicationId,
  }

  if (params.bcc && params.bcc !== params.to) {
    message.bcc = [params.bcc]
  }

  if (params.resumeUrl) {
    try {
      const abs = absoluteResumePath(params.resumeUrl)
      const data = await fs.readFile(abs)
      message.attachment = [
        {
          filename: params.resumeFileName || 'resume.pdf',
          data,
        },
      ]
    } catch (e) {
      console.error('Resume attach skipped', e)
    }
  }

  await client.messages.create(domain, message as never)
}

export function detectOtp(subject: string, body: string) {
  const blob = `${subject}\n${body}`.toLowerCase()
  if (/\b(otp|one[- ]time|verification code|security code|2fa)\b/.test(blob)) return true
  if (/\b\d{4,8}\b/.test(blob) && /\b(code|verify|verification)\b/.test(blob)) return true
  return false
}