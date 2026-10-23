import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ui } from '@cj/contracts';
import { api, uuid } from '../api';
import { Avatar, AVATAR_COLORS, Button, Banner, Screen } from '../ui';

export default function Home() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState<'home' | 'name'>('home');
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState<string>('cyan');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async (e: FormEvent) => {
    e.preventDefault();
    if (displayName.trim().length < 1) return;
    setBusy(true);
    setError('');
    try {
      const r = await api.createBill(uuid(), displayName.trim(), {
        initial: displayName.trim()[0]!,
        color,
      });
      void nav(`/conta/${r.billId}/capture`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const notice = params.get('excluida')
    ? ui.home.billDeletedNotice
    : params.get('transferida')
      ? ui.home.sessionEndedNotice
      : '';

  return (
    <Screen title={ui.home.appName}>
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <div className="text-4xl">🧾</div>
        <p className="text-xl font-semibold">{ui.home.appName}</p>
        <p className="text-sm text-slate-400">{ui.home.tagline}</p>
      </div>

      {notice ? <Banner tone="info">{notice}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}

      {step === 'home' ? (
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => setStep('name')} className="w-full">
            {ui.home.newBill}
          </Button>
          <Button variant="secondary" onClick={() => nav('/entrar')} className="w-full">
            {ui.home.joinBill}
          </Button>
          <div className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-400">
            <p className="mb-1 font-medium text-slate-300">{ui.home.howItWorksTitle}</p>
            {ui.home.howItWorksBody}
          </div>
        </div>
      ) : (
        <form onSubmit={start} className="mt-6 flex flex-col gap-4">
          <label className="text-sm text-slate-300">
            {ui.home.namePrompt}
            <input
              autoFocus
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder={ui.home.namePlaceholder}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base outline-none focus:border-sky-500"
            />
          </label>
          <div>
            <p className="mb-2 text-sm text-slate-300">{ui.home.avatarLabel}</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`rounded-full p-1 ${color === c ? 'ring-2 ring-sky-400' : ''}`}
                  aria-label={ui.home.colorLabel(c)}
                >
                  <Avatar initial={displayName.trim()[0] ?? '?'} color={c} />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('home')}>
              {ui.home.back}
            </Button>
            <Button
              type="submit"
              disabled={busy || displayName.trim().length < 1}
              className="flex-1"
            >
              {ui.home.continue}
            </Button>
          </div>
        </form>
      )}
    </Screen>
  );
}
