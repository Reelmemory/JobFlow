import mammoth from 'mammoth'

const ALLOWED_EXT = new Set(['.pdf', '.doc', '.docx', '.txt'])
const MAX_BYTES = 5 * 1024 * 1024

export function validateResumeFile(file: File) {
  const name = file.name.toLowerCase()
  const ext = name.slice(name.lastIndexOf('.'))
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false as const, error: 'Use PDF, DOCX, DOC, or TXT (max 5 MB).' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: 'File is too large. Maximum size is 5 MB.' }
  }
  return { ok: true as const, ext }
}

export function validateResumeBuffer(buffer: Buffer, fileName: string) {
  const name = fileName.toLowerCase()
  const ext = name.slice(name.lastIndexOf('.'))
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false as const, error: 'Invalid file type.' }
  }
  if (buffer.length > MAX_BYTES) {
    return { ok: false as const, error: 'File is too large.' }
  }
  return { ok: true as const, ext }
}

export async function extractTextFromResume(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const name = fileName.toLowerCase()
  const ext = name.slice(name.lastIndexOf('.'))

  if (ext === '.txt') {
    return buffer.toString('utf-8').trim()
  }

  if (ext === '.pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: buffer })
    try {
      const result = await parser.getText()
      return (result.text || '').trim()
    } finally {
      await parser.destroy()
    }
  }

  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer })
    return (result.value || '').trim()
  }

  throw new Error('Unsupported file type')
}