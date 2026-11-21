const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  bull: '•',
  middot: '·',
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = parseInt(body.slice(2), 16)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    if (body.startsWith('#')) {
      const code = parseInt(body.slice(1), 10)
      return Number.isNaN(code) ? match : String.fromCodePoint(code)
    }
    const key = body.toLowerCase()
    return NAMED_ENTITIES[key] ?? match
  })
}

function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripTagsOnce(html: string): string {
  let s = html
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
  s = s.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, (_, alt: string) =>
    alt ? `${alt} ` : '',
  )
  s = s.replace(/<img[^>]*>/gi, '')
  s = s.replace(/<\/?br\s*\/?>/gi, '\n')
  s = s.replace(/<hr\s*\/?>/gi, '\n')
  s = s.replace(/<li[^>]*>/gi, '\n• ')
  s = s.replace(/<\/li>/gi, '')
  s = s.replace(/<\/?[uo]l[^>]*>/gi, '\n')
  s = s.replace(
    /<\/(p|div|h[1-6]|tr|td|th|blockquote|section|article|header|footer|figure|figcaption)>/gi,
    '\n',
  )
  s = s.replace(
    /<(p|div|h[1-6]|tr|td|th|blockquote|section|article|header|footer|figure|figcaption)[^>]*>/gi,
    '\n',
  )
  s = s.replace(/<[^>]+>/g, '')
  return s
}

/** Convert HTML job descriptions to plain text for display and AI prompts. */
export function stripHtmlToPlainText(html: string): string {
  let s = (html ?? '').trim()
  if (!s) return ''

  // Greenhouse (and others) send markup as &lt;p&gt;... — decode before stripping,
  // then repeat for double-encoded content like &amp;lt;p&amp;gt;
  for (let i = 0; i < 4; i++) {
    const before = s
    s = decodeHtmlEntities(s)
    s = stripTagsOnce(s)
    if (s === before) break
    if (!/<[^>]+>|&(?:[a-z]+|#x?[0-9a-f]+);/i.test(s)) break
  }

  return collapseWhitespace(s)
}
