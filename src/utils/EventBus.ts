/**
 * EventBus - Lightweight pub/sub for loose coupling between modules
 */
export type EventMap = {
  'stageA': void;
  'stageB': void;
  'stageC': void;
  'stageD': void;
  'entranceComplete': void;
  'idleStart': void;
  'idleEnd': void;
  'curiosityStart': { x: number; y: number };
  'curiosityEnd': void;
  'nightShift': number;
  'audioIntensity': number;
  'resize': { width: number; height: number };
  'visibilityChange': boolean;
  'flowerMove': { x: number; y: number };
};

export class EventBus {
  #listeners: Partial<Record<keyof EventMap, Set<(payload: any) => void>>> = {};

  on<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void): () => void {
    if (!this.#listeners[event]) this.#listeners[event] = new Set();
    this.#listeners[event]!.add(callback);
    return () => this.#listeners[event]!.delete(callback);
  }

  off<K extends keyof EventMap>(event: K, callback: (payload: EventMap[K]) => void) {
    this.#listeners[event]?.delete(callback);
  }

  emit<K extends keyof EventMap>(event: K, payload?: EventMap[K]) {
    this.#listeners[event]?.forEach(cb => {
      try { cb(payload); } catch (e) { console.error(`EventBus error on ${String(event)}:`, e); }
    });
  }

  dispose() {
    this.#listeners = {};
  }
}
