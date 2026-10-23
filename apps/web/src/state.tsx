import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BillSnapshot } from '@cj/contracts';
import { api, uuid, type Me } from './api';

interface BillState {
  billId: string;
  me: Me;
  snapshot: BillSnapshot;
  connected: boolean;
  editing: { participantId: string; itemId: string | null } | null;
}

interface BillApi extends BillState {
  send: (command: Record<string, unknown>, expected?: Record<string, unknown>) => Promise<void>;
  setSnapshot: (s: BillSnapshot) => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<BillApi | null>(null);

export function useBill(): BillApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBill fora do BillProvider');
  return v;
}

export function BillProvider({
  billId,
  initial,
  children,
}: {
  billId: string;
  initial: { me: Me; snapshot: BillSnapshot };
  children: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(initial.snapshot);
  const [me, setMe] = useState(initial.me);
  const [connected, setConnected] = useState(false);
  const [editing, setEditing] = useState<BillState['editing']>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const reload = useCallback(async () => {
    const r = await api.getBill(billId);
    setSnapshot(r.snapshot);
    setMe(r.me);
  }, [billId]);

  // SSE (§8) — reconecta em queda; EventSource envia o cookie same-origin
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;

    const connect = () => {
      es = new EventSource(`/api/bills/${billId}/events`);
      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!closed) retry = setTimeout(connect, 2000);
      };
      es.addEventListener('hello', () => {
        setConnected(true);
        void api
          .getBill(billId)
          .then((r) => setSnapshot(r.snapshot))
          .catch(() => {});
      });
      es.addEventListener('bill', (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { snapshot?: BillSnapshot };
          if (data.snapshot) setSnapshot(data.snapshot);
        } catch {
          /* payload malformado: ignora */
        }
      });
      es.addEventListener('presence', (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as {
            presence?: Record<string, 'online' | 'offline' | 'recent'>;
          };
          if (data.presence) setSnapshot((s) => ({ ...s, presence: data.presence! }));
        } catch {
          /* ignora */
        }
      });
      es.addEventListener('editing', (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { editing?: BillState['editing'] };
          setEditing(data.editing ?? null);
        } catch {
          /* ignora */
        }
      });
      es.addEventListener('session', (ev) => {
        try {
          const data = JSON.parse((ev as MessageEvent).data) as { code?: string };
          if (data.code === 'ACCESS_TRANSFERRED') window.location.href = '/?transferida=1';
        } catch {
          /* ignora */
        }
      });
      es.addEventListener('deleted', () => {
        closed = true;
        window.location.href = '/?excluida=1';
      });
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
    };
  }, [billId]);

  const send = useCallback(
    async (command: Record<string, unknown>, expected?: Record<string, unknown>) => {
      const out = await api.send(billId, uuid(), command, expected);
      setSnapshot(out.snapshot);
    },
    [billId],
  );

  const value = useMemo<BillApi>(
    () => ({ billId, me, snapshot, connected, editing, send, setSnapshot, reload }),
    [billId, me, snapshot, connected, editing, send, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
