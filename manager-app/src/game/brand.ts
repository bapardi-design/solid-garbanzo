/**
 * Visual identity, generated rather than shipped as image files.
 *
 * Every club gets a deterministic crest: two kit colours and a pattern derived
 * from its name, with a lookup table so the famous clubs wear the right ones.
 * Flags are drawn from a compact spec rather than an emoji or a sprite sheet,
 * so they stay crisp at 14px and in both themes.
 */

export type Pattern = 'solid' | 'stripes' | 'halves' | 'hoops' | 'sash';

export interface Identity {
  /** Main kit colour. */
  primary: string;
  /** Trim: the second colour of the crest and the pattern. */
  secondary: string;
  pattern: Pattern;
  /** Readable ink on `primary`. */
  ink: string;
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Relative luminance, for picking ink that can be read on a colour. */
export function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const n = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const inkOn = (hex: string): string => (luminance(hex) > 0.45 ? '#0d1310' : '#ffffff');

/** Mixes a colour towards white or black, for hovers and bands. */
export function shade(hex: string, amount: number): string {
  const c = hex.replace('#', '');
  const n = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const to = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const out = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16);
    return Math.round(v + (to - v) * k).toString(16).padStart(2, '0');
  });
  return `#${out.join('')}`;
}

/** Kit colours for clubs a supporter would notice. Everything else is generated. */
const KNOWN: Record<string, [string, string, Pattern]> = {
  Arsenal: ['#ef0107', '#ffffff', 'solid'],
  'Aston Villa': ['#670e36', '#95bfe5', 'halves'],
  Chelsea: ['#034694', '#ffffff', 'solid'],
  Everton: ['#003399', '#ffffff', 'solid'],
  Liverpool: ['#c8102e', '#00b2a9', 'solid'],
  'Manchester City': ['#6cabdd', '#1c2c5b', 'solid'],
  'Manchester United': ['#da291c', '#fbe122', 'solid'],
  'Newcastle United': ['#241f20', '#ffffff', 'stripes'],
  'Tottenham Hotspur': ['#132257', '#ffffff', 'halves'],
  'West Ham United': ['#7a263a', '#1bb1e7', 'sash'],
  'Nottingham Forest': ['#dd0000', '#ffffff', 'solid'],
  Sunderland: ['#eb172b', '#ffffff', 'stripes'],
  'Leeds United': ['#ffffff', '#1d428a', 'solid'],
  'Wolverhampton Wanderers': ['#fdb913', '#231f20', 'solid'],
  Brentford: ['#e30613', '#ffffff', 'stripes'],
  'Crystal Palace': ['#1b458f', '#c4122e', 'stripes'],
  'Brighton & Hove Albion': ['#0057b8', '#ffffff', 'stripes'],
  Fulham: ['#ffffff', '#000000', 'solid'],
  'AFC Bournemouth': ['#da291c', '#000000', 'stripes'],
  Burnley: ['#6c1d45', '#99d6ea', 'solid'],
  'Real Madrid': ['#ffffff', '#febe10', 'solid'],
  'FC Barcelona': ['#a50044', '#004d98', 'stripes'],
  'Atlético Madrid': ['#cb3524', '#ffffff', 'stripes'],
  'Athletic Club': ['#ee2523', '#ffffff', 'stripes'],
  'Sevilla FC': ['#ffffff', '#d81920', 'solid'],
  'Real Betis': ['#00954c', '#ffffff', 'stripes'],
  'Valencia CF': ['#ffffff', '#f18e00', 'solid'],
  'Villarreal CF': ['#ffe667', '#005187', 'solid'],
  'Real Sociedad': ['#0067b1', '#ffffff', 'stripes'],
  'Bayern Munich': ['#dc052d', '#0066b2', 'solid'],
  'Borussia Dortmund': ['#fde100', '#000000', 'solid'],
  'RB Leipzig': ['#ffffff', '#dd0741', 'solid'],
  'Bayer 04 Leverkusen': ['#e32219', '#000000', 'halves'],
  'Eintracht Frankfurt': ['#e1000f', '#000000', 'halves'],
  'VfB Stuttgart': ['#ffffff', '#e32219', 'solid'],
  'Borussia Mönchengladbach': ['#ffffff', '#000000', 'solid'],
  'Hamburger SV': ['#ffffff', '#0e4c92', 'solid'],
  'Juventus FC': ['#ffffff', '#000000', 'stripes'],
  'Inter Milan': ['#0068a8', '#000000', 'stripes'],
  'AC Milan': ['#fb090b', '#000000', 'stripes'],
  'SSC Napoli': ['#12a0d7', '#ffffff', 'solid'],
  'AS Roma': ['#8e1f2f', '#f0bc42', 'solid'],
  'SS Lazio': ['#87d8f7', '#ffffff', 'solid'],
  'ACF Fiorentina': ['#592c82', '#ffffff', 'solid'],
  'Atalanta BC': ['#1d71b8', '#000000', 'stripes'],
  'Paris Saint-Germain': ['#004170', '#da291c', 'sash'],
  'Olympique de Marseille': ['#ffffff', '#2faee0', 'solid'],
  'Olympique Lyonnais': ['#ffffff', '#1b3282', 'solid'],
  'AS Monaco': ['#e63329', '#ffffff', 'halves'],
  'LOSC Lille': ['#e01e13', '#01337d', 'solid'],
  'Stade Rennais': ['#e23d33', '#000000', 'stripes'],
  'OGC Nice': ['#ed1c24', '#000000', 'halves'],
};

