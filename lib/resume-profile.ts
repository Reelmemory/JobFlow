import { ai, grokModel, isAiConfigured } from '@/lib/ai'

const SKILL_SEEDS = [
  'react', 'next', 'node', 'typescript', 'javascript', 'python', 'java',
  'aws', 'docker', 'kubernetes', 'postgres', 'mongodb', 'prisma', 'tailwind',
  'vue', 'angular', 'graphql', 'go', 'rust', 'swift', 'kotlin', 'flutter',
  'figma', 'linux', 'agile', 'scrum', 'ci/cd', 'terraform', 'azure', 'gcp',
]

export function skillsFromResumeText(text: string | null | undefined): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  return SKILL_SEEDS.filter((s) => lower.includes(s))
}

export type ExtractedProfile = {
  targetRoles: string[]
  skills: string[]
  locations: string[]
}

export async function extractProfileFromResumeText(
  resumeText: string,
): Promise<ExtractedProfile | null> {
  if (!isAiConfigured() || resumeText.length < 80) {
    return null
  }

  const snippet = resumeText.slice(0, 14_000)

  try {
    const completion = await ai.chat.completions.create({
      model: grokModel(),
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Extract structured job-search fields from a resume. Return JSON only with keys: targetRoles (array of 1-5 job titles the candidate is suited for), skills (array of up to 20 technical skills mentioned), locations (array of cities/countries or "Remote" if they want remote work). Use only information from the resume.',
        },
        {
          role: 'user',
          content: snippet,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw) as ExtractedProfile
    return {
      targetRoles: (parsed.targetRoles || []).filter(Boolean).slice(0, 8),
      skills: (parsed.skills || []).filter(Boolean).slice(0, 24),
      locations: (parsed.locations || []).filter(Boolean).slice(0, 8),
    }
  } catch (e) {
    console.error('Resume AI extract error', e)
    return null
  }
}

/** Merge extracted data into existing profile fields when user has not customized them. */
export function mergeExtractedIntoProfile(
  existing: {
    targetRoles: string[]
    locations: string[]
    skills: string[]
  },
  extracted: ExtractedProfile | null,
  keywordSkills: string[],
) {
  const roles =
    existing.targetRoles.length > 0
      ? existing.targetRoles
      : extracted?.targetRoles?.length
        ? extracted.targetRoles
        : existing.targetRoles

  const locations =
    existing.locations.length > 0
      ? existing.locations
      : extracted?.locations?.length
        ? extracted.locations
        : existing.locations

  const skillSet = new Set<string>([...keywordSkills, ...(extracted?.skills || [])])
  const skills =
    skillSet.size > 0
      ? [...skillSet].slice(0, 30)
      : existing.skills.length
        ? existing.skills
        : keywordSkills

  return { targetRoles: roles, locations, skills }
}