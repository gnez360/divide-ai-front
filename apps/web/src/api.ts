import type { BillSnapshot } from '@cj/contracts';
import { ui } from '@cj/contracts';

export interface Me {
  participantId: string;
  isCreator: boolean;
}

export interface BillResponse {
  me: Me;
  snapshot: BillSnapshot;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    credentials: 'same-origin',
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.code ?? 'ERROR',
      body?.message ?? res.statusText,
      body?.details,
    );
  }
  return body as T;
}

export const api = {
  createBill: (
    operationId: string,
    displayName: string,
    avatar: { initial: string; color: string },
    restaurantName?: string,
    table?: string,
  ) =>
    request<{ billId: string } & BillResponse>('/api/bills', {
      method: 'POST',
      body: JSON.stringify({ operationId, displayName, avatar, restaurantName, table }),
    }),

  getBill: (billId: string) => request<BillResponse>(`/api/bills/${billId}`),

  send: (
    billId: string,
    operationId: string,
    command: unknown,
    expected?: unknown,
    acceptedReopens?: string[],
  ) =>
    request<{ revision: number; snapshot: BillSnapshot; result?: unknown }>(
      `/api/bills/${billId}/commands`,
      {
        method: 'POST',
        body: JSON.stringify({ operationId, command, expected, acceptedReopens }),
      },
    ),

  uploadUrl: (billId: string, operationId: string, contentType: string) =>
    request<{ uploadUrl: string; objectKey: string }>(`/api/bills/${billId}/image/upload-url`, {
      method: 'POST',
      body: JSON.stringify({ operationId, contentType }),
    }),

  putObject: async (uploadUrl: string, bytes: Blob, contentType: string) => {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: bytes,
      headers: { 'content-type': contentType },
    });
    if (!res.ok) throw new ApiError(res.status, 'UPLOAD_FAILED', ui.shell.uploadFailed);
  },

  startOcr: (billId: string, operationId: string, objectKey: string) =>
    request<{ attemptId: string; snapshot: BillSnapshot }>(`/api/bills/${billId}/image`, {
      method: 'POST',
      body: JSON.stringify({ operationId, objectKey }),
    }),

  imageUrl: (billId: string) => `/api/bills/${billId}/image`,

  invite: (billId: string) =>
    request<{ url: string; token: string }>(`/api/bills/${billId}/invite`),

  resolveJoin: (joinToken: string) =>
    request<Record<string, unknown>>('/api/join/resolve', {
      method: 'POST',
      body: JSON.stringify({ joinToken }),
    }),

  join: (operationId: string, joinToken: string, command: unknown) =>
    request<{ me: Me } & BillResponse>('/api/join', {
      method: 'POST',
      body: JSON.stringify({ operationId, joinToken, command }),
    }),

  endSession: (billId: string) =>
    request<void>(`/api/bills/${billId}/session/end`, { method: 'POST' }),
};

export function uuid(): string {
  return crypto.randomUUID();
}
