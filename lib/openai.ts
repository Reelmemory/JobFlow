import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateCoverLetter(params: {
  resumeText: string
  jobTitle: string
  company: string
  jobDescription: string
}) {
  const { resumeText, jobTitle, company, jobDescription } = params

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert career coach. Write a concise, professional, tailored cover letter (max 250 words). Use the candidate\'s real experience only. No invented skills.',
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
