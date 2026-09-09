import { ENG } from './eng.js';
import { ESP } from './esp.js';
import { GER } from './ger.js';
import { ITA } from './ita.js';
import { FRA } from './fra.js';
import type { NationData } from './types.js';

export const REAL_WORLD: Record<string, NationData> = { ENG, ESP, GER, ITA, FRA };
export * from './types.js';
