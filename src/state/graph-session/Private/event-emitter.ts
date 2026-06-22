// @Architecture(descriptionShort="Lightweight publish-subscribe event emitter for session updates")
type Listener = () => void;

export class EventEmitter {
  private listeners: Map<string, Listener[]> = new Map();

  on(event: string, listener: Listener) {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  once(event: string, listener: Listener) {
    const wrapper = () => {
      this.off(event, wrapper);
      listener();
    };
    this.on(event, wrapper);
  }

  off(event: string, listener: Listener) {
    const list = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      list.filter((l) => l !== listener),
    );
  }

  emit(event: string) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener();
    }
  }
}
