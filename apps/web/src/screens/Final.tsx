import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ui } from '@cj/contracts';
import { derive } from '@cj/core';
import { useBill } from '../state';
import { money } from '../lib/format';
import { Avatar, Button, Banner, Screen } from '../ui';

export default function Final() {
  const { billId, snapshot, me, send, reload } = useBill();
  const nav = useNavigate();
  const doc = snapshot.document;
  const derived = derive(doc);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const closeBill = async () => {
    setError('');
    try {
      await send({ type: 'CLOSE_BILL' });
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(
        err.code === 'OPEN_BLOCKERS'
          ? ui.final.pendingBlockers
          : (err.message ?? ui.final.genericError),
      );
      await reload().catch(() => {});
    }
  };

  const share = async () => {
    const text = summaryText();
    if (navigator.share) {
      try {
        await navigator.share({ title: ui.final.appName, text });
        return;
      } catch {
        /* cancelou */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(ui.final.copySummaryFailed);
    }
  };

  const summaryText = (): string => {
    const lines = [
      `${ui.final.summaryTitlePrefix}${doc.details.restaurantName ?? ui.final.summaryFallbackName}${doc.details.table ? ui.final.summaryTableSuffix(doc.details.table) : ''}`,
      ui.final.summaryTotal(money(derived.totals.receiptTotal)),
      '',
      ...doc.participants.map((p) => {
        const s = derived.shares[p.id];
        return ui.final.summaryParticipant(p.displayName, s ? money(s.amount) : '—');
      }),
    ];
    if (derived.totals.difference !== 0)
      lines.push('', ui.final.summaryAdjustment(money(derived.totals.difference)));
    return lines.join('\n');
  };

  if (doc.status === 'CLOSED') {
    return (
      <Screen title={ui.final.finalizedTitle} back=".">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
          <p className="text-3xl">✅</p>
          <p className="mt-2 font-semibold">
            {doc.details.restaurantName ?? ui.final.closedFallbackName}
          </p>
          <p className="text-sm text-slate-400">
            {ui.final.totalLabelPrefix}
            {money(derived.totals.receiptTotal)}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900">
          <ul className="divide-y divide-slate-800">
            {doc.participants.map((p) => {
              const s = derived.shares[p.id];
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar initial={p.avatar.initial} color={p.avatar.color} size="sm" />
                  <span className="flex-1 truncate text-sm">{p.displayName}</span>
                  <span className="text-sm font-semibold">{s ? money(s.amount) : '—'}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {error ? <Banner tone="error">{error}</Banner> : null}

        <div className="mt-auto flex flex-col gap-2">
          <Button onClick={() => void share()}>
            {copied ? ui.final.copied : ui.final.shareSummary}
          </Button>
          <Button variant="ghost" onClick={() => nav('/')}>
            {ui.final.backToHome}
          </Button>
        </div>
      </Screen>
    );
  }

  // 25 — revisão final antes de fechar
  const pendingBlocks = derived.blockers;
  const pendingPeople = doc.participants.filter(
    (p) => p.status !== 'INVITED' && p.status !== 'SHARE_CLOSED',
  );

  return (
    <Screen title={ui.final.reviewTitle} back=".">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm">
        <div className="flex justify-between text-slate-300">
          <span>{ui.final.billTotal}</span>
          <span className="font-semibold">{money(derived.totals.receiptTotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-400">
          <span>{ui.final.printedTotal}</span>
          <span>{money(doc.printedTotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-slate-400">
          <span>{ui.final.difference}</span>
          <span>{money(derived.totals.difference)}</span>
        </div>
        <div className="mt-3 border-t border-slate-800 pt-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{ui.final.shares}</p>
          <ul className="space-y-1">
            {doc.participants.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.displayName}</span>
                <span>{derived.shares[p.id] ? money(derived.shares[p.id].amount) : '—'}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {pendingBlocks.length > 0 ? (
        <Banner tone="error">
          {ui.final.blockersPrefix}
          {pendingBlocks.map((b) => b.type.toLowerCase()).join(', ')}
        </Banner>
      ) : null}
      {pendingPeople.length > 0 ? (
        <Banner tone="info">
          {ui.final.notClosedYetPrefix}
          {pendingPeople.map((p) => p.displayName).join(', ')}
        </Banner>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        <Button
          onClick={() => void closeBill()}
          disabled={!me.isCreator || pendingBlocks.length > 0}
        >
          {me.isCreator ? ui.final.closeBill : ui.final.waitingCreator}
        </Button>
        <Button variant="ghost" onClick={() => nav(`/conta/${billId}/itens`)}>
          {ui.final.checkItems}
        </Button>
      </div>
    </Screen>
  );
}