/** Kit palettes the generator draws from: plausible football colours only. */
const PALETTE: [string, string][] = [
  ['#c8102e', '#ffffff'], ['#003c71', '#ffffff'], ['#004d2c', '#ffffff'], ['#5b2b82', '#f5c518'],
  ['#1d428a', '#e4002b'], ['#f2a900', '#1a1a1a'], ['#7a263a', '#f0bc42'], ['#00843d', '#ffe600'],
  ['#0b1f3a', '#9fb8d8'], ['#8b1a1a', '#e8d8b0'], ['#006d75', '#ffffff'], ['#b8332a', '#1c1c1c'],
  ['#2b4b8c', '#f4f4f4'], ['#154734', '#c5a572'], ['#a3132b', '#0e2240'], ['#e35205', '#1a1a1a'],
];
const PATTERNS: Pattern[] = ['solid', 'stripes', 'halves', 'hoops', 'sash', 'solid', 'stripes', 'solid'];

export function identity(name: string): Identity {
  const known = KNOWN[name];
  if (known) return { primary: known[0], secondary: known[1], pattern: known[2], ink: inkOn(known[0]) };
  const h = hash(name);
  const [primary, secondary] = PALETTE[h % PALETTE.length];
  return { primary, secondary, pattern: PATTERNS[(h >>> 8) % PATTERNS.length], ink: inkOn(primary) };
}

/** Up to three letters for the crest face. */
export function initials(short: string, name: string): string {
  const s = (short || name).replace(/[^A-Za-z0-9]/g, '');
  return (s.slice(0, 3) || 'FC').toUpperCase();
}

/* ---------- flags ---------- */

type Overlay = 'cross' | 'nordic' | 'saltire' | 'disc' | 'star' | 'triangle' | 'canton';
export interface FlagSpec { d: 'v' | 'h'; c: string[]; w?: number[]; o?: Overlay; oc?: string }

const W = '#ffffff', K = '#111111', R = '#d52b1e', B = '#003da5', G = '#009639', Y = '#fcd116', O = '#ff7900';

