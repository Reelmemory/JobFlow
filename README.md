# JobFlow

AI-powered job application platform (inspired by SwiftHunts).

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in your keys.
2. Create a free Neon database and paste the connection string.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Push schema:
   ```bash
   npx prisma db push
   ```
5. Run:
   ```bash
   npm run dev
   ```

## Current Status

See `PROJECT.md` for the full plan, schema, and roadmap.

## Stack

- Next.js 15 + Tailwind
- Neon + Prisma
- Clerk (auth)
- xAI Grok (OpenAI-compatible API)
- Mailgun (inbox)
