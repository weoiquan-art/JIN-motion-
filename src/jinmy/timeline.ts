// Time table of the jinmyaigc promo (9:16, 1080×1920, 30 fps). 120 BPM, so
// one beat is exactly 15 frames and one bar 60. Every scene, caption and
// sound cue is placed here; the composition and the soundtrack script
// (scripts/gen-audio-jinmy.ts) both read it, so picture and sound stay on
// the same grid. No React or Remotion imports: Node runs this file directly.

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const BPM = 120;
export const BEAT = 15; // frames
export const BAR = BEAT * 4;
export const DURATION = BAR * 13; // 26 s

/** frame of a bar (and beat within it) */
export const at = (bar: number, beat = 0) => bar * BAR + beat * BEAT;

// ------------------------------------------------------------------ scenes
// Hook: the door opens on clip 1 (POV "welcome home"); on the drop the frame
// freezes like a camera shutter and shrinks into one photo; the three steps
// (upload a photo, pick a scene, get your video); the call to action.
export const S = {
  hook: { from: at(0), to: at(2) },
  photo: { from: at(2), to: at(3) },
  upload: { from: at(3), to: at(5) },
  pick: { from: at(5), to: at(7) },
  result: { from: at(7), to: at(10) },
  cta: { from: at(10), to: DURATION },
} as const;

// key moments inside the scenes
export const M = {
  doorOpen: at(1), // clip 1 has the door open by ~1.9 s
  shutter: at(2), // freeze on the drop
  lift: at(3), // the photo is lifted towards the upload slot
  land: at(3, 2), // ...and lands on the beat
  progress: [at(3, 3), at(4, 0), at(4, 1), at(4, 2)], // ring fills a quarter per beat
  done: at(4, 3), // check mark
  swipeToPick: at(5),
  hops: [at(5, 2), at(5, 3), at(6, 0), at(6, 1)], // selection hops, landing on "Height Check"
  chosen: at(6, 2),
  expand: at(7),
  second: at(9), // "Welcome Home" result joins
  ctaTitle: at(10),
  url: at(11),
  final: at(12),
} as const;

// the clips (public/jinmy/clips, 960×720, 24 fps, with sound)
export const CLIPS = {
  welcome: "jinmy/clips/clip1.mp4", // one character waits at the door (10 s)
  welcomeDuo: "jinmy/clips/clip4.mp4", // two characters wait at the door (10 s)
  height: "jinmy/clips/clip3.mp4", // height check against a wall chart (15 s)
} as const;
/** where each scene starts playing its clip (seconds into the clip) */
export const CLIP_FROM = {
  hook: 0, // keys, door, she is there
  height: 4.6, // the pencil marks her height
  duo: 3.6, // the two of them walk up to you
} as const;
// In the end card the result clips keep playing from where they are, slowed
// down so they last to the end (clip 3 is 15 s, clips 1 and 4 are 10 s).
export const FAN_RATE = 0.7;
export const FAN_FROM = {
  welcome: 3.4,
  height: CLIP_FROM.height + (S.cta.from - M.expand) / FPS, // 10.6 s → 14.8 s
  duo: CLIP_FROM.duo + (S.cta.from - M.second) / FPS, // 5.6 s → 9.8 s
} as const;

// ------------------------------------------------------------------ copy
export const COPY = {
  pov: "POV:",
  hookA: "you come home",
  hookB: "and she's waiting\nat the door", // \n: forced line break
  madeFrom: "Made from",
  yourPhoto: "your photo",
  step1: "Upload a photo",
  step2: "Pick a scene",
  step3: "Get your video",
  sceneA: "Welcome Home",
  sceneB: "Height Check",
  cta: "Bring your\ncharacter home",
  name: "jinmyaigc",
  url: "www.jinmyaigc.studio",
} as const;
export const ALL_TEXT_JINMY = Object.values(COPY).join("") + "0123456789123✓";

// ------------------------------------------------------------------ sound
// Music is ducked under the clips' own sound (keys, door, the characters).
export const DUCK = [
  { from: S.hook.from, to: S.hook.to, gain: 0.7 },
  { from: S.result.from, to: S.result.to, gain: 0.8 },
] as const;
// Gains on the clips' own sound (Remotion amplifies above 1 when rendering).
// The clips are quiet (clip 1 −23 LUFS over 0–4 s, clip 3 −22 LUFS over
// 4.6–8.6 s); clip 4 over 3.6–5.6 s is near silence plus one sharp knock
// (−5.7 dBFS), so it stays at 1. With these the sections measure −17.5 to
// −13.9 LUFS, whole film −15.3 LUFS, peak −1.0 dBFS (before: hook −23.1).
export const CLIP_GAIN = {
  hook: 2.5, // clip 1 under the hook
  height: 2.0, // clip 3 when it is the result
  heightUnder: 0.8, // clip 3 once the second result joins
  duo: 1.0, // clip 4
} as const;
