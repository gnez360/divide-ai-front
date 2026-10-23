import { useState } from 'react';
import { ui } from '@cj/contracts';
import { derive } from '@cj/core';
import { useBill } from '../state';
import { money } from '../lib/format';
import { Avatar, Button, Banner } from '../ui';

export default function People() {
  const { snapshot, me, send } = useBill();
  const doc = snapshot.document;
  const derived = derive(doc);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const run = async (command: Record<string, unknown>) => {
    setError('');
    try {
      await send(command);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const preRegister = async () => {
    if (!name.trim()) return;
    try {
      await run({
        type: 'PRE_REGISTER_SEAT',
        displayName: name.trim(),
        avatar: { initial: name.trim()[0]!, color: 'slate' },
      });
      setName('');
      setAdding(false);
    } catch {
      /* banner já exibido */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900">
        <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">
          {ui.people.peopleHeaderPrefix}
          {derived.progress.peopleConfirmed}/{derived.progress.peopleTotal}
          {ui.people.peopleHeaderSuffix}
        </h2>
        <ul className="divide-y divide-slate-800">
          {doc.participants.map((p) => {
            const share = derived.shares[p.id];
            const isMe = p.id === me.participantId;
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar initial={p.avatar.initial} color={p.avatar.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {p.displayName}
                    {isMe ? ui.people.youSuffix : ''}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.status === 'INVITED' ? ui.people.awaitingEntry : null}
                    {share
                      ? ui.people.consumptionSummary(
                          consumptionLabel(share.consumptionStatus),
                          money(share.amount),
                        )
                      : ui.people.noItemsAssigned}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    p.status === 'SHARE_CLOSED'
                      ? 'bg-emerald-950 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {p.status === 'SHARE_CLOSED'
                    ? ui.people.statusClosed
                    : p.status === 'INVITED'
                      ? ui.people.statusInvited
                      : ui.people.statusOpen}
                </span>
                {p.status === 'INVITED' && doc.status === 'OPEN' ? (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
                      aria-label={ui.people.renameSeat(p.displayName)}
                      onClick={() => {
                        const next = window.prompt(ui.people.newSeatNameTitle, p.displayName);
                        if (next && next.trim())
                          void run({
                            type: 'RENAME_SEAT',
                            participantId: p.id,
                            displayName: next.trim(),
                          });
                      }}
                    >
                      ✎
                    </button>
                    {me.isCreator ? (
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-xs text-rose-400 hover:bg-slate-800"
                        aria-label={ui.people.removeSeat(p.displayName)}
                        onClick={() => {
                          if (window.confirm(ui.people.confirmRemoveSeat(p.displayName))) {
                            void run({ type: 'REMOVE_PARTICIPANT', participantId: p.id });
                          }
                        }}
                      >
                        ✕
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        {me.isCreator && doc.status === 'OPEN' ? (
          <button
            className="w-full border-t border-slate-800 px-4 py-3 text-left text-sm text-sky-400"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? ui.people.cancel : ui.people.reserveChair}
          </button>
        ) : null}
        {adding ? (
          <div className="flex gap-2 border-t border-slate-800 p-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ui.people.arrivingNamePlaceholder}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <Button onClick={() => void preRegister()} disabled={!name.trim()}>
              {ui.people.reserve}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function consumptionLabel(status: string): string {
  const map: Record<string, string> = {
    AWAITING_CONFIRMATION: ui.people.confirmConsumption,
    NOT_INFORMED: ui.people.confirmConsumption,
    AWAITING_ENTRY: ui.people.awaitingEntry,
    CONFIRMED: ui.people.consumptionConfirmed,
    CONFIRMED_ZERO: ui.people.confirmedNoConsumption,
  };
  return map[status] ?? status;
}
