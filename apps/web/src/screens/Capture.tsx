import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ui } from '@cj/contracts';
import { api, uuid } from '../api';
import { useBill } from '../state';
import { Button, Banner, Screen } from '../ui';

type Phase = 'pick' | 'preview' | 'processing' | 'failed';

export default function Capture() {
  const { billId, snapshot, me, send } = useBill();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('pick');
  const [error, setError] = useState('');
  const status = snapshot.document.status;
  const attemptId = snapshot.document.ocrAttempt?.id ?? null;

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(f.type)) {
      setError(ui.capture.invalidTypeError);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(ui.capture.imageTooLargeError);
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPhase('preview');
  };

  const sendPhoto = async () => {
    if (!file) return;
    setPhase('processing');
    setError('');
    try {
      const contentType =
        file.type === 'image/heic' || file.type === 'image/heif' ? 'image/heic' : file.type;
      const up = await api.uploadUrl(billId, uuid(), contentType);
      await api.putObject(up.uploadUrl, file, contentType);
      await api.startOcr(billId, uuid(), up.objectKey);
      // evento SSE do OCR leva a conta a RECEIPT_REVIEW/OCR_FAILED
    } catch (e) {
      setError((e as Error).message);
      setPhase('preview');
    }
  };

  // reflete o estado vindo do servidor (04 → 06 ou 05)
  useEffect(() => {
    if (status === 'RECEIPT_REVIEW') void nav(`/conta/${billId}/revisar`, { replace: true });
    else if (status === 'OCR_FAILED') setPhase('failed');
    else if (status === 'DRAFT') setPhase((p) => (p === 'processing' ? 'pick' : p));
  }, [status, nav, billId]);

  // §F4.2/F11: 20 s sem resultado → ABANDON_OCR → tela 05
  useEffect(() => {
    if (status !== 'OCR_PROCESSING' || !attemptId) return;
    const id = attemptId;
    const timer = setTimeout(() => {
      void send({ type: 'ABANDON_OCR', attemptId: id }).catch(() => {});
    }, 20_000);
    return () => clearTimeout(timer);
  }, [status, attemptId, send]);

  const cancelOcr = async () => {
    if (!attemptId) return;
    setError('');
    try {
      await send({ type: 'CANCEL_OCR', attemptId });
      setPhase('pick');
      setFile(null);
      setPreview(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const retryOcr = async () => {
    setError('');
    try {
      setPhase('processing');
      await send({ type: 'RETRY_OCR' });
    } catch (e) {
      setError((e as Error).message);
      setPhase('failed');
    }
  };

  const takeNewPhoto = async () => {
    setError('');
    try {
      await send({ type: 'TAKE_NEW_PHOTO' });
      setPhase('pick');
      setFile(null);
      setPreview(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const manual = async () => {
    try {
      await send({ type: 'ENTER_MANUALLY' });
      void nav(`/conta/${billId}/revisar`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (phase === 'processing' || status === 'OCR_PROCESSING') {
    return (
      <Screen title={ui.capture.processingTitle} back=".">
        {error ? <Banner tone="error">{error}</Banner> : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16" role="status">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
          <ul className="space-y-1 text-center text-sm text-slate-400">
            <li>{ui.capture.checkItems}</li>
            <li>{ui.capture.checkQuantities}</li>
            <li>{ui.capture.checkValues}</li>
            <li>{ui.capture.checkFees}</li>
          </ul>
          <p className="text-xs text-slate-400">{ui.capture.processingHint}</p>
          {me.isCreator ? (
            <Button variant="ghost" onClick={() => void cancelOcr()}>
              {ui.capture.cancelReading}
            </Button>
          ) : null}
        </div>
      </Screen>
    );
  }

  if (phase === 'failed') {
    const errorCode = snapshot.document.ocrAttempt?.errorCode;
    return (
      <Screen title={ui.capture.failedTitle} back=".">
        <Banner tone="error">
          {ui.capture.failedMessage}
          {errorCode ? ui.capture.errorCodeSuffix(errorCode) : ''}
        </Banner>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <div className="mt-4 flex flex-col gap-3">
          <Button onClick={() => void retryOcr()}>{ui.capture.retry}</Button>
          <Button variant="secondary" onClick={() => void takeNewPhoto()}>
            {ui.capture.takeAnotherPhoto}
          </Button>
          <Button variant="ghost" onClick={() => void manual()}>
            {ui.capture.typeManually}
          </Button>
          <p className="text-xs text-slate-400">
            {ui.capture.manualHintBefore}
            <strong>{ui.capture.totalPrinted}</strong>
            {ui.capture.manualHintAfter}
          </p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      title={phase === 'preview' ? ui.capture.previewTitle : ui.capture.captureTitle}
      back={phase === 'preview' ? undefined : '.'}
    >
      {error ? <Banner tone="error">{error}</Banner> : null}

      {phase === 'preview' && preview ? (
        <div className="flex flex-col gap-4">
          <img
            src={preview}
            alt={ui.capture.photoAlt}
            className="w-full rounded-2xl border border-slate-800 object-contain"
          />
          <div className="mt-auto flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setPhase('pick');
                setPreview(null);
                setFile(null);
              }}
            >
              {ui.capture.retakePhoto}
            </Button>
            <Button onClick={sendPhoto} className="flex-1">
              {ui.capture.useThisPhoto}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex aspect-[3/4] w-full max-w-xs items-center justify-center rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900 text-center text-sm text-slate-400">
            {ui.capture.positionHint}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <div className="flex w-full gap-3">
            <Button className="flex-1" onClick={() => fileRef.current?.click()}>
              {ui.capture.photoButton}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => fileRef.current?.click()}>
              {ui.capture.galleryButton}
            </Button>
          </div>
        </div>
      )}
      {!me.isCreator ? (
        <p className="text-xs text-slate-400">{ui.capture.creatorOnlyHint}</p>
      ) : null}
    </Screen>
  );
}
