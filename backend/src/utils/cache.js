class TTLCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlMs) {
    if (this.store.has(key)) clearTimeout(this.store.get(key).timer);
    const timer = setTimeout(() => this.store.delete(key), ttlMs);
    timer.unref();
    this.store.set(key, { value, timer });
  }

  get(key) {
    const entry = this.store.get(key);
    return entry ? entry.value : null;
  }

  del(key) {
    const entry = this.store.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      this.store.delete(key);
    }
  }

  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.del(key);
    }
  }

  clear() {
    for (const { timer } of this.store.values()) clearTimeout(timer);
    this.store.clear();
  }
}

module.exports = new TTLCache();
