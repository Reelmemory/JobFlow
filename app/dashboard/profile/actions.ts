'use server'

import { auth } from '@clerk/nextjs/server'
import { processResumeUpload, saveProfilePreferences } from '@/lib/profile-ops'
import { prismaErrorMessage } from '@/lib/prisma-errors'

export async function uploadResumeAction(formData: FormData) {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'Unauthorized' }
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return { error: 'No file uploaded' }
  }

  try {
    return await processResumeUpload(userId, file)
  } catch (error) {
    console.error(error)
    const { message } = prismaErrorMessage(error)
    return { error: message || 'Failed to process resume' }
  }
}

export async function saveProfileAction(input: {
  targetRoles: string[]
  locations: string[]
  remoteOnly: boolean
}) {
  const { userId } = await auth()
  if (!userId) {
    return { error: 'Unauthorized' }
  }

  try {
    await saveProfilePreferences(userId, input)
    return { success: true }
  } catch (error) {
    console.error(error)
    const { message } = prismaErrorMessage(error)
    return { error: message || 'Failed to save profile' }
  }
}
