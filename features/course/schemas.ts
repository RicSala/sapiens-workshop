import { z } from "zod";

export const SyllabusInputSchema = z.object({
  topic: z.string().trim().min(2).max(500),
  audience: z.string().trim().min(2).max(2000),
  tone: z.string().trim().max(100).optional().default("neutral"),
  language: z.string().trim().min(2).max(50).default("English"),
  targetModuleCount: z.coerce.number().int().min(3).max(20).default(10),
  targetWordsPerModule: z.coerce.number().int().min(200).max(3000).default(1000),
});

export type SyllabusInput = z.infer<typeof SyllabusInputSchema>;

export const SyllabusModuleSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

export const SyllabusSchema = z.object({
  title: z.string(),
  modules: z.array(SyllabusModuleSchema),
});

export type SyllabusModule = z.infer<typeof SyllabusModuleSchema>;
export type Syllabus = z.infer<typeof SyllabusSchema>;

export const CreateAnnotationSchema = z.object({
  moduleId: z.string().min(1),
  quotedText: z.string().trim().min(1).max(2000),
  contextBefore: z.string().max(500),
  contextAfter: z.string().max(500),
  note: z.string().trim().min(1).max(2000),
});

export const DeleteAnnotationSchema = z.object({
  annotationId: z.string().min(1),
});

export type CreateAnnotationInput = z.infer<typeof CreateAnnotationSchema>;
export type DeleteAnnotationInput = z.infer<typeof DeleteAnnotationSchema>;
