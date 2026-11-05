// Night to dawn: cold and dark while the blame lands, indigo while we explain,
// warmer violet for the practices, a peach horizon at the end.
// The character is warm cream with a coral heart; shame is a cool grey that
// floods the whole body; guilt is an amber ring around just the cup.
export const C = {
  night: "#0b0e1b",
  indigo: "#121830",
  violet: "#1c1731",
  dusk: "#2a2140",
  horizon: "#e9a27c",
  sun: "#ffd7a1",

  ink: "#f3eee6",
  sub: "#a9b0c6",
  faint: "#6c7391",
  line: "rgba(255,255,255,0.14)",

  cream: "#f2e3c9",
  creamShade: "#d4bd9b",
  eye: "#2a2833",
  blush: "#f2a49a",
  heart: "#ff7d6e",
  gray: "#7d8399",
  grayShade: "#5f6478",

  blame: "#ff6a5a",
  guilt: "#ffb547",
  teal: "#8fd8cb",
  tealShade: "#5fb3a6",
  parent: "#b9a796",
  parentShade: "#8e7d6e",
  cup: "#9cc3e6",
  cupShade: "#6f97bd",
  gold: "#f4c95d",
  paper: "#efe7d8",
  pencil: "#4a4a55",
} as const;

// Background colour of each station (the camera's x mixes between them).
export const BG = {
  hook: C.night,
  steps: C.indigo,
  r1: C.indigo,
  r2: "#141a33",
  r3: "#101528",
  p1: C.violet,
  p2: "#241c37",
  end: C.dusk,
} as const;
