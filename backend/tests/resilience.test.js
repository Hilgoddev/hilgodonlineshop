const { withTimeout, makeCache, singleFlight } = require('../src/lib/resilience');

describe('withTimeout', () => {
  it('resolves when the run function resolves in time', async () => {
    const result = await withTimeout(() => Promise.resolve('ok'), 50);
    expect(result).toBe('ok');
  });

  it('rejects when the run function exceeds the timeout', async () => {
    await expect(
      withTimeout(() => new Promise((r) => setTimeout(() => r('late'), 100)), 20)
    ).rejects.toThrow(/timed out/);
  });

  it('passes an AbortSignal to the run function', async () => {
    let received;
    await withTimeout((signal) => { received = signal; return Promise.resolve(1); }, 50);
    expect(received).toBeInstanceOf(AbortSignal);
  });

  it('aborts the signal on timeout', async () => {
    let signal;
    await expect(
      withTimeout((s) => { signal = s; return new Promise((r) => setTimeout(r, 100)); }, 20)
    ).rejects.toThrow();
    expect(signal.aborted).toBe(true);
  });
});

describe('makeCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = makeCache({ ttlMs: 1000 });
    expect(cache.get('nope')).toBeUndefined();
  });

  it('returns a fresh entry within ttl', () => {
    const cache = makeCache({ ttlMs: 1000 });
    cache.set('k', 42);
    const hit = cache.get('k');
    expect(hit.value).toBe(42);
    expect(hit.fresh).toBe(true);
  });

  it('marks an entry stale after ttl but still returns the value', () => {
    const cache = makeCache({ ttlMs: -1 }); // already expired
    cache.set('k', 'v');
    const hit = cache.get('k');
    expect(hit.value).toBe('v');
    expect(hit.fresh).toBe(false);
  });
});

describe('singleFlight', () => {
  it('coalesces concurrent calls for the same key into one execution', async () => {
    const run = singleFlight();
    let calls = 0;
    const fn = () => { calls += 1; return new Promise((r) => setTimeout(() => r('done'), 20)); };
    const [a, b] = await Promise.all([run('key', fn), run('key', fn)]);
    expect(a).toBe('done');
    expect(b).toBe('done');
    expect(calls).toBe(1);
  });

  it('runs again after the in-flight promise settles', async () => {
    const run = singleFlight();
    let calls = 0;
    const fn = () => { calls += 1; return Promise.resolve('x'); };
    await run('key', fn);
    await run('key', fn);
    expect(calls).toBe(2);
  });
});
