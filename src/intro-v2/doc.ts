// Prompt-template edit engine: replays OPS into per-character histories and
// answers "what does the document look like at frame f" — text, diff state,
// wrapping, cursor position. Pure (no React), also used by the audio script.

import {
  CONTENT_W,
  CONTENT_X,
  DOC,
  type FieldId,
  FIELDS,
  FINAL_V13,
  isWide,
  type Op,
  OPS,
  ROWS_TOP,
  S,
  VERSIONS,
} from "./timeline.ts";

export type Rec = {
  ch: string;
  wide: boolean;
  born: number; // frame the key was pressed
  struck: number; // red strikethrough from this frame
  gone: number; // erased by backspace at this frame
  runEnd: number; // when the typed run it belongs to finished
};

type BuiltOp = {
  op: Op;
  start: number;
  end: number;
  recs: Rec[]; // characters this op typed / struck / erased
  before: Rec | null; // record just before the insertion point (type ops)
};

const INF = Number.POSITIVE_INFINITY;
const fieldRecs = Object.fromEntries(FIELDS.map((f) => [f.id, [] as Rec[]])) as Record<FieldId, Rec[]>;
const alive = (r: Rec, t: number) => r.born <= t && r.gone > t;

export const BUILT: BuiltOp[] = [...OPS]
  .sort((a, b) => a.at - b.at)
  .map((op): BuiltOp => {
    const arr = fieldRecs[op.field];
    const t = op.at;
    if (op.kind === "type") {
      const liveIdx = arr.map((r, i) => (alive(r, t) ? i : -1)).filter((i) => i >= 0);
      const idx =
        op.where === "start"
          ? (liveIdx[0] ?? arr.length)
          : liveIdx.length
            ? liveIdx[liveIdx.length - 1] + 1
            : arr.length;
      const chars = [...op.text];
      const end = t + chars.length * op.rate;
      const recs = chars.map((ch, i) => ({ ch, wide: isWide(ch), born: t + i * op.rate, struck: INF, gone: INF, runEnd: end }));
      const before = idx > 0 ? arr[idx - 1] : null;
      arr.splice(idx, 0, ...recs);
      return { op, start: t, end, recs, before };
    }
    const live = arr.filter((r) => alive(r, t));
    if (op.kind === "strike") {
      let recs = live;
      if (op.target !== "all") {
        const text = live.map((r) => r.ch).join("");
        const at = text.lastIndexOf(op.target);
        if (at < 0) throw new Error(`strike target "${op.target}" not found in ${op.field}`);
        recs = live.slice(at, at + [...op.target].length);
      }
      recs.forEach((r, j) => (r.struck = t + j * 0.8));
      return { op, start: t, end: t + recs.length * 0.8, recs, before: null };
    }
    // erase: backspace through every struck character (even if the strike
    // sweep is still finishing), right to left
    const recs = live.filter((r) => r.struck < INF);
    recs
      .slice()
      .reverse()
      .forEach((r, j) => (r.gone = t + j * op.rate));
    return { op, start: t, end: t + recs.length * op.rate, recs, before: null };
  });

export const fieldRecords = (id: FieldId) => fieldRecs[id];

// ------------------------------------------------------------------ layout
export type Placed = { rec: Rec; line: number; x: number; w: number };
export type FieldLayout = { placed: Placed[]; lines: number };

export const layoutField = (id: FieldId, f: number): FieldLayout => {
  const placed: Placed[] = [];
  let line = 0;
  let x = 0;
  for (const rec of fieldRecs[id]) {
    if (!alive(rec, f)) continue;
    const w = (rec.wide ? 1 : 0.6) * DOC.fs;
    if (x + w > CONTENT_W + 0.5) {
      line++;
      x = 0;
    }
    placed.push({ rec, line, x, w });
    x += w;
  }
  return { placed, lines: Math.max(1, line + 1) };
};

export const textAt = (id: FieldId, f: number) =>
  fieldRecs[id]
    .filter((r) => alive(r, f) && r.struck > f)
    .map((r) => r.ch)
    .join("");

// Row geometry; the growing 负面 row eases its height over 5 frames.
export const rowHeight = (lines: number) => DOC.rowPad * 2 + lines * DOC.lineH;
const smoothLines = (id: FieldId, f: number) => {
  if (id !== "neg") return layoutField(id, f).lines;
  let s = 0;
  for (let k = 0; k < 5; k++) s += layoutField(id, f - k).lines;
  return s / 5;
};

