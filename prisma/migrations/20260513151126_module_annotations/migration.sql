-- CreateEnum
CREATE TYPE "AnnotationStatus" AS ENUM ('pending', 'applied', 'dismissed');

-- CreateTable
CREATE TABLE "ModuleAnnotation" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "quotedText" TEXT NOT NULL,
    "contextBefore" TEXT NOT NULL,
    "contextAfter" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" "AnnotationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleAnnotation_moduleId_status_idx" ON "ModuleAnnotation"("moduleId", "status");

-- AddForeignKey
ALTER TABLE "ModuleAnnotation" ADD CONSTRAINT "ModuleAnnotation_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
