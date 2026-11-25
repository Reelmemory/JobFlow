function normalize(value: string) {
  return value.normalize('NFKC').toLowerCase().trim().replace(/[—–]/g, '-').replace(/\s+/g, ' ')
}

export function jobFingerprint(title: string, company: string) {
  return normalize(title) + '|' + normalize(company)
}
