import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ui } from '@cj/contracts';
import { api } from '../api';
import { useBill } from '../state';
import { Button, Banner, Screen } from '../ui';

export default function Invite() {
  const { billId, send } = useBill();
  const nav = useNavigate();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setError('');
    try {
      const r = await api.invite(billId);
      setUrl(r.url);
    } catch {
      setError(ui.invite.inviteOnlyOpenError);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(ui.invite.copyFailedError);
    }
  };

  const share = async () => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: ui.invite.shareTitle, url });
      } catch {
        /* usuário cancelou */
      }
    } else {
      void copy();
    }
  };

  const rotate = async () => {
    try {
      await send({ type: 'ROTATE_INVITE_LINK' });
      await load();
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen title={ui.invite.screenTitle} back=".">
      <p className="text-sm text-slate-400">{ui.invite.inviteHint}</p>
      {error ? <Banner tone="error">{error}</Banner> : null}

      {!url ? (
        <Button onClick={() => void load()}>{ui.invite.generateLink}</Button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="break-all rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-sky-300">
            {url}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => void share()} className="flex-1">
              {ui.invite.share}
            </Button>
            <Button variant="secondary" onClick={() => void copy()}>
              {copied ? ui.invite.copied : ui.invite.copy}
            </Button>
          </div>
          <Button variant="ghost" onClick={() => void rotate()}>
            {ui.invite.rotateLink}
          </Button>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <Button variant="ghost" onClick={() => nav(`/conta/${billId}/itens`)}>
          {ui.invite.goToBill}
        </Button>
      </div>
    </Screen>
  );
}
