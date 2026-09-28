import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Backend, Snapshot } from './mock';

const BackendContext = createContext<Backend | null>(null);

/**
 * Makes the backend available to the app and waits for persisted state to
 * load before rendering children (shows `fallback` meanwhile).
 */
export function BackendProvider({ backend, children, fallback = null }: { backend: Backend; children: ReactNode; fallback?: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    backend.init().then(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [backend]);
  return <BackendContext.Provider value={backend}>{ready ? children : fallback}</BackendContext.Provider>;
}

export function useBackend(): Backend {
  const b = useContext(BackendContext);
  if (!b) throw new Error('useBackend must be used within BackendProvider');
  return b;
}

/** Live snapshot of the mock database + session; re-renders on every change. */
export function useSnapshot(): Snapshot {
  const backend = useBackend();
  return useSyncExternalStore(backend.subscribe, backend.getSnapshot, backend.getSnapshot);
}

export function useDb() {
  return useSnapshot().db;
}

export function useSession() {
  return useSnapshot().session;
}

/** Tracks an async action's pending/error state for buttons and forms. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (...args: A): Promise<R | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      return undefined;
    } finally {
      setPending(false);
    }
  };
  return { run, pending, error, setError };
}
