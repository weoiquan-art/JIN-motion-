// Pure helpers shared by fonts.ts and scripts/fetch-fonts.ts (no imports).

export const NOTO_DIR = "noto-sans-sc";
export const INTER_DIR = "inter";

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

// Google serves one variable woff2 per subset for all weights, so the file
// name from the URL is unique per subset.
export const localFontPath = (dir: string, url: string) =>
  `fonts/${dir}/${url.split("/").pop()}`;
