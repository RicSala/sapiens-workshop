"use client";

import type { SyllabusInput } from "@/features/course/schemas";

const KEY = "syllabus-draft-input";

export function saveDraftInput(input: SyllabusInput) {
  sessionStorage.setItem(KEY, JSON.stringify(input));
}

export function readDraftInput(): SyllabusInput | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SyllabusInput;
  } catch {
    return null;
  }
}

export function clearDraftInput() {
  sessionStorage.removeItem(KEY);
}
