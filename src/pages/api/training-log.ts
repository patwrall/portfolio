import type { APIRoute } from 'astro';

export const prerender = false;

const PRIVATE_HOST = 'private.patrickwrall.com';

export interface SessionEntry {
  done?: boolean;
  miles?: number | null;
  minutes?: number | null;
  rpe?: number | null;
  note?: string;
}

export interface PstEntry {
  pullups?: number | null;
  pushups?: number | null;
  situps?: number | null;
}

export interface TrainingLog {
  sessions: Record<string, SessionEntry>;
  /** ISO date -> bodyweight in lb. Daily; the chart does the smoothing. */
  weights: Record<string, number>;
  /** ISO date -> PST max reps. */
  pst: Record<string, PstEntry>;
  updatedAt?: string;
}

const EMPTY: TrainingLog = { sessions: {}, weights: {}, pst: {} };

/**
 * Guard every request. Access protects private.patrickwrall.com, but the worker
 * also answers on the apex and on portfolio.patrickwrall.workers.dev, and
 * neither of those sits behind an Access policy. Without this the log would be
 * readable and writable by anyone who found the workers.dev URL.
 */
function allowed(request: Request): boolean {
  const host = request.headers.get('host')?.split(':')[0] ?? '';
  return host === PRIVATE_HOST || host === 'localhost' || host === '127.0.0.1';
}

/** Access stamps the authenticated identity on every request it forwards. */
function keyFor(request: Request): string {
  const email = request.headers.get('cf-access-authenticated-user-email');
  return `log:${email ?? 'local-dev'}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function kvFrom(locals: App.Locals): KVNamespace | undefined {
  return (locals as any)?.runtime?.env?.TRAINING_LOG;
}

export const GET: APIRoute = async ({ request, locals }) => {
  if (!allowed(request)) return new Response('Not found', { status: 404 });

  const kv = kvFrom(locals);
  if (!kv) return json(EMPTY);

  const raw = await kv.get(keyFor(request));
  return json(raw ? JSON.parse(raw) : EMPTY);
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!allowed(request)) return new Response('Not found', { status: 404 });

  const kv = kvFrom(locals);
  if (!kv) return json({ error: 'No storage bound' }, 503);

  let patch: Partial<TrainingLog>;
  try {
    patch = await request.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  const key = keyFor(request);
  const existing: TrainingLog = JSON.parse((await kv.get(key)) ?? JSON.stringify(EMPTY));

  // Shallow-merge each bucket so a partial write never drops the other two.
  const merged: TrainingLog = {
    sessions: { ...existing.sessions, ...(patch.sessions ?? {}) },
    weights: { ...existing.weights, ...(patch.weights ?? {}) },
    pst: { ...existing.pst, ...(patch.pst ?? {}) },
    updatedAt: new Date().toISOString(),
  };

  // A null value means "delete this entry" — lets the UI clear a bad weigh-in.
  for (const bucket of ['sessions', 'weights', 'pst'] as const) {
    for (const [k, v] of Object.entries(merged[bucket])) {
      if (v === null) delete (merged[bucket] as Record<string, unknown>)[k];
    }
  }

  await kv.put(key, JSON.stringify(merged));
  return json(merged);
};
