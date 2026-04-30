import type {SandboxEvent} from '../db/events';

type Listener = (event: SandboxEvent) => void;

const listenersBySandbox = new Map<string, Set<Listener>>();

export function publishEvent(event: SandboxEvent): void {
  const listeners = listenersBySandbox.get(event.sandboxId);
  if (!listeners) return;
  for (const listener of listeners) listener(event);
}

export function subscribeToSandboxEvents(sandboxId: string, listener: Listener): () => void {
  const listeners = listenersBySandbox.get(sandboxId) ?? new Set<Listener>();
  listeners.add(listener);
  listenersBySandbox.set(sandboxId, listeners);

  return () => {
    const set = listenersBySandbox.get(sandboxId);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) listenersBySandbox.delete(sandboxId);
  };
}

