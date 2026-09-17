/**
 * Word count, not character count (spec: "מקסימום 200 מילים, לא 200 תווים") — splits on any run
 * of whitespace and drops empty pieces, so leading/trailing/repeated spaces never inflate the
 * count.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export const MAX_REVIEW_WORDS = 200;