export const FLAGS: Record<string, FlagSpec> = {
  ENG: { d: 'h', c: [W], o: 'cross', oc: '#ce1124' },
  SCO: { d: 'h', c: ['#0065bf'], o: 'saltire', oc: W },
  IRL: { d: 'v', c: [G, W, O] },
  ESP: { d: 'h', c: [R, Y, R], w: [1, 2, 1] },
  FRA: { d: 'v', c: ['#002395', W, '#ed2939'] },
  GER: { d: 'h', c: [K, '#dd0000', '#ffce00'] },
  ITA: { d: 'v', c: ['#008c45', W, '#cd212a'] },
  POR: { d: 'v', c: ['#046a38', '#da291c'], w: [2, 3], o: 'disc', oc: '#ffe000' },
  NED: { d: 'h', c: ['#ae1c28', W, '#21468b'] },
  BEL: { d: 'v', c: [K, '#fdda24', '#ef3340'] },
  BRA: { d: 'h', c: ['#009c3b'], o: 'disc', oc: '#ffdf00' },
  ARG: { d: 'h', c: ['#75aadb', W, '#75aadb'], o: 'disc', oc: '#fcbf49' },
  URU: { d: 'h', c: [W, '#0038a8', W], o: 'canton', oc: '#fcd116' },
  COL: { d: 'h', c: [Y, B, R], w: [2, 1, 1] },
  ECU: { d: 'h', c: [Y, B, R], w: [2, 1, 1], o: 'disc', oc: '#ed1c24' },
  MEX: { d: 'v', c: ['#006847', W, '#ce1126'] },
  USA: { d: 'h', c: [R, W, R, W, R, W], o: 'canton', oc: '#3c3b6e' },
  CRO: { d: 'h', c: [R, W, '#171796'] },
  CZE: { d: 'h', c: [W, '#d7141a'], o: 'triangle', oc: '#11457e' },
  POL: { d: 'h', c: [W, '#dc143c'] },
  AUT: { d: 'h', c: ['#ed2939', W, '#ed2939'] },
  SUI: { d: 'h', c: ['#d52b1e'], o: 'cross', oc: W },
  SWE: { d: 'h', c: ['#006aa7'], o: 'nordic', oc: '#fecc00' },
  NOR: { d: 'h', c: ['#ba0c2f'], o: 'nordic', oc: W },
  DEN: { d: 'h', c: ['#c8102e'], o: 'nordic', oc: W },
  GRE: { d: 'h', c: ['#0d5eaf', W, '#0d5eaf', W, '#0d5eaf'], o: 'canton', oc: '#0d5eaf' },
  TUR: { d: 'h', c: ['#e30a17'], o: 'disc', oc: W },
  UKR: { d: 'h', c: ['#0057b7', '#ffd700'] },
  SRB: { d: 'h', c: ['#c6363c', '#0c4076', W] },
  SEN: { d: 'v', c: [G, Y, R], o: 'star', oc: G },
  CIV: { d: 'v', c: ['#f77f00', W, G] },
  CMR: { d: 'v', c: [G, R, Y], o: 'star', oc: Y },
  GHA: { d: 'h', c: [R, Y, G], o: 'star', oc: K },
  MLI: { d: 'v', c: [G, Y, R] },
  NGA: { d: 'v', c: ['#008751', W, '#008751'] },
  MAR: { d: 'h', c: ['#c1272d'], o: 'star', oc: '#006233' },
  ALG: { d: 'v', c: ['#006233', W], o: 'disc', oc: '#d21034' },
  JPN: { d: 'h', c: [W], o: 'disc', oc: '#bc002d' },
  KOR: { d: 'h', c: [W], o: 'disc', oc: '#cd2e3a' },
  CUS: { d: 'h', c: ['#5b6862', '#d7ddd6'] },
};

export const nationName: Record<string, string> = {
  ENG: 'England', SCO: 'Scotland', IRL: 'Ireland', ESP: 'Spain', FRA: 'France', GER: 'Germany', ITA: 'Italy',
  POR: 'Portugal', NED: 'Netherlands', BEL: 'Belgium', BRA: 'Brazil', ARG: 'Argentina', URU: 'Uruguay',
  COL: 'Colombia', ECU: 'Ecuador', MEX: 'Mexico', USA: 'United States', CRO: 'Croatia', CZE: 'Czechia',
  POL: 'Poland', AUT: 'Austria', SUI: 'Switzerland', SWE: 'Sweden', NOR: 'Norway', DEN: 'Denmark',
  GRE: 'Greece', TUR: 'Türkiye', UKR: 'Ukraine', SRB: 'Serbia', SEN: 'Senegal', CIV: "Côte d'Ivoire",
  CMR: 'Cameroon', GHA: 'Ghana', MLI: 'Mali', NGA: 'Nigeria', MAR: 'Morocco', ALG: 'Algeria',
  JPN: 'Japan', KOR: 'South Korea', CUS: 'Fiction',
};
