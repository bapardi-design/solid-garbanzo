'use client';
/**
 * Careers as files. A save is a few megabytes of JSON, so it is gzipped on the
 * way out and unzipped on the way in — a career comes down to a few hundred
 * kilobytes, small enough to send to someone.
 */
import type { CareerRecord } from './store';

const MAGIC = 'touchline-career';
const VERSION = 1;

interface Envelope {
  format: typeof MAGIC;
  version: number;
  exportedAt: string;
  record: CareerRecord;
}

/** A career as a file the browser can save. */
export async function exportCareer(record: CareerRecord): Promise<Blob> {
  const envelope: Envelope = { format: MAGIC, version: VERSION, exportedAt: new Date().toISOString(), record };
  const json = JSON.stringify(envelope);
  if (typeof CompressionStream === 'undefined') return new Blob([json], { type: 'application/json' });
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

/** What to call the file. */
export function exportFilename(record: CareerRecord): string {
  const club = record.clubName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${club || 'career'}-season-${record.season}.touchline`;
}

/** Reads a file written by `exportCareer`, gzipped or not. */
export async function importCareer(file: File): Promise<CareerRecord> {
  const text = await readText(file);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not a Touchline career.');
  }
  const envelope = parsed as Partial<Envelope>;
  if (!envelope || envelope.format !== MAGIC) throw new Error('That file is not a Touchline career.');
  if (typeof envelope.version !== 'number' || envelope.version > VERSION) {
    throw new Error('That career was saved by a newer version of Touchline.');
  }
  const record = envelope.record;
  if (!record?.snapshot?.world || !record.clubId) throw new Error('That career file is incomplete.');
  return record;
}

async function readText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const gzipped = new Uint8Array(buffer.slice(0, 2));
  if (gzipped[0] === 0x1f && gzipped[1] === 0x8b && typeof DecompressionStream !== 'undefined') {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }
  return new TextDecoder().decode(buffer);
}
