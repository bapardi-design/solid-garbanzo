/**
 * Drawn identity: every crest, flag and logo in the app is inline SVG built
 * from `brand.ts`, so nothing is fetched, everything is crisp at any size and
 * the whole set stays a few kilobytes.
 */
import { FLAGS, identity, initials, luminance, nationName, shade, type FlagSpec } from './brand';

const SHIELD = 'M3 3 H37 V25 C37 34.5 30 40.5 20 43 C10 40.5 3 34.5 3 25 Z';
const SIZES = { xs: 18, s: 22, m: 28, l: 44, xl: 72 } as const;
export type MarkSize = keyof typeof SIZES;

function Pattern({ pattern, colour }: { pattern: string; colour: string }) {
  switch (pattern) {
    case 'stripes':
      return <g fill={colour}>{[6, 14, 22, 30].map((x) => <rect key={x} x={x} y={0} width={4} height={46} />)}</g>;
    case 'hoops':
      return <g fill={colour}><rect x={0} y={9} width={40} height={6} /><rect x={0} y={21} width={40} height={6} /><rect x={0} y={33} width={40} height={6} /></g>;
    case 'halves':
      return <rect x={20} y={0} width={20} height={46} fill={colour} />;
    case 'sash':
      return <path d="M-6 34 L30 -6 L40 2 L4 42 Z" fill={colour} />;
    default:
      return null;
  }
}

/** A club crest: kit colours, a pattern and the club's letters on a band. */
export function Crest({ name, short, size = 'm', title }: { name: string; short?: string; size?: MarkSize; title?: string }) {
  const px = SIZES[size];
  const id = identity(name);
  const letters = initials(short ?? '', name);
  const dark = luminance(id.primary) <= luminance(id.secondary) ? id.primary : id.secondary;
  const band = luminance(dark) > 0.5 ? '#1b2420' : shade(dark, -0.12);
  const clip = `cr-${name.replace(/[^a-z0-9]/gi, '')}`;
  const small = px <= 22;
  return (
    <svg className="crest" viewBox="0 0 40 46" width={px} height={px * (46 / 40)} role={title ? 'img' : 'presentation'} aria-label={title} focusable="false">
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={clip}><path d={SHIELD} /></clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={0} y={0} width={40} height={46} fill={id.primary} />
        <Pattern pattern={id.pattern} colour={id.secondary} />
        <path d="M3 3 H37 V12 C28 16 12 16 3 12 Z" fill="#ffffff" opacity={0.12} />
        <rect x={0} y={small ? 15 : 17} width={40} height={small ? 16 : 14} fill={band} />
        <text x={20} y={small ? 26.5 : 27.4} textAnchor="middle" fill="#ffffff" fontSize={small ? 13 : 11.5} fontWeight={700} letterSpacing={small ? 0 : 0.4} className="crest-text">{letters}</text>
      </g>
      <path d={SHIELD} fill="none" stroke={shade(band, -0.1)} strokeWidth={2.4} />
    </svg>
  );
}

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function Bands({ spec }: { spec: FlagSpec }) {
  const total = (spec.w ?? spec.c.map(() => 1)).reduce((a, b) => a + b, 0);
  const size = spec.d === 'v' ? 12 : 8;
  let at = 0;
  return (
    <>
      {spec.c.map((colour, i) => {
        const w = ((spec.w?.[i] ?? 1) / total) * size;
        const x = at;
        at += w;
        return spec.d === 'v'
          ? <rect key={i} x={x} y={0} width={w + 0.02} height={8} fill={colour} />
          : <rect key={i} x={0} y={x} width={12} height={w + 0.02} fill={colour} />;
      })}
    </>
  );
}

/** A nation flag, drawn from its spec; unknown codes fall back to a chip. */
export function Flag({ nat, size = 14, title }: { nat: string; size?: number; title?: string }) {
  const spec = FLAGS[nat];
  const label = title ?? nationName[nat] ?? nat;
  if (!spec) return <span className="flag" title={label}>{nat}</span>;
  const o = spec.o;
  const oc = spec.oc ?? '#ffffff';
  return (
    <svg className="flag-svg" viewBox="0 0 12 8" width={size * 1.5} height={size} role="img" aria-label={label} focusable="false">
      <title>{label}</title>
      <g clipPath="url(#flag-clip)">
        <Bands spec={spec} />
        {o === 'cross' ? <g fill={oc}><rect x={4.7} y={0} width={1.6} height={8} /><rect x={0} y={3.2} width={12} height={1.6} /></g> : null}
        {o === 'nordic' ? <g fill={oc}><rect x={3.1} y={0} width={1.5} height={8} /><rect x={0} y={3.25} width={12} height={1.5} /></g> : null}
        {o === 'saltire' ? <g stroke={oc} strokeWidth={1.5}><line x1={0} y1={0} x2={12} y2={8} /><line x1={12} y1={0} x2={0} y2={8} /></g> : null}
        {o === 'disc' ? <circle cx={6} cy={4} r={1.9} fill={oc} /> : null}
        {o === 'star' ? <polygon points={star(6, 4, 2.1)} fill={oc} /> : null}
        {o === 'triangle' ? <polygon points="0,0 5,4 0,8" fill={oc} /> : null}
        {o === 'canton' ? <rect x={0} y={0} width={5} height={3.4} fill={oc} /> : null}
      </g>
      <rect x={0.25} y={0.25} width={11.5} height={7.5} rx={0.8} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={0.5} />
    </svg>
  );
}

/** One clip path shared by every flag on the page. */
export function FlagDefs() {
  return (
    <svg width={0} height={0} aria-hidden="true" style={{ position: 'absolute' }}>
      <defs><clipPath id="flag-clip"><rect x={0} y={0} width={12} height={8} rx={0.9} /></clipPath></defs>
    </svg>
  );
}

/** The Touchline mark: a touchline, a corner arc and the ball. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="mark" role="img" aria-label="Touchline" focusable="false">
      <rect x={0} y={0} width={32} height={32} rx={7} fill="var(--accent)" />
      <path d="M7 4 V27 H27" fill="none" stroke="var(--accent-ink)" strokeWidth={2.6} strokeLinecap="square" />
      <path d="M7 19 A8 8 0 0 0 15 27" fill="none" stroke="var(--accent-ink)" strokeWidth={1.5} opacity={0.6} />
      <circle cx={22} cy={11} r={3.1} fill="var(--accent-ink)" />
    </svg>
  );
}

/** Mark plus wordmark for the site header. */
export function Logo({ tagline = true }: { tagline?: boolean }) {
  return (
    <span className="logo">
      <Mark />
      <span className="logo-type">
        Touchline
        {tagline ? <small>Football Manager</small> : null}
      </span>
    </span>
  );
}
