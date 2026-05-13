-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('draft', 'syllabus_ready', 'generating', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('pending', 'generating', 'ready', 'failed');

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "tone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "targetModuleCount" INTEGER NOT NULL,
    "targetWordsPerModule" INTEGER NOT NULL,
    "title" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'syllabus_ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT,
    "status" "ModuleStatus" NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleAudio" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'audio/mpeg',
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_createdAt_idx" ON "Course"("createdAt");

-- CreateIndex
CREATE INDEX "Module_courseId_order_idx" ON "Module"("courseId", "order");

-- CreateIndex
CREATE INDEX "Module_status_idx" ON "Module"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleAudio_moduleId_key" ON "ModuleAudio"("moduleId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleAudio" ADD CONSTRAINT "ModuleAudio_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
