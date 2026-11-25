// Only explicit application instructions qualify. Generic contact and privacy mailboxes never do.
export function extractApplyEmail(text: string) {
  const pattern = /\b(?:apply(?:\s+(?:by email|via email))?\s+(?:at|to)|(?:send|email|submit|forward)\s+(?:your\s+|a\s+)?(?:cv|résumé|resume|application)(?:\s+(?:and|with)\s+(?:a\s+)?cover letter)?\s+to|application(?:s)?\s+(?:email|to))\s*[:：]?\s*(?:mailto:)?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi
  const addresses = new Set(Array.from(text.matchAll(pattern), m => m[1].toLowerCase()))
  return addresses.size === 1 ? [...addresses][0] : null
}
