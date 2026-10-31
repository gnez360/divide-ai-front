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

/** Registra o SW com atualização automática silenciosa (WEB-38). */
function UseSwUpdate() {
  useRegisterSW({ immediate: true });
  return null;
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
  UseSwUpdate();
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
    </>
  );
}
