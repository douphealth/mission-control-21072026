// Must be imported before Dexie so that Dexie sees a BroadcastChannel
// global at module-eval time. In Node.js SSR, BroadcastChannel only
// exists inside worker threads — not the main process — so Dexie crashes
// with "Cannot read properties of undefined (reading 'on')".
if (typeof globalThis.BroadcastChannel === "undefined") {
  class SimpleBroadcastChannel {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onmessageerror: ((ev: MessageEvent) => void) | null = null;
    constructor(public name: string) {}
    postMessage(_data: unknown): void {}
    close(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean {
      return false;
    }
  }
  (globalThis as any).BroadcastChannel = SimpleBroadcastChannel;
}
