const MOBILE_QUERY = '(max-width: 768px)';

export function isMobileViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia(MOBILE_QUERY).matches
  );
}
