import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ui } from '@cj/contracts';
import type { BillResponse } from './api';
import { api } from './api';
import { BillProvider, useBill } from './state';
import { Screen } from './ui';
import Home from './screens/Home';
import Join from './screens/Join';
import Capture from './screens/Capture';
import Review from './screens/Review';
import Invite from './screens/Invite';
import Account, { AccountIndex } from './screens/Account';
import Items from './screens/Items';
import People from './screens/People';
import MyShare from './screens/MyShare';
import Final from './screens/Final';

/** Banner "Nova versão disponível" com [Atualizar] (WEB-38). */
function UpdateBanner() {
  const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });
  const [refresh, setRefresh] = needRefresh;
  if (!refresh) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-sky-500/40 bg-slate-900/95 p-3 backdrop-blur"
      role="status"
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <span className="text-sm text-slate-200">{ui.shell.updateAvailable}</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void updateServiceWorker()}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            {ui.shell.updateNow}
          </button>
          <button
            type="button"
            onClick={() => setRefresh(false)}
            className="rounded-lg px-3 py-2 text-sm text-slate-400"
          >
            {ui.shell.updateLater}
          </button>
        </div>
      </div>
    </div>
  );
}

function BillGate({ children }: { children: React.ReactNode }) {
  const { id = '' } = useParams();
  const [state, setState] = useState<{ data: BillResponse } | { error: string } | null>(null);

  useEffect(() => {
    let alive = true;
    setState(null);
    api
      .getBill(id)
      .then((data) => alive && setState({ data }))
      .catch((e: { status?: number; message?: string }) => {
        if (!alive) return;
        setState({
          error: e.status === 401 ? ui.shell.sessionExpired : ui.shell.billNotFound,
        });
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400" role="status">
        {ui.shell.loading}
      </div>
    );
  }
  if ('error' in state) {
    return (
      <Screen title={ui.shell.appTitle} back="/">
        <p className="text-sm text-slate-400">{state.error}</p>
      </Screen>
    );
  }
  return (
    <BillProvider billId={id} initial={state.data}>
      {children}
    </BillProvider>
  );
}

/** Redireciona conforme o estado da conta (§6). */
function StatusGate() {
  const { snapshot } = useBill();
  const s = snapshot.document.status;
  if (s === 'DRAFT' || s === 'OCR_PROCESSING' || s === 'OCR_FAILED')
    return <Navigate to="capture" replace />;
  if (s === 'RECEIPT_REVIEW') return <Navigate to="revisar" replace />;
  return <AccountIndex />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Join />} />
        <Route
          path="/conta/:id"
          element={
            <BillGate>
              <Account />
            </BillGate>
          }
        >
          <Route index element={<StatusGate />} />
          <Route path="capture" element={<Capture />} />
          <Route path="revisar" element={<Review />} />
          <Route path="convidar" element={<Invite />} />
          <Route path="itens" element={<Items />} />
          <Route path="pessoas" element={<People />} />
          <Route path="minha-parte" element={<MyShare />} />
          <Route path="final" element={<Final />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdateBanner />
    </>
  );
}
