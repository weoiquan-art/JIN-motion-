// Pure helpers shared by fonts.ts and scripts/fetch-fonts.ts (no imports).

export const NOTO_DIR = "noto-sans-sc";
export const INTER_DIR = "inter";
export const MONO_DIR = "jetbrains-mono";

type Range = [number, number];
const parseRanges = (r: string): Range[] =>
  r.split(",").map((part) => {
    const [a, b] = part.trim().replace(/^U\+/i, "").split("-");
    return [parseInt(a, 16), parseInt(b ?? a, 16)];
  });

const inRanges = (ranges: string, cp: number) =>
  parseRanges(ranges).some(([a, b]) => cp >= a && cp <= b);

// Noto Sans SC is split by Google into ~100 unicode-range slices. Return only
// the slices the text needs; Latin is drawn by Inter. Throws if a character
// is covered by neither, so it can never silently fall back to a system font.
export const neededNotoSubsets = (
  text: string,
  interLatin: string,
  notoRanges: Record<string, string>,
): string[] => {
  const subsets = new Set<string>();
  for (const ch of new Set(text)) {
    if (ch.trim() === "") continue;
    const cp = ch.codePointAt(0) as number;
    if (inRanges(interLatin, cp)) continue;
    const subset = Object.keys(notoRanges).find((k) => inRanges(notoRanges[k], cp));
    if (!subset) {
      throw new Error(`Character "${ch}" is not covered by Inter latin or any Noto Sans SC subset`);
    }
    subsets.add(subset);
  }
  return [...subsets].sort();
};

// IntroV2 rule (Noto first, JetBrains Mono for Latin): plain ASCII is drawn by
// the mono font; anything else uses a Noto subset when one covers it (so CJK
// punctuation like "——" or "，" stays full-width), otherwise the mono font's
// latin range. Throws when neither covers a character.
export const notoSubsetsCjkFirst = (
  text: string,
  notoRanges: Record<string, string>,
  monoLatin: string,
): string[] => {
  const subsets = new Set<string>();
  for (const ch of new Set(text)) {
    if (ch.trim() === "") continue;
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) continue;
    const subset = Object.keys(notoRanges).find((k) => inRanges(notoRanges[k], cp));
    if (subset) subsets.add(subset);
    else if (!inRanges(monoLatin, cp)) {
      throw new Error(`Character "${ch}" is not covered by Noto Sans SC or JetBrains Mono`);
    }
  }
  return [...subsets].sort();
};

// Same unicode-range string with plain ASCII removed, so a Noto face can never
// draw Latin letters / digits (they fall through to the mono font instead).
export const withoutAscii = (ranges: string) =>
  parseRanges(ranges)
    .map(([a, b]): Range => [Math.max(a, 0x80), b])
    .filter(([a, b]) => a <= b)
    .map(([a, b]) => (a === b ? `U+${a.toString(16)}` : `U+${a.toString(16)}-${b.toString(16)}`))
    .join(", ");

// Google serves one variable woff2 per subset for all weights, so the file
// name from the URL is unique per subset.
export const localFontPath = (dir: string, url: string) =>
  `fonts/${dir}/${url.split("/").pop()}`;
