/** Real-world dataset shapes. Ratings are editorial estimates on a 1-99 scale. */
export interface ClubData {
  name: string;
  short: string;
  city: string;
  /** Stadium capacity. */
  capacity: number;
  /** 1-100 standing in world football. */
  reputation: number;
  /** "Name,POS,age,overall,NAT" rows; overall 1-99, NAT is a three-letter code. */
  players?: string[];
}

export interface NationData {
  id: string;
  /** Clubs by tier, top tier first. Lengths must match NATIONS[id].tiers. */
  tiers: ClubData[][];
}

export interface PlayerRow { name: string; pos: 'GK' | 'DF' | 'MF' | 'FW'; age: number; overall: number; nat: string }

export function parsePlayer(row: string): PlayerRow {
  const [name, pos, age, overall, nat] = row.split(',').map((s) => s.trim());
  return { name, pos: pos as PlayerRow['pos'], age: Number(age), overall: Number(overall), nat: nat || 'UNK' };
}