export const docRows = (f: number) => {
  let y = ROWS_TOP;
  return FIELDS.map((fd) => {
    const h = rowHeight(smoothLines(fd.id, f));
    const row = { id: fd.id, label: fd.label, y, h };
    y += h;
    return row;
  });
};

export const docHeight = (f: number) => {
  const rows = docRows(f);
  const last = rows[rows.length - 1];
  return last.y + last.h - DOC.top + DOC.footerH;
};

// ------------------------------------------------------------------ cursor
export type Cursor = { field: FieldId; after: Rec | null; busy: boolean };

const cursorOfOp = (cur: BuiltOp, f: number): Cursor => {
  const busy = f < cur.end + 1;
  const { op } = cur;
  if (op.kind === "type") {
    const born = cur.recs.filter((r) => r.born <= f);
    return { field: op.field, after: born.length ? born[born.length - 1] : cur.before, busy };
  }
  if (op.kind === "strike") return { field: op.field, after: cur.recs[cur.recs.length - 1] ?? null, busy };
  const left = cur.recs.filter((r) => r.gone > f);
  if (left.length) return { field: op.field, after: left[left.length - 1], busy };
  const arr = fieldRecs[op.field];
  const i = arr.indexOf(cur.recs[0]);
  return { field: op.field, after: i > 0 ? arr[i - 1] : null, busy };
};

// The visible cursor belongs to the most recently started op.
export const cursorAt = (f: number): Cursor | null => {
  let cur: BuiltOp | null = null;
  for (const b of BUILT) if (b.start <= f) cur = b;
  return cur ? cursorOfOp(cur, f) : null;
};

// Cursor position inside a field's content box (line, x) at frame f.
export const cursorInField = (c: Cursor, f: number) => {
  const lay = layoutField(c.field, f);
  if (!c.after) return { line: 0, x: 0 };
  const arr = fieldRecs[c.field];
  const ai = arr.indexOf(c.after);
  let last: Placed | null = null;
  for (const p of lay.placed) if (arr.indexOf(p.rec) <= ai) last = p;
  if (!last) return { line: 0, x: 0 };
  return { line: last.line, x: last.x + last.w };
};

const cursorToWorld = (c: Cursor, f: number) => {
  const pos = cursorInField(c, f);
  const row = docRows(f).find((r) => r.id === c.field) as ReturnType<typeof docRows>[number];
  return {
    field: c.field,
    x: CONTENT_X + pos.x,
    y: row.y + DOC.rowPad + pos.line * DOC.lineH + DOC.lineH / 2,
    busy: c.busy,
  };
};

export const cursorWorld = (f: number) => {
  const c = cursorAt(f);
  return c ? cursorToWorld(c, f) : null;
};

// Camera focus: like the cursor, but it only switches to a new op after
// dwelling at least `dwell` frames, so even the peak lands on readable text.
const DWELL = 6;
export const FOCUS_SWITCHES: number[] = (() => {
  const out: number[] = [];
  BUILT.forEach((b, i) => {
    const last = out[out.length - 1];
    if (last === undefined) return out.push(i);
    const sameField = BUILT[last].op.field === b.op.field;
    // same field: follow along (it is the same line); other field: only after a dwell
    if (sameField || b.start - BUILT[last].start >= DWELL) out.push(i);
  });
  return out;
})();

export const focusAt = (f: number) => {
  let k = -1;
  let moves = 0; // number of jumps to a different field (drives zoom / tilt)
  FOCUS_SWITCHES.forEach((i, n) => {
    if (BUILT[i].start > f) return;
    if (n > 0 && BUILT[i].op.field !== BUILT[FOCUS_SWITCHES[n - 1]].op.field) moves++;
    k = n;
  });
  if (k < 0) return null;
  return { n: moves, ...cursorToWorld(cursorOfOp(BUILT[FOCUS_SWITCHES[k]], f), f) };
};

// ------------------------------------------------------------------ misc
export const versionAt = (f: number) => {
  let v = 0;
  for (const x of VERSIONS) if (f >= x.f) v = x.v;
  return v;
};

export const negCount = (f: number) => (textAt("neg", f).match(/不要/g) ?? []).length;

// Sanity check: everything visible at the stop (struck or not) must be
// exactly the v13 text.
for (const fd of FIELDS) {
  const got = fieldRecs[fd.id]
    .filter((r) => alive(r, S.stop))
    .map((r) => r.ch)
    .join("");
  if (got !== FINAL_V13[fd.id]) {
    throw new Error(`v13 mismatch in ${fd.id}: "${got}" !== "${FINAL_V13[fd.id]}"`);
  }
}
