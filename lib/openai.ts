import OpenAI from 'openai'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  return new OpenAI({ apiKey })
}

export async function generateCoverLetter(params: {
  resumeText: string
  jobTitle: string
  company: string
  jobDescription: string
}) {
  const { resumeText, jobTitle, company, jobDescription } = params
  if (!resumeText.trim()) throw new Error('A resume is required to generate a cover letter')

  const completion = await getOpenAIClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: "You are an expert career coach. Write a concise, professional, tailored cover letter (max 250 words). Use only experience and skills explicitly supported by the candidate's resume. Do not invent qualifications. If the resume does not support a job requirement, do not claim it.",
      },
      {
        role: 'user',
        content: `Resume:\n${resumeText}\n\nJob: ${jobTitle} at ${company}\n\nJob Description:\n${jobDescription}\n\nWrite a tailored cover letter.`,
      },
    ],
    temperature: 0.4,
  })

  return completion.choices[0]?.message?.content || ''
}
