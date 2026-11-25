import mammoth from 'mammoth'
import { extractText } from 'unpdf'

export async function readResume(file: File) {
  if (!file.size || file.size > 4_000_000) throw new Error('Choose a file between 1 byte and 4 MB.')
  const bytes = Buffer.from(await file.arrayBuffer())
  const filename =
    file.name
      .split(/[\\/]/)
      .pop()
      ?.replace(/[\x00-\x1f]/g, '')
      .slice(-180) || 'resume'
  let text: string
  switch (filename.split('.').pop()?.toLowerCase()) {
    case 'txt':
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      break
    case 'docx':
      text = (await mammoth.extractRawText({ buffer: bytes })).value
      break
    case 'pdf':
      text = (await extractText(new Uint8Array(bytes), { mergePages: true })).text
      break
    default:
      throw new Error('Choose a PDF, DOCX, or TXT file.')
  }
  text = text.trim()
  if (text.includes('\0') || text.length < 40 || text.length > 200_000)
    throw new Error('Choose a text-based CV with 40 to 200,000 characters.')
  return { bytes, filename, text }
}
