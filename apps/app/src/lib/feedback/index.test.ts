/**
 * Test feedback beta (S9-2): flag beta, coda senza endpoint, invio con
 * endpoint (incluso svuotamento coda), resilienza errori.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class LocalStorageStub {
  private map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

async function freshModule(): Promise<typeof import('./index.js')> {
  vi.resetModules();
  return import('./index.js');
}

describe('feedback (S9-2)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new LocalStorageStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('isBetaBuild: true solo con PUBLIC_BETA=true', async () => {
    const off = await freshModule();
    expect(off.isBetaBuild()).toBe(false);
    vi.stubEnv('PUBLIC_BETA', 'true');
    const on = await freshModule();
    expect(on.isBetaBuild()).toBe(true);
  });

  it('senza endpoint: accoda e ritorna queued', async () => {
    const { sendFeedback, queueSize } = await freshModule();
    const r = await sendFeedback('il tasto alba è lento');
    expect(r).toBe('queued');
    expect(queueSize()).toBe(1);
    await sendFeedback('altro feedback');
    expect(queueSize()).toBe(2);
  });

  it('con endpoint: POST con la coda completa, poi svuota', async () => {
    // fase 1: senza endpoint → 'vecchio' finisce in coda
    const m0 = await freshModule();
    await m0.sendFeedback('vecchio');
    // fase 2: arriva l'endpoint → l'invio successivo porta tutta la coda
    vi.stubEnv('PUBLIC_FEEDBACK_ENDPOINT', 'https://example.test/feedback');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.resetModules();
    const m1 = await import('./index.js');
    const r = await m1.sendFeedback('nuovo');
    expect(r).toBe('sent');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/feedback');
    const body = JSON.parse(String(init.body)) as { text: string }[];
    expect(body.map((e) => e.text)).toEqual(['vecchio', 'nuovo']);
    expect(m1.queueSize()).toBe(0);
  });

  it('endpoint che risponde 500: accoda e ritorna queued (mai throw)', async () => {
    vi.stubEnv('PUBLIC_FEEDBACK_ENDPOINT', 'https://example.test/feedback');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 500 })));
    const { sendFeedback, queueSize } = await freshModule();
    const r = await sendFeedback('test');
    expect(r).toBe('queued');
    expect(queueSize()).toBe(1);
  });

  it('fetch che lancia: accoda senza rompere', async () => {
    vi.stubEnv('PUBLIC_FEEDBACK_ENDPOINT', 'https://example.test/feedback');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { sendFeedback, queueSize } = await freshModule();
    const r = await sendFeedback('test');
    expect(r).toBe('queued');
    expect(queueSize()).toBe(1);
  });

  it('storage non disponibile: nessun throw, ritorna comunque sent/queued', async () => {
    class ThrowingStorage {
      getItem(): string | null {
        throw new Error('denied');
      }
      setItem(): void {
        throw new Error('denied');
      }
      removeItem(): void {
        throw new Error('denied');
      }
    }
    vi.stubGlobal('localStorage', new ThrowingStorage());
    const { sendFeedback } = await freshModule();
    await expect(sendFeedback('test')).resolves.toBe('queued');
  });
});
