import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ui } from '@cj/contracts';
import { derive } from '@cj/core';
import { api } from '../api';
import { useBill } from '../state';
import { Avatar, AVATAR_COLORS, Button } from '../ui';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: ui.account.statusDraft,
  OCR_PROCESSING: ui.account.statusOcrProcessing,
  OCR_FAILED: ui.account.statusOcrFailed,
  RECEIPT_REVIEW: ui.account.statusReceiptReview,
  OPEN: ui.account.statusOpen,
  CLOSED: ui.account.statusClosed,
};

export default function Account() {
  const { billId, snapshot, connected } = useBill();
  const status = snapshot.document.status;
  const inFlow =
    status === 'DRAFT' ||
    status === 'OCR_PROCESSING' ||
    status === 'OCR_FAILED' ||
    status === 'RECEIPT_REVIEW';

  if (inFlow) return <Outlet />;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-4 pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {snapshot.document.details.restaurantName ?? ui.account.fallbackBillName}
            </p>
            <p className="text-xs text-slate-400">
              {snapshot.document.details.table
                ? ui.account.tablePrefix(snapshot.document.details.table)
                : ''}
              {STATUS_LABEL[status] ?? status} ·{' '}
              {connected ? ui.account.live : ui.account.reconnecting}
            </p>
          </div>
        </div>
        <nav className="mt-3 flex gap-1 text-sm">
          {[
            [`/conta/${billId}`, ui.account.navRoom],
            [`/conta/${billId}/itens`, ui.account.navItems],
            [`/conta/${billId}/pessoas`, ui.account.navPeople],
            [`/conta/${billId}/minha-parte`, ui.account.navMyShare],
          ].map(([to, label], i) => (
            <NavLink
              key={label}
              to={to}
              end={i === 0}
              className={({ isActive }) =>
                `flex min-h-11 flex-1 items-center justify-center rounded-t-lg px-2 ${isActive ? 'border-b-2 border-sky-400 font-medium text-sky-300' : 'text-slate-400'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}

/** Tela 13 — sala de participantes (rota index). */
export function AccountIndex() {
  const { billId, snapshot, me, send, connected } = useBill();
  const nav = useNavigate();
  const doc = snapshot.document;
  const derived = derive(doc);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<string | null>(null);

  const leave = async () => {
    try {
      await api.endSession(billId);
      void nav('/');
    } catch {
      /* já saiu */
    }
  };

  const closeBill = async () => {
    setError('');
    try {
      await send({ type: 'CLOSE_BILL' });
      void nav(`/conta/${billId}/final`);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(
        err.code === 'OPEN_BLOCKERS'
          ? ui.account.openBlockersError
          : (err.message ?? ui.account.genericError),
      );
    }
  };

  const blockers = derived.blockers;
  const mine = doc.participants.find((p) => p.id === me.participantId);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(mine?.displayName ?? '');
  const [profileColor, setProfileColor] = useState(mine?.avatar.color ?? 'blue');
  const [deleting, setDeleting] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const saveProfile = async () => {
    if (!profileName.trim() || !mine) return;
    setError('');
    try {
      await send(
        {
          type: 'UPDATE_MY_PROFILE',
          displayName: profileName.trim(),
          avatar: { initial: profileName.trim()[0]!, color: profileColor },
        },
        { version: mine.version },
      );
      setProfileOpen(false);
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Erro');
    }
  };

  const deleteBill = async () => {
    setError('');
    try {
      await send({ type: 'DELETE_BILL', confirmation: 'EXCLUIR' });
      // SSE `deleted` leva para /
    } catch (e) {
      setError((e as { message?: string }).message ?? 'Erro');
      setDeleting(false);
      setDeleteText('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!connected ? (
        <p className="text-xs text-amber-400">{ui.account.reconnectingRealtime}</p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900">
        <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">
          {ui.account.peopleCountPrefix}
          {doc.participants.length}/{doc.seatLimit})
        </h2>
        <ul className="divide-y divide-slate-800">
          {doc.participants.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar initial={p.avatar.initial} color={p.avatar.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {p.displayName}
                  {p.id === doc.createdBy ? ui.account.creatorSuffix : ''}
                  {p.anonymized ? ui.account.anonymizedSuffix : ''}
                </p>
                <p className="text-xs text-slate-400">
                  {p.status === 'INVITED'
                    ? ui.account.invitedStatus
                    : p.status === 'SHARE_CLOSED'
                      ? ui.account.shareClosedStatus
                      : ui.account.participatingStatus}
                  {ui.account.statusSeparator}
                  {derived.shares[p.id]
                    ? ui.account.shareOf(formatCents(derived.shares[p.id].amount))
                    : ui.account.noShareYet}
                </p>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${snapshot.presence[p.id] === 'online' ? 'bg-emerald-400' : 'bg-slate-600'}`}
                aria-label={
                  snapshot.presence[p.id] === 'online' ? ui.account.online : ui.account.offline
                }
              />
            </li>
          ))}
        </ul>
      </section>

      {blockers.length > 0 ? (
        <section className="rounded-2xl border border-amber-800 bg-amber-950/40 p-4">
          <h2 className="text-sm font-medium text-amber-300">
            {ui.account.blockersPrefix}
            {blockers.length})
          </h2>
          <ul className="mt-1 space-y-1 text-xs text-amber-200/90">
            {blockers.map((b) => (
              <li key={b.id}>• {blockerLabel(b.type)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        {me.isCreator && doc.status === 'OPEN' ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                void api
                  .invite(billId)
                  .then((r) => setInvite(r.url))
                  .catch(() => setInvite(''));
              }}
            >
              {ui.account.inviteLink}
            </Button>
            {invite ? (
              <p className="break-all rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-sky-300">
                {invite || ui.account.inviteUnavailable}
              </p>
            ) : null}
          </>
        ) : null}

        {doc.status === 'OPEN' &&
        derived.progress.sharesClosed >=
          doc.participants.filter((p) => p.status !== 'INVITED').length ? (
          <Button onClick={() => void closeBill()}>
            {me.isCreator ? ui.account.reviewAndClose : ui.account.waitingForCreator}
          </Button>
        ) : null}

        {doc.status === 'CLOSED' ? (
          <Button onClick={() => nav(`/conta/${billId}/final`)}>{ui.account.viewFinalBill}</Button>
        ) : null}

        <Button variant="ghost" onClick={() => setProfileOpen(true)}>
          {ui.account.editProfile}
        </Button>

        <Button variant="ghost" onClick={() => void leave()}>
          {ui.account.leaveBill}
        </Button>

        {me.isCreator ? (
          <Button variant="ghost" onClick={() => setDeleting(true)}>
            {ui.account.deleteBill}
          </Button>
        ) : null}
      </section>

      {profileOpen ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-base font-semibold">{ui.account.editProfileTitle}</h2>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              maxLength={40}
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
              aria-label={ui.account.nameInputLabel}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProfileColor(c)}
                  className={`rounded-full p-1 ${profileColor === c ? 'ring-2 ring-sky-400' : ''}`}
                  aria-label={ui.account.colorLabel(c)}
                >
                  <Avatar initial={profileName.trim()[0] ?? '?'} color={c} />
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setProfileOpen(false)} className="flex-1">
                {ui.account.cancel}
              </Button>
              <Button onClick={() => void saveProfile()} className="flex-1">
                {ui.account.save}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleting ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-base font-semibold">{ui.account.deleteConfirmTitle}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {ui.account.deleteConfirmDescription}{' '}
              <strong className="text-slate-200">{ui.account.confirmWord}</strong>.
            </p>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
              aria-label={ui.account.confirmWordHint}
            />
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setDeleting(false)} className="flex-1">
                {ui.account.cancel}
              </Button>
              <Button
                onClick={() => void deleteBill()}
                disabled={deleteText !== ui.account.confirmWord}
                className="flex-1"
              >
                {ui.account.confirmDelete}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function blockerLabel(type: string): string {
  const map: Record<string, string> = {
    COBRANCA_NAO_CONFIRMADA: ui.account.blockerUnconfirmedCharge,
    DIVERGENCIA_COMANDA: ui.account.blockerDivergence,
    ITEM_NAO_DIVIDIDO: ui.account.blockerUndividedItem,
    PENDENCIA_ABERTA: ui.account.blockerOpenPending,
  };
  return map[type] ?? type.toLowerCase().replace(/_/g, ' ');
}
