/**
 * Generic ObjectPool to prevent GC pressure
 */
export class ObjectPool<T> {
  #pool: T[] = [];
  #active: T[] = [];
  #factory: () => T;
  #reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void, initialSize = 100) {
    this.#factory = factory;
    this.#reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.#pool.push(factory());
    }
  }

  acquire(): T {
    const item = this.#pool.pop() ?? this.#factory();
    this.#reset(item);
    this.#active.push(item);
    return item;
  }

  release(item: T) {
    const idx = this.#active.indexOf(item);
    if (idx >= 0) {
      this.#active.splice(idx, 1);
      this.#pool.push(item);
    }
  }

  getActive(): readonly T[] { return this.#active; }
  activeCount() { return this.#active.length; }
  clearActive() {
    this.#active.length = 0;
  }

  dispose() {
    this.#pool.length = 0;
    this.#active.length = 0;
  }
}
