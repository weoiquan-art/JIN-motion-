import { Img, staticFile, useCurrentFrame } from "remotion";
import { clamp, easeOut, inv, lerp, springAt } from "../../intro/math";
import { cursorAt, cursorInField, docHeight, docRows, layoutField, negCount, type Placed, versionAt } from "../doc.ts";
import { MONO_STACK, ZH } from "../fonts";
import {
  CONTENT_X,
  DOC,
  DOC_LEFT,
  LOGO_FILES,
  S,
  TOPBAR_ICON,
  topbarSlot,
  VERSIONS,
} from "../timeline.ts";

const RED = "#ff453a";
const GREEN = "#3ddc84";
const AMBER = "#ffb020";
const TEXT = "#f2f2f2";
const HL = 20; // frames a finished run stays green

const mix = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(",")})`;
const GREEN_RGB: [number, number, number] = [61, 220, 132];
const TEXT_RGB: [number, number, number] = [242, 242, 242];

// group consecutive placed chars on the same line that satisfy a predicate
const runs = (placed: Placed[], ok: (p: Placed) => boolean) => {
  const out: Placed[][] = [];
  let cur: Placed[] = [];
  for (const p of placed) {
    if (ok(p) && (!cur.length || cur[cur.length - 1].line === p.line)) cur.push(p);
    else {
      if (cur.length) out.push(cur);
      cur = ok(p) ? [p] : [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

const Check: React.FC<{ size: number; color?: string }> = ({ size, color = "#0b0b0b" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16">
    <path d="M3 8.5 L6.6 12 L13 4.5" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type Props = {
  snapshot?: number; // frame whose state to show (stack copies); live when omitted
  dx?: number;
  dy?: number;
  rot?: number;
  opacity?: number;
};

export const Doc: React.FC<Props> = ({ snapshot, dx = 0, dy = 0, rot = 0, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const live = snapshot === undefined;
  if (live && frame < DOC.appear) return null;
  const clean = !live || frame >= S.stop; // no diff colours, no live cursor
  const at = live ? Math.min(frame, S.stop) : snapshot;
  const rows = docRows(at);
  const height = docHeight(at);
  const appear = live ? easeOut(inv(DOC.appear, DOC.appear + 14, frame)) : 1;

  const v = versionAt(at);
  const vEntry = VERSIONS.find((x) => x.v === v);
  const vAge = live && vEntry ? frame - vEntry.f : 99;
  const vPop = live && vEntry ? lerp(1.45, 1, springAt(vAge, 320, 13, 0.6)) : 1;
  const success = live && frame >= 655;
  const vColor = success ? GREEN : vAge < 10 ? mix([255, 176, 32], TEXT_RGB, vAge / 10) : TEXT;

  const cursor = live && !clean ? cursorAt(frame) : null;
  const count = negCount(at);
  const countEntry = live ? (() => {
    let since = -99;
    for (let g = at; g > at - 30; g--) if (negCount(g) < count) { since = g + 1; break; }
    return since;
  })() : -99;

  // generate button
  const press = live ? frame - S.press : -1;
  const pressDepth = press >= 0 ? (press < 4 ? press / 4 : clamp(1 - (press - 4) / 6)) : 0;
  const pressed = live && frame >= S.press;

  return (
    <div
      style={{
        position: "absolute",
        left: DOC_LEFT + dx,
        top: DOC.top + dy,
        width: DOC.w,
        height,
        transformOrigin: "50% 0%",
        transform: `rotate(${rot}deg) scale(${lerp(0.96, 1, appear)})`,
        opacity: opacity * appear,
        background: "#121212",
        border: "1.5px solid #2c2c2c",
        borderRadius: 16,
        boxShadow: "0 40px 90px rgba(0,0,0,0.65)",
      }}
    >
      {/* header */}
      <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: DOC.headerH, borderBottom: "1px solid #242424" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
          <div key={c} style={{ position: "absolute", left: 26 + i * 22, top: DOC.headerH / 2 - 7, width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />
        ))}
        <div style={{ position: "absolute", left: 104, top: 0, lineHeight: `${DOC.headerH}px`, fontFamily: MONO_STACK, fontWeight: 500, fontSize: 22, color: "#8a8a8a", whiteSpace: "pre" }}>
          prompt_template.txt
        </div>
        {(!live || frame >= 194) &&
          LOGO_FILES.map((l, i) => {
            const s = topbarSlot(i);
            return (
              <div key={l.file} style={{ position: "absolute", left: s.x - DOC_LEFT - TOPBAR_ICON / 2, top: s.y - DOC.top - TOPBAR_ICON / 2, width: TOPBAR_ICON, height: TOPBAR_ICON }}>
                <Img src={staticFile(l.file)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: l.pixelated ? "pixelated" : "auto" }} />
              </div>
            );
          })}
        {v > 0 && (
          <div
            style={{
              position: "absolute",
              right: success ? 92 : 30,
              top: 0,
              height: DOC.headerH,
              display: "flex",
              alignItems: "center",
              transformOrigin: "right center",
              transform: `scale(${vPop})`,
              fontFamily: MONO_STACK,
              fontWeight: 800,
              fontSize: live ? 42 : 58, // stack copies: readable from far away
              color: vColor,
              whiteSpace: "pre",
            }}
          >
            {`v${v}`}
          </div>
        )}
        {success && (
          <div
            style={{
              position: "absolute",
              right: 30,
              top: DOC.headerH / 2 - 24,
              width: 48,
              height: 48,
              borderRadius: 24,
              background: GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${lerp(0.2, 1, springAt(frame - 655, 300, 12, 0.6))})`,
            }}
          >
            <Check size={30} />
          </div>
        )}
      </div>

      {/* fields */}
      {rows.map((row, ri) => {
        const rowIn = live ? easeOut(inv(DOC.rowsIn + ri * 4, DOC.rowsIn + ri * 4 + 10, frame)) : 1;
        const top = row.y - DOC.top;
        const active = cursor?.field === row.id;
        const lay = layoutField(row.id, at);
        const cx = CONTENT_X - DOC_LEFT;
        const lineTop = (line: number) => top + DOC.rowPad + line * DOC.lineH;
        const struck = (p: Placed) => !clean && p.rec.struck <= at;
        const hlAge = (p: Placed) => at - p.rec.runEnd;
        const lit = (p: Placed) => !clean && hlAge(p) >= 0 && hlAge(p) < HL;
        return (
          <div key={row.id} style={{ opacity: rowIn, transform: `translateY(${lerp(14, 0, rowIn)}px)` }}>
            {ri > 0 && <div style={{ position: "absolute", left: 20, right: 20, top, height: 1, background: "rgba(255,255,255,0.07)" }} />}
            {active && <div style={{ position: "absolute", left: 10, top: top + 12, width: 4, height: row.h - 24, borderRadius: 2, background: "rgba(255,255,255,0.85)" }} />}
            <div
              style={{
                position: "absolute",
                left: DOC.pad,
                top: lineTop(0),
                lineHeight: `${DOC.lineH}px`,
                fontFamily: MONO_STACK,
                fontWeight: 600,
                fontSize: DOC.labelFs,
                color: active ? "#f0f0f0" : "#7d7d7d",
                whiteSpace: "pre",
              }}
            >
              {row.label}
            </div>
            {row.id === "neg" && count > 0 && (
              <div
                style={{
                  position: "absolute",
                  left: DOC.pad + 4 * DOC.labelFs + 8,
                  top: lineTop(0) + 12,
                  height: 30,
                  padding: "0 8px",
                  borderRadius: 6,
                  border: `1.5px solid ${AMBER}`,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: MONO_STACK,
                  fontWeight: 800,
                  fontSize: 20,
                  color: AMBER,
                  transformOrigin: "left center",
                  transform: `scale(${live ? lerp(1.5, 1, springAt(at - countEntry, 320, 12, 0.6)) : 1})`,
                  whiteSpace: "pre",
                }}
              >
                {`×${count}`}
              </div>
            )}
            {/* green wash behind freshly typed runs */}
            {runs(lay.placed, lit).map((run) => {
              const t = hlAge(run[0]) / HL;
              const a = run[0];
              const b = run[run.length - 1];
              return (
                <div
                  key={`hl-${a.line}-${a.x}`}
                  style={{ position: "absolute", left: cx + a.x - 3, top: lineTop(a.line) + 6, width: b.x + b.w - a.x + 6, height: DOC.lineH - 12, borderRadius: 5, background: `rgba(61,220,132,${0.24 * (1 - t)})` }}
                />
              );
            })}
            {lay.placed.map((p, i) => {
              const s = struck(p);
              const t = hlAge(p) / HL;
              const color = s ? RED : lit(p) ? mix(GREEN_RGB, TEXT_RGB, clamp((t - 0.35) / 0.65)) : TEXT;
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: cx + p.x,
                    top: lineTop(p.line),
                    width: p.w,
                    textAlign: "center",
                    lineHeight: `${DOC.lineH}px`,
                    fontFamily: p.rec.wide ? ZH : MONO_STACK,
                    fontWeight: 500,
                    fontSize: DOC.fs,
                    color,
                    whiteSpace: "pre",
                  }}
                >
                  {p.rec.ch}
                </span>
              );
            })}
            {/* red strike lines sweep in left → right */}
            {runs(lay.placed, struck).map((run) => {
              const a = run[0];
              const b = run[run.length - 1];
              return (
                <div
                  key={`st-${a.line}-${a.x}`}
                  style={{ position: "absolute", left: cx + a.x, top: lineTop(a.line) + DOC.lineH * 0.5, width: b.x + b.w - a.x, height: 4, borderRadius: 2, background: RED }}
                />
              );
            })}
            {cursor && active && (() => {
              const pos = cursorInField(cursor, frame);
              const on = cursor.busy || Math.floor(frame / 8) % 2 === 0;
              return on ? (
                <div style={{ position: "absolute", left: cx + pos.x + 1, top: lineTop(pos.line) + (DOC.lineH - DOC.fs * 1.1) / 2, width: 4, height: DOC.fs * 1.1, background: "#ffffff" }} />
              ) : null;
            })()}
          </div>
        );
      })}

      {/* calm v13 beat: cursor at the end of 【镜2】 blinks twice */}
      {live && frame >= S.stop && frame < S.press && (() => {
        const row = rows[rows.length - 1];
        const lay = layoutField("shot2", S.stop);
        const last = lay.placed[lay.placed.length - 1];
        const t = frame - S.stop;
        const on = (t >= 4 && t < 11) || (t >= 18 && t < 25);
        return on ? (
          <div style={{ position: "absolute", left: CONTENT_X - DOC_LEFT + last.x + last.w + 1, top: row.y - DOC.top + DOC.rowPad + last.line * DOC.lineH + (DOC.lineH - DOC.fs * 1.1) / 2, width: 4, height: DOC.fs * 1.1, background: "#ffffff" }} />
        ) : null;
      })()}

      {/* footer: generate */}
      <div
        style={{
          position: "absolute",
          right: 28,
          bottom: 26,
          height: 56,
          padding: "0 22px 0 18px",
          borderRadius: 28,
          display: "flex",
          alignItems: "center",
          gap: 12,
          transform: `scale(${1 - 0.09 * pressDepth})`,
          background: pressed ? (press < 8 ? "#ffffff" : "rgba(61,220,132,0.16)") : "rgba(255,255,255,0.05)",
          border: `1.5px solid ${pressed ? GREEN : "rgba(255,255,255,0.4)"}`,
          color: pressed && press < 8 ? "#0b0b0b" : TEXT,
        }}
      >
        <svg width={18} height={18} viewBox="0 0 18 18">
          <path d="M4 2.5 L15 9 L4 15.5 Z" fill={pressed && press < 8 ? "#0b0b0b" : pressed ? GREEN : TEXT} />
        </svg>
        <span style={{ fontFamily: ZH, fontWeight: 700, fontSize: 26 }}>生成</span>
        <span style={{ fontFamily: MONO_STACK, fontWeight: 600, fontSize: 16, letterSpacing: "0.12em", opacity: 0.6 }}>GENERATE</span>
      </div>
      {live && press >= 0 && press < 22 && (
        <div
          style={{
            position: "absolute",
            right: 28 + 120 - 20 - 130 * easeOut(press / 22),
            bottom: 26 + 28 - 20 - 130 * easeOut(press / 22),
            width: 40 + 260 * easeOut(press / 22),
            height: 40 + 260 * easeOut(press / 22),
            borderRadius: "50%",
            border: `2px solid rgba(61,220,132,${1 - press / 22})`,
          }}
        />
      )}
    </div>
  );
};
