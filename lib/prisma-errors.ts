export function prismaErrorMessage(error: unknown): { message: string; code?: string } {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code)
    switch (code) {
      case 'P1001':
        return {
          code,
          message:
            'Cannot reach the database. Wake your Neon project in the console, check DATABASE_URL, and remove channel_binding=require from the connection string if you are on Windows.',
        }
      case 'P1000':
        return { code, message: 'Database authentication failed. Check DATABASE_URL credentials.' }
      case 'P2021':
        return { code, message: 'Database tables missing. Run: npx prisma db push' }
      default:
        break
    }
  }
  if (error instanceof Error) {
    return { message: error.message }
  }
  return { message: 'Database error' }
}