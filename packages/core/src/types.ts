import type {
  BillDocument,
  BillId,
  ChargeId,
  Command,
  EntryCommand,
  ItemId,
  ParticipantId,
  ErrorCode,
  Notification,
} from '@cj/contracts';

export interface Blocker {
  type:
    | 'ITEM_NAO_DIVIDIDO'
    | 'UNIDADES_NAO_DISTRIBUIDAS'
    | 'DIVISAO_INCOMPLETA'
    | 'PARTICIPANTE_NAO_INFORMOU'
    | 'PARTICIPANTE_NAO_CONFIRMOU'
    | 'PARTICIPANTE_AGUARDANDO_ENTRADA'
    | 'COBRANCA_NAO_CONFIRMADA'
    | 'COBRANCA_SEM_RATEIO'
    | 'DIVERGENCIA_COMANDA';
  entityId: string;
  id: string; // `${type}:${entityId}`
}

export type ConsumptionStatus =
  'AWAITING_CONFIRMATION' | 'NOT_INFORMED' | 'CONFIRMED' | 'CONFIRMED_ZERO' | 'AWAITING_ENTRY';

export interface ShareLine {
  kind: 'ITEM' | 'CHARGE' | 'DISCOUNT' | 'ADJUSTMENT';
  refId: string;
  description: string;
  amount: number; // assinado: taxas +, descontos −
}

export interface Derived {
  totals: {
    itemsTotal: number;
    receiptTotal: number; // totalComanda (§7.4): itens + taxas(RECEIPT) − descontos(RECEIPT)
    difference: number; // diferença = printedTotal − totalComanda
    reconciliationAdjustment: number; // ajusteConciliacao: |diferença| ≤ 5¢ absorvida
    reconciledTotal: number; // totalConferido = totalComanda + ajusteConciliacao
    waivedTotal: number; // totalDispensado (§7.7.3): Σ parcelas dispensadas de taxas
    totalMesa: number; // totalMesa (§7.4): Σ taxas(TABLE) − Σ descontos(TABLE)
    amountDue: number; // totalAPagar = totalConferido − totalDispensado + totalMesa
  };
  items: Record<
    ItemId,
    {
      status: 'UNSPLIT' | 'PARTIAL' | 'SPLIT' | 'DELETED';
      shares: Record<ParticipantId, number>;
      unassigned: number;
    }
  >;
  charges: Record<
    ChargeId,
    {
      portions: Record<ParticipantId, number>;
      waived: Record<ParticipantId, number>;
      unassigned: number;
      base: number | null;
    }
  >;
  shares: Record<
    ParticipantId,
    {
      consumption: number;
      lines: ShareLine[];
      adjustment: number;
      amount: number;
      consumptionStatus: ConsumptionStatus;
    }
  >;
  unallocated: {
    total: number;
    bySource: { items: number; charges: number; adjustment: number };
  };
  blockers: Blocker[];
  progress: {
    itemsSplit: number;
    itemsTotal: number;
    peopleConfirmed: number;
    peopleTotal: number;
    sharesClosed: number;
  };
}

export interface DomainError {
  code: ErrorCode;
  http: 403 | 409 | 422;
  message: string;
  details?: Record<string, unknown>;
}

export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

export class DomainFailure extends Error {
  readonly domain: DomainError;
  constructor(error: DomainError) {
    super(error.code);
    this.name = 'DomainFailure';
    this.domain = error;
  }
}

export function fail(code: ErrorCode, message: string, details?: Record<string, unknown>): never {
  throw new DomainFailure({ code, http: httpFor(code), message, ...(details ? { details } : {}) });
}

function httpFor(code: ErrorCode): 403 | 409 | 422 {
  if (code === 'FORBIDDEN') return 403;
  if (
    [
      'VERSION_CONFLICT',
      'CONSUMPTION_CHANGED',
      'AMOUNT_CHANGED',
      'REOPENS_NOT_ACCEPTED',
      'REVISION_CONFLICT',
      'SEAT_TAKEN',
    ].includes(code)
  )
    return 409;
  return 422;
}

export type Effect =
  | { type: 'DELETE_IMAGE'; billId: BillId }
  | { type: 'REVOKE_SESSIONS'; billId: BillId; participantId: ParticipantId | 'ALL' }
  | { type: 'NOTIFY_BILL_DELETED'; billId: BillId }
  | { type: 'START_OCR'; billId: BillId; attemptId: string };

export interface AuditEntry {
  action: string;
  target: Record<string, string>;
  data: Record<string, unknown>;
}

export interface ExpectedGuards {
  version?: number;
  consumptionVersion?: number;
  shareAmount?: number;
  difference?: number;
  revision?: number;
  versions?: Record<string, number>;
}

export interface ExecutionContext {
  actor:
    | { kind: 'PARTICIPANT'; participantId: ParticipantId; isCreator: boolean }
    | { kind: 'VISITOR' }
    | { kind: 'SYSTEM' };
  now: string;
  newId: () => string;
  expected?: ExpectedGuards;
  acceptedReopens?: ParticipantId[];
}

export type Result =
  | { ok: true; noChange: true; response?: unknown }
  | {
      ok: true;
      noChange?: false;
      doc: BillDocument;
      derived: Derived;
      reopened: ParticipantId[];
      notifications: Notification[];
      audit: AuditEntry[];
      effects: Effect[];
      response?: unknown;
    }
  | { ok: false; error: DomainError };

export type { BillDocument, Command, EntryCommand };
