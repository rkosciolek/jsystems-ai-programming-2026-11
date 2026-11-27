/** Distance from the bottom (px) within which the user still counts as "at the bottom" (AC-40). */
export const NEAR_BOTTOM_THRESHOLD_PX = 80;

type ScrollMetrics = { scrollHeight: number; scrollTop: number; clientHeight: number };

export function isNearBottom(el: ScrollMetrics, threshold = NEAR_BOTTOM_THRESHOLD_PX): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

/** DD.MM.RRRR from an ISO yyyy-mm-dd date; other strings are returned unchanged. */
export function formatDatePl(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
}
