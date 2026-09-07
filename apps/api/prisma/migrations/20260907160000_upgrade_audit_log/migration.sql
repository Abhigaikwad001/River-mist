-- AlterTable: Upgrade AuditLog for Phase 9 Audit History & RBAC System
ALTER TABLE "AuditLog" 
  ALTER COLUMN "entityId" DROP NOT NULL,
  ADD COLUMN "entityKey" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "metadata" TEXT;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
