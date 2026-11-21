import fs from 'fs/promises'
import path from 'path'

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'resumes')

export function resumeDirForUser(userId: string) {
  return path.join(UPLOAD_ROOT, userId)
}

export async function ensureResumeDir(userId: string) {
  await fs.mkdir(resumeDirForUser(userId), { recursive: true })
}

export async function clearUserResumes(userId: string) {
  const dir = resumeDirForUser(userId)
  try {
    const files = await fs.readdir(dir)
    await Promise.all(files.map((f) => fs.unlink(path.join(dir, f))))
  } catch {
    // directory may not exist
  }
}

export function safeResumeFileName(original: string) {
  const ext = path.extname(original).toLowerCase().slice(0, 8)
  const base = path
    .basename(original, path.extname(original))
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 80)
  return `${base || 'resume'}-${Date.now()}${ext}`
}

export function relativeResumePath(userId: string, fileName: string) {
  return path.posix.join('uploads', 'resumes', userId, fileName)
}

export function absoluteResumePath(relativePath: string) {
  return path.join(process.cwd(), relativePath.replace(/\//g, path.sep))
}