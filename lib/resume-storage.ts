
import fs from 'fs/promises'
import path from 'path'

const UPLOAD_ROOT = path.join(
  process.cwd(),
  'uploads',
  'resumes'
)

function validatePathSegment(value: string, label: string) {
  if (
    !value ||
    value === '.' ||
    value === '..' ||
    /[\\/]/.test(value)
  ) {
    throw new Error(`Invalid ${label}`)
  }

  return value
}

export function resumeDirForUser(userId: string) {
  const safeUserId = validatePathSegment(userId, 'user ID')

  return path.join(UPLOAD_ROOT, safeUserId)
}

export async function ensureResumeDir(userId: string) {
  await fs.mkdir(resumeDirForUser(userId), {
    recursive: true,
  })
}

export async function clearUserResumes(userId: string) {
  const dir = resumeDirForUser(userId)

  try {
    const files = await fs.readdir(dir)

    await Promise.all(
      files.map((file) =>
        fs.unlink(path.join(dir, file))
      )
    )
  } catch {
    // Directory may not exist.
  }
}

export function safeResumeFileName(original: string) {
  const ext = path.extname(original)
    .toLowerCase()
    .slice(0, 8)

  const base = path
    .basename(original, path.extname(original))
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 80)

  return `${base || 'resume'}-${Date.now()}${ext}`
}

export function relativeResumePath(
  userId: string,
  fileName: string
) {
  const safeUserId = validatePathSegment(userId, 'user ID')
  const safeFileName = validatePathSegment(fileName, 'file name')

  return path.posix.join(
    'uploads',
    'resumes',
    safeUserId,
    safeFileName
  )
}

export function absoluteResumePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/')
  const prefix = 'uploads/resumes/'

  if (!normalized.startsWith(prefix)) {
    throw new Error('Invalid resume path')
  }

  const segments = normalized
    .slice(prefix.length)
    .split('/')

  if (
    segments.length !== 2 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..'
    )
  ) {
    throw new Error('Invalid resume path')
  }

  const [userId, fileName] = segments

  validatePathSegment(userId, 'user ID')
  validatePathSegment(fileName, 'file name')

  return path.join(UPLOAD_ROOT, userId, fileName)
}
