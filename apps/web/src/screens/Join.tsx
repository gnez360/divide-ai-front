import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ui, type JoinPreview } from '@cj/contracts';
import { api, uuid } from '../api';
import { Avatar, AVATAR_COLORS, Button, Banner, Screen } from '../ui';

function tokenFromLocation(): string {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  const fromHash = params.get('t');
  if (fromHash) return fromHash;
  const q = new URLSearchParams(window.location.search).get('t');
  return q ?? '';
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function Join() {
  const nav = useNavigate();
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState<string>('teal');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const resolve = async (value: string) => {
    setError('');
    try {
      const r = (await api.resolveJoin(value)) as unknown as JoinPreview & {
        billId: string;
        hasSession: boolean;
      };
      setPreview(r);
      setBillId(r.billId);
      setToken(value);
      if (r.hasSession && r.billId) void nav(`/conta/${r.billId}`);
    } catch (e) {
      setError((e as Error).message || ui.join.invalidLinkFallback);
    }
  };

  useEffect(() => {
    const t = tokenFromLocation();
    if (t) void resolve(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reservedSeat = preview?.participants.find(
    (p) =>
      p.status === 'INVITED' &&
      norm(p.displayName) === norm(displayName) &&
      displayName.trim().length > 0,
  );

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!billId || displayName.trim().length < 1) return;
    setBusy(true);
    setError('');
    try {
      if (reservedSeat) {
        await api.join(uuid(), token, {
          type: 'TAKE_RESERVED_SEAT',
          participantId: reservedSeat.id,
        });
      } else {
        await api.join(uuid(), token, {
          type: 'JOIN_AS_NEW',
          displayName: displayName.trim(),
          avatar: { initial: displayName.trim()[0]!, color },
        });
      }
      void nav(`/conta/${billId}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen title={ui.join.pageTitle} back="/">
      {error ? <Banner tone="error">{error}</Banner> : null}

      {!preview ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-400">{ui.join.linkHint}</p>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={ui.join.linkPlaceholder}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
          />
          <Button onClick={() => void resolve(token.trim())} disabled={token.trim().length < 5}>
            {ui.join.continue}
          </Button>
        </div>
      ) : (
        <form onSubmit={join} className="flex flex-col gap-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-base font-semibold">
              {preview.restaurantName ?? ui.join.fallbackBillName}
            </p>
            {preview.table ? (
              <p className="text-sm text-slate-400">
                {ui.join.tableLabel}
                {preview.table}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-slate-400">
              {preview.seats.taken}/{preview.seats.limit}
              {ui.join.seatsSeparator}
              {preview.participants.length}
              {ui.join.alreadyJoined}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {preview.participants.map((p) => (
                <span
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-full bg-slate-800 px-2 py-1 text-xs"
                >
                  <Avatar initial={p.avatar.initial} color={p.avatar.color} size="sm" />
                  {p.displayName}
                </span>
              ))}
            </div>
          </section>

          {preview.status !== 'OPEN' && preview.status !== 'RECEIPT_REVIEW' ? (
            <Banner tone="info">
              {ui.join.billStatusPrefix}
              {preview.status}”.
            </Banner>
          ) : null}

          <label className="text-sm text-slate-300">
            {ui.join.namePrompt}
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder={ui.join.namePlaceholder}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base outline-none focus:border-sky-500"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`rounded-full p-1 ${color === c ? 'ring-2 ring-sky-400' : ''}`}
                aria-label={ui.join.colorLabel(c)}
              >
                <Avatar initial={displayName.trim()[0] ?? '?'} color={c} />
              </button>
            ))}
          </div>
          {reservedSeat ? (
            <Banner tone="info">
              {ui.join.youArePrefix}
              {reservedSeat.displayName}
              {ui.join.willJoinReserved}
            </Banner>
          ) : null}
          <Button type="submit" disabled={busy || displayName.trim().length < 1}>
            {reservedSeat ? ui.join.joinReservedSeat : ui.join.joinButton}
          </Button>
        </form>
      )}
    </Screen>
  );
}
