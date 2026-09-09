export const money = (k: number, cur = '£'): string => {
  const sign = k < 0 ? '-' : '';
  const v = Math.abs(k);
  if (v >= 1000000) return `${sign}${cur}${(v / 1000000).toFixed(1)}bn`;
  if (v >= 100000) return `${sign}${cur}${(v / 1000).toFixed(0)}m`;
  if (v >= 1000) return `${sign}${cur}${(v / 1000).toFixed(1)}m`;
  return `${sign}${cur}${Math.round(v)}k`;
};
export const wage = (k: number, cur = '£'): string => (k >= 1000 ? `${cur}${(k / 1000).toFixed(2)}m/wk` : `${cur}${Math.round(k)}k/wk`);
export const pct = (x: number): string => `${x.toFixed(0)}%`;
export const ord = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
/** Day-of-season to a calendar-like label: "Sat, week 12". */
export const dayLabel = (seasonDay: number): string => {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return `${names[seasonDay % 7]} wk ${Math.floor(seasonDay / 7) + 1}`;
};
export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;
