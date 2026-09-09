export const money = (k: number): string => {
  const sign = k < 0 ? '-' : '';
  const v = Math.abs(k);
  return v >= 1000 ? `${sign}£${(v / 1000).toFixed(1)}m` : `${sign}£${Math.round(v)}k`;
};
export const wage = (k: number): string => `£${Math.round(k)}k/wk`;
export const pct = (x: number): string => `${x.toFixed(0)}%`;
