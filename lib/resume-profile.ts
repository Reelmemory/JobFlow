const SKILL_SEEDS = [
  'help desk', 'troubleshooting', 'networking', 'windows', 'ticketing', 'react', 'next', 'node', 'typescript', 'javascript', 'python', 'java',
  'aws', 'docker', 'kubernetes', 'postgres', 'mongodb', 'prisma', 'tailwind',
  'vue', 'angular', 'graphql', 'go', 'rust', 'swift', 'kotlin', 'flutter',
  'figma', 'linux', 'agile', 'scrum', 'ci/cd', 'terraform', 'azure', 'gcp',
]

export function skillsFromResumeText(text: string | null | undefined): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  return SKILL_SEEDS.filter((s) => (' ' + lower.replace(/[^a-z0-9/]+/g, ' ') + ' ').includes(' ' + s + ' '))
}
