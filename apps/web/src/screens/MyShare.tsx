import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ui } from '@cj/contracts';
import { derive } from '@cj/core';
import { useBill } from '../state';
import { money } from '../lib/format';
import { Avatar, Button, Banner } from '../ui';

export default function MyShare() {
  const { billId, snapshot, me, send, reload } = useBill();
  const nav = useNavigate();
  const doc = snapshot.document;
  const derived = derive(doc);
  const mine = doc.participants.find((p) => p.id === me.participantId);
  const share = derived.shares[me.participantId];
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const run = async (command: Record<string, unknown>, expected?: Record<string, unknown>) => {
    setError('');
    try {
      await send(command, expected);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (
        err.code === 'VERSION_CONFLICT' ||
        err.code === 'CONSUMPTION_CHANGED' ||
        err.code === 'AMOUNT_CHANGED'
      ) {
        await reload();
        setError(ui.myShare.shareChangedReload);
      } else {
        setError(err.message ?? ui.myShare.genericError);
      }
    }
  };

  const closeMine = async () => {
    await run(
      { type: 'CLOSE_MY_SHARE' },
      { shareAmount: share?.amount ?? 0, consumptionVersion: mine?.consumptionVersion ?? 0 },
    );
    setConfirming(false);
  };

  const unassigned = derived.unallocated.total;

  return (
    <div className="flex flex-col gap-4">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
        <p className="text-sm text-slate-400">{ui.myShare.currentShare}</p>
        <p className="mt-1 text-4xl font-bold text-sky-300" aria-live="polite">
          {share ? money(share.amount) : '—'}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {share
            ? ui.myShare.consumptionSummary(
                consumptionLabel(share.consumptionStatus),
                money(share.consumption),
              )
            : ui.myShare.noItemsYet}
        </p>
        {mine?.status === 'SHARE_CLOSED' ? (
          <p className="mt-3 rounded-full bg-emerald-950 px-3 py-1 text-xs text-emerald-300">
            {ui.myShare.shareClosedAt}
            {money(mine.closedShareAmount ?? share?.amount ?? 0)}
          </p>
        ) : null}
      </section>

      {unassigned > 0 ? (
        <Banner tone="info">
          {ui.myShare.stillUnsplitPrefix}
          {money(unassigned)}
          {ui.myShare.stillUnsplitSuffix}
        </Banner>
      ) : null}

      <section className="flex flex-col gap-2">
        {mine?.status !== 'SHARE_CLOSED' ? (
          <>
            {(share?.consumption ?? 0) > 0 ? (
              <Button
                variant="secondary"
                onClick={() => void run({ type: 'CONFIRM_MY_CONSUMPTION' })}
              >
                {ui.myShare.confirmMyConsumption}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => void run({ type: 'CONFIRM_NO_CONSUMPTION' })}
              >
                {ui.myShare.didNotConsume}
              </Button>
            )}
            <Button onClick={() => setConfirming(true)}>{ui.myShare.closeMyShare}</Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => void run({ type: 'REOPEN_MY_SHARE' })}>
            {ui.myShare.reopenMyShare}
          </Button>
        )}
        <Button variant="ghost" onClick={() => nav(`/conta/${billId}/itens`)}>
          {ui.myShare.viewItems}
        </Button>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          {ui.myShare.shareComposition}
        </h2>
        {share && share.lines.length > 0 ? (
          <ul className="space-y-1 text-slate-300">
            {share.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{l.description}</span>
                <span>{money(l.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400">{ui.myShare.noLines}</p>
        )}
        {share && share.adjustment !== 0 ? (
          <p className="mt-2 flex justify-between text-amber-300">
            <span>{ui.myShare.billAdjustment}</span>
            <span>{money(share.adjustment)}</span>
          </p>
        ) : null}
      </section>

      {confirming ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-base font-semibold">{ui.myShare.closeYourShareQuestion}</h2>
            <p className="mt-2 text-sm text-slate-400">
              {ui.myShare.confirmAmountPrefix}
              <strong className="text-slate-100">{money(share?.amount ?? 0)}</strong>
              {ui.myShare.confirmAmountSuffix}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setConfirming(false)} className="flex-1">
                {ui.myShare.back}
              </Button>
              <Button onClick={() => void closeMine()} className="flex-1">
                {ui.myShare.confirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        {doc.participants.map((p) => (
          <span key={p.id} className="flex items-center gap-1">
            <Avatar initial={p.avatar.initial} color={p.avatar.color} size="sm" />
            {p.status === 'SHARE_CLOSED' ? '✓' : '…'}
          </span>
        ))}
        <span>
          {derived.progress.sharesClosed}/
          {doc.participants.filter((p) => p.status !== 'INVITED').length}
          {ui.myShare.closedCountSuffix}
        </span>
      </div>
    </div>
  );
}

function consumptionLabel(status: string): string {
  const map: Record<string, string> = {
    AWAITING_CONFIRMATION: ui.myShare.confirmYourConsumption,
    NOT_INFORMED: ui.myShare.confirmYourConsumption,
    AWAITING_ENTRY: ui.myShare.awaitingEntry,
    CONFIRMED: ui.myShare.consumptionConfirmed,
    CONFIRMED_ZERO: ui.myShare.confirmedNoConsumption,
  };
  return map[status] ?? status;
}
