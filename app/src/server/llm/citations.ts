// Expands policy section ranges and comma lists written by the decision LLM,
// e.g. "§3 ust. 1–2", "§3 ust. 1-2" or "§2 ust. 1, 4", into single-section citations.

const MAX_EXPANDED_SECTIONS = 50;
const SECTION_HEAD = /^§(\d+) ust\. (.+)$/;
const NUMBER_OR_RANGE = /^(\d+)(?:\s*[–-]\s*(\d+))?$/;

/**
 * Expands one citation. Returns the single-section citations it stands for, or
 * the trimmed input unchanged when it is not a recognised range or list.
 */
export function expandCitedSection(raw: string): string[] {
  const text = raw.trim();
  const head = SECTION_HEAD.exec(text);
  if (!head) return [text];

  const [, section = "", rest = ""] = head;
  const numbers: number[] = [];
  for (const rawPart of rest.split(",")) {
    const part = rawPart.trim().replace(new RegExp(`^§${section} ust\\.\\s*`), "");
    const match = NUMBER_OR_RANGE.exec(part);
    if (!match) return [text];

    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    if (to < from || to - from + 1 > MAX_EXPANDED_SECTIONS) return [text];
    for (let k = from; k <= to; k += 1) numbers.push(k);
  }
  return numbers.map((k) => `§${section} ust. ${k}`);
}

/** Expands every cited section, trims entries and removes duplicates, keeping order. */
export function normalizeCitedSections(list: string[]): string[] {
  const normalized: string[] = [];
  for (const entry of list) {
    for (const section of expandCitedSection(entry)) {
      if (!normalized.includes(section)) normalized.push(section);
    }
  }
  return normalized;
}

// A range or comma list for one section as it appears in message text, e.g. "§3 ust. 1–2" or "§2 ust. 4, 6".
const CITATION_IN_TEXT = /§(\d+) ust\. \d+(?:\s*[–-]\s*\d+)?(?:\s*,\s*(?:§\1 ust\. )?\d+(?:\s*[–-]\s*\d+)?)*/g;

/** True when the text names the cited section verbatim or inside a range or list for the same section. */
export function textCitesSection(markdown: string, section: string): boolean {
  if (markdown.includes(section)) return true;
  for (const match of markdown.matchAll(CITATION_IN_TEXT)) {
    if (expandCitedSection(match[0]).includes(section)) return true;
  }
  return false;
}
