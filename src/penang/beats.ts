// Every time in PenangBridge comes from the BGM analysis in
// public/data/penang-bgm.json (scripts/penang/analyze-bgm.py). Shots, captions
// and flares are placed in *film beats*: beat 0 is the first downbeat of
// `music.startBar`, beat 4n is bar n of the film. Nothing here hard-codes a
// frame number; change the bars or the BGM and every cut moves with it.

import bgm from "../../public/data/penang-bgm.json";

export type MusicProps = {
  readonly src: string;
  readonly startBar: number;
  readonly bars: number;
  readonly preRoll: number;
  readonly tail: number;
  readonly loop: boolean;
  readonly fadeIn: number;
  readonly fadeOut: number;
  readonly volume: number;
};

export type Hit = { readonly beat: number; readonly frame: number; readonly strength: number };

export type Clock = {
  readonly fps: number;
  /** Frames of the mp3 skipped before the film starts (Audio trimBefore). */
  readonly trimBefore: number;
  /** Film frame (fractional) of a film beat; fractional beats are allowed. */
  readonly f: (beat: number) => number;
  /** Same, rounded to the frame a cut should land on. */
  readonly cut: (beat: number) => number;
  /** Inverse of f: fractional film beat at a film frame. */
  readonly beatAt: (frame: number) => number;
  /** Loudness 0..1 at a film frame (30 fps curve from the JSON). */
  readonly energy: (frame: number) => number;
  /** Accent 0..1 of an integer film beat. */
  readonly accent: (beat: number) => number;
  /** Strongest hits of the song that fall inside the film. */
  readonly hits: readonly Hit[];
  readonly beatsInFilm: number;
  /** Frame of the downbeat that ends the music part (start of the tail). */
  readonly endFrame: number;
  /** Loop mode: the film is exactly `bars` bars long, measured from frame 0,
   * so when it starts again the first downbeat lands where the next one
   * would have been. */
  readonly loop: boolean;
  readonly durationInFrames: number;
  readonly bpm: number;
};

const BEATS: readonly number[] = bgm.beats;
const PERIOD = bgm.tempo.period;

export const BGM_INFO = {
  bpm: bgm.tempo.bpm,
  period: PERIOD,
  bars: bgm.bars.length,
  musicEnd: bgm.source.musicEnd,
};

export const makeClock = (music: MusicProps, fps: number): Clock => {
  const startBar = Math.max(0, Math.min(bgm.bars.length - 1, Math.round(music.startBar)));
  const b0 = bgm.bars[startBar].beat;
  const songTime = (beat: number) => {
    const k = Math.floor(beat);
    const idx = b0 + k;
    const fr = beat - k;
    if (idx < 0) return BEATS[0] + (idx + fr) * PERIOD;
    if (idx >= BEATS.length - 1) return BEATS[BEATS.length - 1] + (idx - (BEATS.length - 1) + fr) * PERIOD;
    return BEATS[idx] + fr * (BEATS[idx + 1] - BEATS[idx]);
  };
  const trimBefore = Math.max(0, Math.floor((songTime(0) - music.preRoll) * fps));
  const audioStart = trimBefore / fps;
  const f = (beat: number) => (songTime(beat) - audioStart) * fps;
  const beatAt = (frame: number) => (frame / fps + audioStart - songTime(0)) / PERIOD;
  const beatsInFilm = Math.round(music.bars) * 4;
  const endFrame = f(beatsInFilm);

  const values = bgm.energy.values;
  const energy = (frame: number) => {
    const x = frame + trimBefore * (bgm.energy.fps / fps);
    const i = Math.floor(x);
    if (i < 0) return values[0];
    if (i >= values.length - 1) return values[values.length - 1];
    return values[i] + (values[i + 1] - values[i]) * (x - i);
  };
  const accent = (beat: number) => {
    const idx = b0 + Math.round(beat);
    return idx >= 0 && idx < bgm.beatAccent.length ? bgm.beatAccent[idx] : 0;
  };
  const hits = bgm.topHits
    .map((h) => ({ beat: (h.t - songTime(0)) / PERIOD, frame: (h.t - audioStart) * fps, strength: h.strength }))
    .filter((h) => h.beat >= -0.1 && h.beat <= beatsInFilm + 0.1);

  return {
    fps,
    trimBefore,
    f,
    cut: (beat: number) => Math.round(f(beat)),
    beatAt,
    energy,
    accent,
    hits,
    beatsInFilm,
    endFrame,
    loop: music.loop,
    // loop: frame 0 of the next pass + f(0) must land on beat `beatsInFilm`
    durationInFrames: music.loop ? Math.max(1, Math.round(endFrame - f(0))) : Math.ceil(endFrame + music.tail * fps),
    bpm: bgm.tempo.bpm,
  };
};
