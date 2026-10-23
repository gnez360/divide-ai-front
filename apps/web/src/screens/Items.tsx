import { useMemo, useState } from 'react';
import type { Item, Participant } from '@cj/contracts';
import { ui } from '@cj/contracts';
import { derive } from '@cj/core';
import { useBill } from '../state';
import { money, qty } from '../lib/format';
import { Avatar, Button, Banner } from '../ui';

export default function Items() {
  const { snapshot, send } = useBill();
  const doc = snapshot.document;
  const derived = derive(doc);
  const [openItem, setOpenItem] = useState<Item | null>(null);
  const [error, setError] = useState('');

  const live = doc.items.filter((i) => !i.deletedAt);

  return (
    <div className="flex flex-col gap-4">
      {error ? <Banner tone="error">{error}</Banner> : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900">
        <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">
          {ui.items.itemsHeaderPrefix}
          {derived.progress.itemsSplit}/{derived.progress.itemsTotal}
          {ui.items.itemsHeaderSuffix}
        </h2>
        <ul className="divide-y divide-slate-800">
          {live.map((item) => {
            const st = derived.items[item.id];
            const people = item.allocations
              .map((a) => doc.participants.find((p) => p.id === a.participantId))
              .filter(Boolean) as Participant[];
            return (
              <li key={item.id}>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/50"
                  onClick={() => setOpenItem(item)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {qty(item.quantity)}{' '}
                      {money(item.priceMode === 'UNIT_PRICE' ? item.unitPrice : item.lineTotal)}
                    </p>
                    {st?.status === 'SPLIT' ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {people.map((p) => (
                          <span
                            key={p.id}
                            className="flex items-center gap-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300"
                          >
                            <Avatar initial={p.avatar.initial} color={p.avatar.color} size="sm" />
                            {money(Math.round(st.shares[p.id] ?? 0))}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-[11px] text-amber-400">{ui.items.notSplit}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{money(item.lineTotal)}</span>
                  <span className="text-slate-400">›</span>
                </button>
              </li>
            );
          })}
          {live.length === 0 ? (
            <li className="p-4 text-sm text-slate-400">{ui.items.emptyItems}</li>
          ) : null}
        </ul>
      </section>

      {doc.charges.length > 0 ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900">
          <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">
            {ui.items.chargesHeading}
          </h2>
          <ul className="divide-y divide-slate-800">
            {doc.charges.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {c.description}
                    {c.percentBp != null ? (
                      <span className="text-xs text-slate-400">
                        {' '}
                        ({(c.percentBp / 100).toFixed(0)}%)
                      </span>
                    ) : null}
                  </p>
                  {c.kind === 'DISCOUNT' ? (
                    <p className="text-[11px] text-slate-400">{ui.items.discount}</p>
                  ) : null}
                </div>
                <span
                  className={`text-sm font-semibold ${c.kind === 'DISCOUNT' ? 'text-emerald-400' : ''}`}
                >
                  {c.kind === 'DISCOUNT' ? '−' : ''} {money(c.amount)}
                </span>
                {c.origin === 'OCR' && !c.confirmed ? (
                  <button
                    type="button"
                    onClick={() =>
                      void send(
                        { type: 'CONFIRM_CHARGE', chargeId: c.id },
                        { version: c.version },
                      ).catch((e) =>
                        setError((e as { message?: string }).message ?? ui.items.genericError),
                      )
                    }
                    className="rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-semibold text-slate-950"
                  >
                    {ui.items.confirmCharge}
                  </button>
                ) : (
                  <span className="text-xs text-slate-400" title={ui.items.confirmedTitle}>
                    ✓
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>{ui.items.itemsTotalLabel}</span>
          <span>{money(derived.totals.itemsTotal)}</span>
        </div>
        <div className="mt-1 flex justify-between font-medium">
          <span>{ui.items.billTotal}</span>
          <span>{money(derived.totals.receiptTotal)}</span>
        </div>
        {derived.unallocated.total > 0 ? (
          <p className="mt-2 text-xs text-amber-400">
            {ui.items.stillWithoutOwner}
            {money(derived.unallocated.total)}
          </p>
        ) : null}
      </section>

      {openItem ? (
        <SplitModal
          item={openItem}
          participants={doc.participants}
          onClose={() => setOpenItem(null)}
          onSplit={async (command) => {
            setError('');
            try {
              await send(command, { version: openItem.version });
              setOpenItem(null);
            } catch (e) {
              const err = e as { code?: string; message?: string };
              if (err.code === 'VERSION_CONFLICT') setError(ui.items.itemChangedRetry);
              else setError(err.message ?? ui.items.genericError);
            }
          }}
          canEdit={doc.status === 'OPEN'}
        />
      ) : null}
    </div>
  );
}

type SplitMode = 'EQUAL' | 'BY_UNITS' | 'CUSTOM_AMOUNT' | 'CUSTOM_PERCENT';

function SplitModal({
  item,
  participants,
  onClose,
  onSplit,
  canEdit,
}: {
  item: Item;
  participants: Participant[];
  onClose: () => void;
  onSplit: (command: Record<string, unknown>) => Promise<void>;
  canEdit: boolean;
}) {
  const people = participants.filter((p) => p.status !== 'INVITED');
  const [mode, setMode] = useState<SplitMode>(item.splitMode ?? 'EQUAL');
  const [selected, setSelected] = useState<string[]>(
    item.allocations.length
      ? item.allocations.map((a) => a.participantId)
      : people.map((p) => p.id),
  );
  const [units, setUnits] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      item.allocations.filter((a) => a.units != null).map((a) => [a.participantId, a.units!]),
    ),
  );
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      item.allocations
        .filter((a) => a.fixedAmount != null)
        .map((a) => [a.participantId, a.fixedAmount!]),
    ),
  );
  const [percents, setPercents] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      item.allocations
        .filter((a) => a.percentBp != null)
        .map((a) => [a.participantId, a.percentBp!]),
    ),
  );
  const [error, setError] = useState('');

  const modes: Array<[SplitMode, string]> = useMemo(
    () => [
      ['EQUAL', ui.items.modeEqual],
      ...(item.quantity > 1
        ? ([['BY_UNITS', ui.items.modeByUnits]] as Array<[SplitMode, string]>)
        : []),
      ['CUSTOM_AMOUNT', ui.items.modeCustomAmount],
      ['CUSTOM_PERCENT', ui.items.modeCustomPercent],
    ],
    [item.quantity],
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const build = (): Record<string, unknown> => {
    if (mode === 'EQUAL') {
      return {
        type: 'SET_SPLIT',
        itemId: item.id,
        mode: 'EQUAL',
        allocations: selected.map((participantId) => ({ participantId })),
      };
    }
    if (mode === 'BY_UNITS') {
      const sum = Object.values(units).reduce((s, n) => s + (n ?? 0), 0);
      if (sum !== item.quantity) {
        setError(ui.items.distributeAllUnits(sum, item.quantity));
        throw new Error('invalid');
      }
      return {
        type: 'SET_SPLIT',
        itemId: item.id,
        mode: 'BY_UNITS',
        allocations: Object.entries(units)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(([participantId, n]) => ({ participantId, units: n })),
      };
    }
    if (mode === 'CUSTOM_AMOUNT') {
      const sum = Object.values(amounts).reduce((s, n) => s + (n ?? 0), 0);
      if (sum !== item.lineTotal) {
        setError(ui.items.amountsMustMatch(money(item.lineTotal), money(item.lineTotal - sum)));
        throw new Error('invalid');
      }
      return {
        type: 'SET_SPLIT',
        itemId: item.id,
        mode: 'CUSTOM_AMOUNT',
        allocations: Object.entries(amounts)
          .filter(([, n]) => (n ?? 0) > 0)
          .map(([participantId, n]) => ({ participantId, fixedAmount: n })),
      };
    }
    const sum = Object.values(percents).reduce((s, n) => s + (n ?? 0), 0);
    if (sum !== 10000) {
      setError(ui.items.percentsMustSum100((sum / 100).toFixed(0)));
      throw new Error('invalid');
    }
    return {
      type: 'SET_SPLIT',
      itemId: item.id,
      mode: 'CUSTOM_PERCENT',
      allocations: Object.entries(percents)
        .filter(([, n]) => (n ?? 0) > 0)
        .map(([participantId, n]) => ({ participantId, percentBp: n })),
    };
  };

  const confirm = async () => {
    setError('');
    if (selected.length === 0 && mode === 'EQUAL') {
      setError(ui.items.selectAtLeastOnePerson);
      return;
    }
    try {
      const cmd = build();
      await onSplit(cmd);
    } catch {
      /* erro já exibido */
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/60" role="dialog" aria-modal="true">
      <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-slate-700 bg-slate-900 p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded bg-slate-700" />
        <h2 className="text-base font-semibold">
          {ui.items.splitItemPrefix}
          {item.name}
          {ui.items.splitItemSuffix}
        </h2>
        <p className="mb-3 text-sm text-slate-400">{money(item.lineTotal)}</p>

        <div className="mb-4 flex flex-wrap gap-2">
          {modes.map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1.5 text-xs ${mode === m ? 'bg-sky-500 font-semibold text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <Banner tone="error">{error}</Banner> : null}

        <ul className="mb-4 space-y-2">
          {people.map((p) => {
            const isOn = selected.includes(p.id);
            const unit = item.quantity > 0 ? Math.round(item.lineTotal / item.quantity) : 0;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2"
              >
                <Avatar initial={p.avatar.initial} color={p.avatar.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">{p.displayName}</span>

                {mode === 'EQUAL' ? (
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={isOn}
                    className={`rounded-lg px-3 py-1 text-xs ${isOn ? 'bg-sky-500 font-semibold text-slate-950' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {isOn ? '✓' : '—'}
                  </button>
                ) : null}

                {mode === 'BY_UNITS' ? (
                  <Stepper
                    value={units[p.id] ?? 0}
                    max={item.quantity}
                    onChange={(n) => setUnits((s) => ({ ...s, [p.id]: n }))}
                  />
                ) : null}

                {mode === 'CUSTOM_AMOUNT' ? (
                  <input
                    value={((amounts[p.id] ?? 0) / 100).toString().replace('.', ',')}
                    onChange={(e) => {
                      const cents = Math.round(
                        Number(e.target.value.replace(/[^\d,-]/g, '').replace(',', '.')) * 100,
                      );
                      setAmounts((s) => ({ ...s, [p.id]: Number.isFinite(cents) ? cents : 0 }));
                    }}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right text-sm outline-none focus:border-sky-500"
                    aria-label={ui.items.valueOfPerson(p.displayName)}
                  />
                ) : null}

                {mode === 'CUSTOM_PERCENT' ? (
                  <div className="flex w-36 items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((percents[p.id] ?? 0) / 100)}
                      onChange={(e) =>
                        setPercents((s) => ({ ...s, [p.id]: Number(e.target.value) * 100 }))
                      }
                      className="flex-1 accent-sky-400"
                      aria-label={ui.items.percentOfPerson(p.displayName)}
                    />
                    <span className="w-9 text-right text-xs">
                      {Math.round((percents[p.id] ?? 0) / 100)}%
                    </span>
                  </div>
                ) : null}

                {mode === 'BY_UNITS' ? (
                  <span className="w-16 text-right text-xs text-slate-400">
                    {money(unit)}
                    {ui.items.unitSuffix}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {ui.items.cancel}
          </Button>
          <Button onClick={() => void confirm()} disabled={!canEdit} className="flex-1">
            {ui.items.split}
          </Button>
        </div>
        {!canEdit ? (
          <p className="mt-2 text-center text-xs text-slate-400">{ui.items.billNotOpenForSplit}</p>
        ) : null}
      </div>
    </div>
  );
}

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        className="h-7 w-7 rounded-lg bg-slate-700 text-sm"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={ui.items.decreaseUnit}
      >
        −
      </button>
      <span className="w-6 text-center text-sm">{value}</span>
      <button
        type="button"
        className="h-7 w-7 rounded-lg bg-slate-700 text-sm"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={ui.items.increaseUnit}
      >
        +
      </button>
    </span>
  );
}
