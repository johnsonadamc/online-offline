// src/lib/textDetect.ts — pure text heuristics shared by the magazine generator
// (src/magazine/core/selectionLogic.ts) and the submit form's display-only
// "Reads as poetry / essay" line. Moved here in redesign Phase 13 so the two
// never drift. No DB, no React.

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Poetry detection: ALL three conditions must hold.
export function isPoetry(body: string): boolean {
  if (!body.includes('\n\n')) return false; // must have a stanza break

  const lines = body.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return false;

  const avgLineLen = nonEmpty.reduce((s, l) => s + l.length, 0) / nonEmpty.length;
  if (avgLineLen >= 60) return false;

  const words = countWords(body);
  if (words === 0) return false;
  const lineBreaksPer100Words = (lines.length / words) * 100;
  return lineBreaksPer100Words >= 3;
}
