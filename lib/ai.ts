import OpenAI from 'openai'

const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY

/** xAI Grok — OpenAI-compatible chat API */
export const ai = new OpenAI({
  apiKey,
  baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
})

export function isAiConfigured() {
  return Boolean(apiKey)
}

export function grokModel() {
  return process.env.GROK_MODEL || 'grok-3-mini'
}

export async function generateCoverLetter(params: {
  resumeText: string
  jobTitle: string
  company: string
  jobDescription: string
}) {
  if (!isAiConfigured()) {
    throw new Error('GROK_API_KEY is not set')
  }

  const { resumeText, jobTitle, company, jobDescription } = params

  const completion = await ai.chat.completions.create({
    model: grokModel(),
    messages: [
      {
        role: 'system',
        content:
          "You are an expert career coach. Write a concise, professional, tailored cover letter (max 250 words). Use the candidate's real experience only. No invented skills.",
      },
      {
        role: 'user',
        content: `Resume:\n${resumeText}\n\nJob: ${jobTitle} at ${company}\n\nJob Description:\n${jobDescription}\n\nWrite a tailored cover letter.`,
      },
    ],
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || ''
}