export function sanitizeTag(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
}
