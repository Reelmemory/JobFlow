BEGIN;
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "huntResumeId" TEXT,
ALTER COLUMN "dailyQuota" SET DEFAULT 3;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Nigeria',
ADD COLUMN     "currentResumeId" TEXT,
ADD COLUMN     "experienceYears" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "remote" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "attemptKey" TEXT,
ADD COLUMN     "attemptedAt" TIMESTAMP(3),
ADD COLUMN     "delivery" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "jobUrl" TEXT,
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "resumeId" TEXT,
ADD COLUMN     "reviewReason" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'draft';

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Resume_userId_createdAt_idx" ON "Resume"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_fingerprint_key" ON "Job"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Application_providerId_key" ON "Application"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_attemptKey_key" ON "Application"("attemptKey");

-- CreateIndex
CREATE INDEX "Application_userId_attemptedAt_idx" ON "Application"("userId", "attemptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_fingerprint_key" ON "Application"("userId", "fingerprint");

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Historical outbound records were written after a successful provider response.
UPDATE "Application" a SET delivery = 'submitted', "submittedAt" = a."appliedAt"
WHERE EXISTS (SELECT 1 FROM "Email" e WHERE e."userId" = a."userId" AND e."applicationId" = a.id AND e.direction = 'outbound');
UPDATE "Application" SET "reviewReason" = 'Historical application. Verify submission and upload a versioned CV before reusing it.' WHERE delivery = 'draft';
UPDATE "User" SET "autoHunt" = false, "dailyQuota" = 3 WHERE "huntResumeId" IS NULL AND "dailyQuota" = 15;
COMMIT;
