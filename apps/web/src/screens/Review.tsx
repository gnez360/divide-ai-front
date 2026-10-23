import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ui, type BillDocument, type Item } from '@cj/contracts';
import { derive } from '@cj/core';
import { api } from '../api';
import { useBill } from '../state';
import { money, qty } from '../lib/format';
import { Button, Banner, Screen } from '../ui';

function fmtCents(c: number | null): string {
  return c == null ? '' : (c / 100).toFixed(2).replace('.', ',');
}

function subtotalOf(doc: BillDocument): number {
  return doc.items.filter((i) => !i.deletedAt).reduce((s, i) => s + i.lineTotal, 0);
}

export default function Review() {
  const { billId, snapshot, me, send, reload } = useBill();
  const nav = useNavigate();
  const doc = snapshot.document;
  const derived = derive(doc);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Item | null>(null);
  const [printed, setPrinted] = useState(fmtCents(doc.printedTotal));
  const [adding, setAdding] = useState(false);
  const totalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPrinted(fmtCents(doc.printedTotal));
  }, [doc.printedTotal]);

  const run = async (
    command: Record<string, unknown>,
    expected?: Record<string, unknown>,
  ): Promise<boolean> => {
    setError('');
    try {
      await send(command, expected);
      return true;
    } catch (e) {
      const err = e as { code?: string; message?: string };
      if (
        err.code === 'VERSION_CONFLICT' ||
        err.code === 'CONSUMPTION_CHANGED' ||
        err.code === 'REVISION_CONFLICT'
      ) {
        await reload();
        setError(ui.review.conflictError);
      } else {
        setError(err.message ?? ui.review.genericError);
      }
      return false;
    }
  };

  const confirmReceipt = () => {
    void run({ type: 'CONFIRM_RECEIPT' }).then((ok) => {
      if (ok) void nav(`/conta/${billId}/convidar`);
    });
  };

  const savePrinted = () => {
    if (!printed.trim()) return;
    const cents = Math.round(Number(printed.replace(/[^\d,-]/g, '').replace(',', '.')) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError(ui.review.invalidPrintedTotalError);
      return;
    }
    void run({ type: 'SET_PRINTED_TOTAL', printedTotal: cents }, { version: doc.details.version });
  };

  const divergence = doc.printedTotal != null ? Math.abs(derived.totals.difference) : null;
  const hasDivergence = divergence != null && divergence > 5;

  return (
    <Screen
      title={ui.review.screenTitle}
      back={doc.status === 'RECEIPT_REVIEW' ? undefined : 'itens'}
      action={
        snapshot.hasImage ? (
          <a
            href={api.imageUrl(billId)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300"
          >
            {ui.review.viewReceipt}
          </a>
        ) : undefined
      }
    >
      {error ? <Banner tone="error">{error}</Banner> : null}
      {hasDivergence ? (
        <section
          className="rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-sm"
          role="alert"
        >
          <p className="font-medium text-amber-300">{ui.review.divergenceTitle}</p>
          <dl className="mt-2 space-y-1 text-amber-100/90">
            <div className="flex justify-between">
              <dt>{ui.review.calculated}</dt>
              <dd>{money(derived.totals.receiptTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{ui.review.totalPrinted}</dt>
              <dd>{money(doc.printedTotal ?? 0)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{ui.review.difference}</dt>
              <dd>{money(divergence!)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-amber-200/80">{ui.review.divergenceHint}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => totalRef.current?.focus()}
              className="flex-1"
            >
              {ui.review.fix}
            </Button>
            <Button
              onClick={() =>
                void run(
                  { type: 'CREATE_DISCREPANCY_ADJUSTMENT' },
                  { difference: derived.totals.difference },
                )
              }
              className="flex-1"
            >
              {ui.review.billAdjustment}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-800 bg-slate-900">
        {doc.items.filter((i) => !i.deletedAt).length === 0 ? (
          <p className="p-4 text-sm text-slate-400">{ui.review.emptyItemsHint}</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {doc.items
              .filter((i) => !i.deletedAt)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-400">
                      {qty(item.quantity)}{' '}
                      {money(item.priceMode === 'UNIT_PRICE' ? item.unitPrice : item.lineTotal)}
                      {item.priceMode === 'UNIT_PRICE' ? ui.review.perUnitSuffix : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{money(item.lineTotal)}</span>
                  <button
                    className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800"
                    onClick={() => setEditing(item)}
                    aria-label={ui.review.editItemLabel(item.name)}
                  >
                    {ui.review.editGlyph}
                  </button>
                </li>
              ))}
          </ul>
        )}
        <button
          className="w-full border-t border-slate-800 px-4 py-3 text-left text-sm text-sky-400"
          onClick={() => setAdding(true)}
        >
          {ui.review.addItem}
        </button>
      </section>

      {doc.status === 'OPEN' && doc.items.some((i) => i.deletedAt !== null) ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900">
          <h2 className="border-b border-slate-800 px-4 py-3 text-sm font-medium text-slate-300">
            {ui.review.deletedItems(doc.items.filter((i) => i.deletedAt !== null).length)}
          </h2>
          <ul className="divide-y divide-slate-800">
            {doc.items
              .filter((i) => i.deletedAt !== null)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-400 line-through">
                    {item.name}
                  </span>
                  <span className="text-slate-400">{money(item.lineTotal)}</span>
                  <button
                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-sky-300"
                    onClick={() =>
                      void run({ type: 'RESTORE_ITEM', itemId: item.id }, { version: item.version })
                    }
                  >
                    {ui.review.restore}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm">
        {doc.charges.map((c) => (
          <div key={c.id} className="flex justify-between text-slate-300">
            <span>
              {c.description}
              {c.percentBp ? ui.review.chargePercentSuffix(c.percentBp) : ''}
              {c.confirmed ? ui.review.confirmedSuffix : ''}
            </span>
            <span>{money(c.kind === 'DISCOUNT' ? -c.amount : c.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-800 pt-2 text-slate-400">
          <span>{ui.review.subtotal}</span>
          <span>{money(subtotalOf(doc))}</span>
        </div>
        <label className="flex items-center justify-between gap-3 pt-1">
          <span className="font-medium text-slate-200">{ui.review.totalPrinted}</span>
          <input
            ref={totalRef}
            value={printed}
            onChange={(e) => setPrinted(e.target.value)}
            inputMode="decimal"
            onBlur={savePrinted}
            className="w-32 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-right outline-none focus:border-sky-500"
            aria-label={ui.review.totalPrinted}
          />
        </label>
        <div className="flex justify-between border-t border-slate-700 pt-2 text-base font-semibold">
          <span>{ui.review.billTotal}</span>
          <span>{money(derived.totals.receiptTotal)}</span>
        </div>
      </section>

      {doc.status === 'RECEIPT_REVIEW' ? (
        <div className="mt-auto flex flex-col gap-2">
          <Button onClick={confirmReceipt}>{ui.review.confirmBill}</Button>
          {me.isCreator ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (!window.confirm(ui.review.discardConfirm)) return;
                void run({ type: 'DISCARD_RECEIPT' }).then((ok) => {
                  if (ok) void nav(`/conta/${billId}/capture`);
                });
              }}
            >
              {ui.review.discardAndRetake}
            </Button>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <ItemSheet
          item={editing}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            await run(
              { type: 'EDIT_ITEM', itemId: editing.id, ...payload },
              { version: editing.version },
            );
            setEditing(null);
          }}
          onDelete={async () => {
            await run({ type: 'DELETE_ITEM', itemId: editing.id }, { version: editing.version });
            setEditing(null);
          }}
        />
      ) : null}

      {adding ? (
        <ItemSheet
          item={null}
          onClose={() => setAdding(false)}
          onSave={async (payload) => {
            await run({ type: 'ADD_ITEM', ...payload });
            setAdding(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

interface SheetPayload {
  name: string;
  quantity: number;
  priceMode: 'UNIT_PRICE' | 'LINE_TOTAL';
  unitPrice?: number | null;
  lineTotal?: number | null;
}

function ItemSheet({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: Item | null;
  onClose: () => void;
  onSave: (payload: SheetPayload) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [mode, setMode] = useState<'UNIT_PRICE' | 'LINE_TOTAL'>(item?.priceMode ?? 'LINE_TOTAL');
  const [price, setPrice] = useState(
    item
      ? String(
          ((item.priceMode === 'UNIT_PRICE' ? item.unitPrice : item.lineTotal) ?? 0) / 100,
        ).replace('.', ',')
      : '',
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const cents = Math.round(Number(price.replace(/[^\d,-]/g, '').replace(',', '.')) * 100);
    if (!name.trim() || !Number.isFinite(cents) || Number(quantity) < 1) return;
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        quantity: Number(quantity),
        priceMode: mode,
        unitPrice: mode === 'UNIT_PRICE' ? cents : null,
        lineTotal: mode === 'LINE_TOTAL' ? cents : null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/60" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-t-3xl border-t border-slate-700 bg-slate-900 p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded bg-slate-700" />
        <h2 className="mb-4 text-base font-semibold">
          {item ? ui.review.editItemTitle : ui.review.addItemTitle}
        </h2>
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={ui.review.itemNamePlaceholder}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500"
          />
          <div className="flex gap-3">
            <label className="w-24 text-sm text-slate-400">
              {ui.review.qtyLabel}
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500"
              />
            </label>
            <div className="flex-1 text-sm text-slate-400">
              {ui.review.priceLabel}
              <div className="mt-1 flex gap-2">
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 outline-none focus:border-sky-500"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('LINE_TOTAL')}
                  className={`rounded-lg px-2 py-1 text-xs ${mode === 'LINE_TOTAL' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800'}`}
                >
                  {ui.review.lineTotalMode}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('UNIT_PRICE')}
                  className={`rounded-lg px-2 py-1 text-xs ${mode === 'UNIT_PRICE' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800'}`}
                >
                  {ui.review.unitPriceMode}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {onDelete ? (
              <Button variant="danger" onClick={() => void onDelete()}>
                {ui.review.delete}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose} className="flex-1">
              {ui.review.cancel}
            </Button>
            <Button onClick={() => void save()} disabled={busy || !name.trim()} className="flex-1">
              {ui.review.save}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
