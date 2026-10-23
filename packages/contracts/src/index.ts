import { z } from 'zod';
import { zodMessages } from './messages.js';

// ── Primitivos ────────────────────────────────────────────────────────────────
export const cents = z.number().int().min(0).max(99_999_999);
export const signedCents = z.number().int().min(-99_999_999).max(99_999_999);
export const basisPoints = z.number().int().min(0).max(10_000);
export const uuid = z.string().uuid();
export const iso = z.string().datetime({ offset: true });

export type Cents = number;
export type BasisPoints = number;
export type Iso = string;
export type BillId = string;
export type ParticipantId = string;
export type ItemId = string;
export type ChargeId = string;

// ── Documento ────────────────────────────────────────────────────────────────
export const avatarSchema = z.object({
  initial: z.string().min(1).max(2),
  color: z.enum([
    'red',
    'orange',
    'amber',
    'green',
    'teal',
    'cyan',
    'blue',
    'violet',
    'pink',
    'slate',
  ]),
});
export type Avatar = z.infer<typeof avatarSchema>;

export const allocationSchema = z
  .object({
    participantId: uuid,
    units: z.number().int().min(0).optional(),
    fixedAmount: cents.optional(),
    percentBp: basisPoints.optional(),
  })
  .strict();
export type Allocation = z.infer<typeof allocationSchema>;

export const itemSchema = z
  .object({
    id: uuid,
    name: z.string().min(1).max(120),
    quantity: z.number().int().min(1).max(999),
    priceMode: z.enum(['UNIT_PRICE', 'LINE_TOTAL']),
    unitPrice: cents.nullable(),
    lineTotal: cents,
    splitMode: z.enum(['EQUAL', 'BY_UNITS', 'CUSTOM_AMOUNT', 'CUSTOM_PERCENT']).nullable(),
    allocations: z.array(allocationSchema),
    origin: z.enum(['OCR', 'MANUAL']),
    deletedAt: iso.nullable(),
    deletedBy: uuid.nullable(),
    version: z.number().int().min(1),
  })
  .strict();
export type Item = z.infer<typeof itemSchema>;

export const chargeSchema = z
  .object({
    id: uuid,
    description: z.string().min(1).max(120),
    kind: z.enum(['FEE', 'DISCOUNT']),
    scope: z.enum(['RECEIPT', 'TABLE']),
    amount: cents,
    percentBp: basisPoints.nullable(),
    amountSource: z.enum(['PRINTED', 'FROM_PERCENT', 'MANUAL']),
    origin: z.enum(['OCR', 'MANUAL', 'DISCREPANCY_ADJUSTMENT']),
    distribution: z.enum(['PROPORTIONAL', 'EQUAL_PER_PERSON']),
    splitAmong: z.array(uuid),
    waiver: z.enum(['NONE', 'FULL', 'PARTIAL']),
    waivedFor: z.array(uuid),
    confirmed: z.boolean(),
    confirmedBy: uuid.nullable(),
    reviewReason: z.enum(['OCR_AMOUNT_ONLY', 'OCR_PERCENT_ONLY', 'PERCENT_MISMATCH']).nullable(),
    version: z.number().int().min(1),
  })
  .strict();
export type Charge = z.infer<typeof chargeSchema>;

export const participantSchema = z
  .object({
    id: uuid,
    displayName: z.string().min(1).max(40),
    avatar: avatarSchema,
    status: z.enum(['INVITED', 'ACTIVE', 'SHARE_CLOSED']),
    consumptionConfirmed: z.boolean(),
    confirmationSource: z.enum(['SELF', 'ON_BEHALF']).nullable(),
    confirmedBy: uuid.nullable(),
    confirmedAt: iso.nullable(),
    consumptionVersion: z.number().int().min(0),
    closedShareAmount: cents.nullable(),
    shareClosedAt: iso.nullable(),
    preRegisteredBy: uuid.nullable(),
    joinedAt: iso.nullable(),
    joinOrder: z.number().int().min(1),
    anonymized: z.boolean(),
    version: z.number().int().min(1),
  })
  .strict();
export type Participant = z.infer<typeof participantSchema>;

export const ocrAttemptSchema = z
  .object({
    id: uuid,
    status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED']),
    startedAt: iso,
    finishedAt: iso.nullable(),
    errorCode: z.string().nullable(),
  })
  .strict();
export type OcrAttempt = z.infer<typeof ocrAttemptSchema>;

export const claimSchema = z
  .object({
    id: uuid,
    targetParticipantId: uuid,
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']),
    requestedAt: iso,
    decidedAt: iso.nullable(),
    decidedBy: uuid.nullable(),
  })
  .strict();
export type Claim = z.infer<typeof claimSchema>;

export const billDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: uuid,
    status: z.enum(['DRAFT', 'OCR_PROCESSING', 'OCR_FAILED', 'RECEIPT_REVIEW', 'OPEN', 'CLOSED']),
    createdBy: uuid,
    details: z
      .object({
        restaurantName: z.string().max(120).nullable().optional(),
        table: z.string().max(40).nullable().optional(),
        receiptNumber: z.string().max(40).nullable().optional(),
        version: z.number().int().min(1),
      })
      .strict(),
    printedTotal: cents.nullable(),
    seatLimit: z.number().int().min(1).max(20),
    ocrAttempt: ocrAttemptSchema.nullable(),
    items: z.array(itemSchema),
    charges: z.array(chargeSchema),
    participants: z.array(participantSchema),
    claims: z.array(claimSchema),
    receiptConfirmedAt: iso.nullable(),
    closedAt: iso.nullable(),
    createdAt: iso,
  })
  .strict();
export type BillDocument = z.infer<typeof billDocumentSchema>;

// ── Comandos ─────────────────────────────────────────────────────────────────
const splitAllocations = z.array(
  z
    .object({
      participantId: uuid,
      units: z.number().int().min(0).optional(),
      fixedAmount: cents.optional(),
      percentBp: basisPoints.optional(),
    })
    .strict(),
);

export const commandSchemas = {
  ENTER_MANUALLY: z.object({}).strict(),
  CANCEL_OCR: z.object({ attemptId: uuid }).strict(),
  ABANDON_OCR: z.object({ attemptId: uuid }).strict(),
  RETRY_OCR: z.object({}).strict(),
  TAKE_NEW_PHOTO: z.object({}).strict(),
  DISCARD_RECEIPT: z.object({}).strict(),
  UPDATE_BILL_DETAILS: z
    .object({
      restaurantName: z.string().max(120).nullable().optional(),
      table: z.string().max(40).nullable().optional(),
      receiptNumber: z.string().max(40).nullable().optional(),
    })
    .strict(),
  SET_PRINTED_TOTAL: z.object({ printedTotal: cents }).strict(),
  ADD_ITEM: z
    .object({
      name: z.string().min(1).max(120),
      quantity: z.number().int().min(1).max(999),
      priceMode: z.enum(['UNIT_PRICE', 'LINE_TOTAL']),
      unitPrice: cents.nullable().optional(),
      lineTotal: cents.optional(),
    })
    .strict(),
  EDIT_ITEM: z
    .object({
      itemId: uuid,
      name: z.string().min(1).max(120).optional(),
      quantity: z.number().int().min(1).max(999).optional(),
      priceMode: z.enum(['UNIT_PRICE', 'LINE_TOTAL']).optional(),
      unitPrice: cents.nullable().optional(),
      lineTotal: cents.optional(),
    })
    .strict(),
  DELETE_ITEM: z.object({ itemId: uuid }).strict(),
  RESTORE_ITEM: z.object({ itemId: uuid }).strict(),
  MERGE_ITEMS: z.object({ itemIds: z.array(uuid).length(2) }).strict(),
  SET_SPLIT: z
    .object({
      itemId: uuid,
      mode: z.enum(['EQUAL', 'BY_UNITS', 'CUSTOM_AMOUNT', 'CUSTOM_PERCENT']),
      allocations: splitAllocations,
      partial: z.boolean().optional(),
    })
    .strict(),
  ADD_CHARGE: z
    .object({
      description: z.string().min(1).max(120),
      kind: z.enum(['FEE', 'DISCOUNT']),
      amount: cents,
      percentBp: basisPoints.nullable().optional(),
      amountSource: z.enum(['PRINTED', 'FROM_PERCENT', 'MANUAL']).optional(),
      distribution: z.enum(['PROPORTIONAL', 'EQUAL_PER_PERSON']).optional(),
      keepAnyway: z.boolean().optional(),
    })
    .strict(),
  EDIT_CHARGE: z
    .object({
      chargeId: uuid,
      description: z.string().min(1).max(120).optional(),
      amount: cents.optional(),
      percentBp: basisPoints.nullable().optional(),
      keepAnyway: z.boolean().optional(),
    })
    .strict(),
  REMOVE_CHARGE: z.object({ chargeId: uuid }).strict(),
  CONFIRM_CHARGE: z.object({ chargeId: uuid }).strict(),
  SET_WAIVER: z
    .object({
      chargeId: uuid,
      waiver: z.enum(['NONE', 'FULL', 'PARTIAL']),
      waivedFor: z.array(uuid),
    })
    .strict(),
  CREATE_DISCREPANCY_ADJUSTMENT: z.object({}).strict(),
  CONFIRM_RECEIPT: z.object({}).strict(),
  PRE_REGISTER_SEAT: z
    .object({ displayName: z.string().min(1).max(40), avatar: avatarSchema })
    .strict(),
  RENAME_SEAT: z.object({ participantId: uuid, displayName: z.string().min(1).max(40) }).strict(),
  UPDATE_MY_PROFILE: z
    .object({ displayName: z.string().min(1).max(40), avatar: avatarSchema })
    .strict(),
  REMOVE_PARTICIPANT: z.object({ participantId: uuid }).strict(),
  DECIDE_CLAIM: z.object({ claimId: uuid, decision: z.enum(['APPROVE', 'REJECT']) }).strict(),
  CONFIRM_MY_CONSUMPTION: z.object({}).strict(),
  CONFIRM_NO_CONSUMPTION: z.object({}).strict(),
  CLOSE_MY_SHARE: z.object({}).strict(),
  REOPEN_MY_SHARE: z.object({}).strict(),
  CONFIRM_ON_BEHALF: z.object({ participantId: uuid }).strict(),
  CONFIRM_ZERO_ON_BEHALF: z.object({ participantId: uuid }).strict(),
  REMOVE_ITEMS_AND_CONFIRM_ZERO: z.object({ participantId: uuid }).strict(),
  CLOSE_BILL: z.object({}).strict(),
  ROTATE_INVITE_LINK: z.object({}).strict(),
  ANONYMIZE_ME: z.object({}).strict(),
  DELETE_BILL: z.object({ confirmation: z.literal('EXCLUIR') }).strict(),
  // sistema
  START_OCR: z.object({ attemptId: uuid }).strict(),
  APPLY_OCR_RESULT: z
    .object({
      attemptId: uuid,
      restaurantName: z.string().nullable(),
      table: z.string().nullable(),
      printedTotal: cents.nullable(),
      items: z.array(
        z
          .object({
            name: z.string(),
            quantity: z.number().int().min(1),
            priceMode: z.enum(['UNIT_PRICE', 'LINE_TOTAL']),
            unitPrice: cents.nullable(),
            lineTotal: cents,
          })
          .strict(),
      ),
      charges: z.array(
        z
          .object({
            description: z.string(),
            kind: z.enum(['FEE', 'DISCOUNT']),
            amount: cents,
            percentBp: basisPoints.nullable(),
            reviewReason: z
              .enum(['OCR_AMOUNT_ONLY', 'OCR_PERCENT_ONLY', 'PERCENT_MISMATCH'])
              .nullable(),
          })
          .strict(),
      ),
    })
    .strict(),
  FAIL_OCR: z.object({ attemptId: uuid, errorCode: z.string() }).strict(),
  EXPIRE_OCR_ATTEMPT: z.object({ attemptId: uuid }).strict(),
  EXPIRE_CLAIM: z.object({ claimId: uuid }).strict(),
} as const;

export type CommandType = keyof typeof commandSchemas;
export type CommandPayloads = { [K in CommandType]: z.infer<(typeof commandSchemas)[K]> };
export type Command = { [K in CommandType]: { type: K } & CommandPayloads[K] }[CommandType];

// Comandos de entrada (POST /api/join) — payload completo inclui o tipo
export const entryCommandSchemas = {
  JOIN_AS_NEW: z
    .object({
      displayName: z.string().min(1).max(40),
      avatar: avatarSchema,
      consumed: z.boolean().optional(),
    })
    .strict(),
  TAKE_RESERVED_SEAT: z.object({ participantId: uuid }).strict(),
  REQUEST_CLAIM: z.object({ participantId: uuid }).strict(),
} as const;
export type EntryCommandType = keyof typeof entryCommandSchemas;
export type EntryCommandPayloads = {
  [K in EntryCommandType]: z.infer<(typeof entryCommandSchemas)[K]>;
};
export type EntryCommand = {
  [K in EntryCommandType]: { type: K } & EntryCommandPayloads[K];
}[EntryCommandType];

export const expectedSchema = z
  .object({
    version: z.number().int().optional(),
    consumptionVersion: z.number().int().optional(),
    shareAmount: cents.optional(),
    difference: signedCents.optional(),
    revision: z.number().int().optional(),
    versions: z.record(z.number().int()).optional(),
  })
  .strict();

export const envelopeBaseSchema = z
  .object({
    operationId: uuid,
    expected: expectedSchema.optional(),
    acceptedReopens: z.array(uuid).optional(),
  })
  .strict();

function stripType(raw: unknown): Record<string, unknown> {
  const { type: _type, ...rest } = (raw ?? {}) as Record<string, unknown>;
  return rest;
}

export function parseCommand(raw: unknown): Command {
  const t = (raw as { type?: unknown }).type;
  if (typeof t !== 'string' || !(t in commandSchemas)) {
    throw new z.ZodError([
      { code: z.ZodIssueCode.custom, path: ['type'], message: zodMessages.unknownCommand },
    ]);
  }
  const type = t as CommandType;
  if (
    ['START_OCR', 'APPLY_OCR_RESULT', 'FAIL_OCR', 'EXPIRE_OCR_ATTEMPT', 'EXPIRE_CLAIM'].includes(
      type,
    )
  ) {
    throw new z.ZodError([
      { code: z.ZodIssueCode.custom, path: ['type'], message: zodMessages.systemCommand },
    ]);
  }
  const payload = commandSchemas[type].parse(stripType(raw));
  return { type, ...payload } as Command;
}

export function parseSystemCommand(raw: unknown): Command {
  const t = (raw as { type?: unknown }).type;
  if (typeof t !== 'string' || !(t in commandSchemas)) {
    throw new z.ZodError([
      { code: z.ZodIssueCode.custom, path: ['type'], message: zodMessages.unknownCommand },
    ]);
  }
  const type = t as CommandType;
  const payload = commandSchemas[type].parse(stripType(raw));
  return { type, ...payload } as Command;
}

export function parseEntryCommand(raw: unknown): EntryCommand {
  const t = (raw as { type?: unknown }).type;
  if (typeof t !== 'string' || !(t in entryCommandSchemas)) {
    throw new z.ZodError([
      { code: z.ZodIssueCode.custom, path: ['type'], message: zodMessages.unknownEntryCommand },
    ]);
  }
  const type = t as EntryCommandType;
  const payload = entryCommandSchemas[type].parse(stripType(raw));
  return { type, ...payload } as EntryCommand;
}

// ── Snapshot / eventos ───────────────────────────────────────────────────────
export const billStatusSchema = z.enum([
  'DRAFT',
  'OCR_PROCESSING',
  'OCR_FAILED',
  'RECEIPT_REVIEW',
  'OPEN',
  'CLOSED',
]);
export type BillStatus = z.infer<typeof billStatusSchema>;

export interface BillSnapshot {
  revision: number;
  document: BillDocument;
  derived: unknown; // Derived vem de @cj/core no servidor; na API vira JSON
  hasImage: boolean;
  presence: Record<string, 'online' | 'offline' | 'recent'>;
}

export type Notification =
  | { type: 'SHARE_REOPENED'; participantId: string; from: number; to: number }
  | { type: 'ITEMS_CHANGED'; participantId: string }
  | { type: 'CLAIM_PENDING'; claimId: string; targetParticipantId: string }
  | { type: 'ACCESS_TRANSFERRED'; participantId: string }
  | { type: 'RESERVED_SEAT_TAKEN'; participantId: string; preRegisteredBy: string }
  | { type: 'PARTICIPANT_REMOVED'; participantId: string; actor: string }
  | { type: 'ITEM_DELETED'; itemId: string; actor: string }
  | { type: 'PRINTED_TOTAL_CHANGED'; from: number | null; to: number; actor: string }
  | { type: 'DISCREPANCY_ADJUSTMENT_CREATED'; amount: number; actor: string }
  | { type: 'INVITE_LINK_ROTATED' }
  | { type: 'BILL_CLOSED' };

export const errorCodes = [
  'FORBIDDEN',
  'VERSION_CONFLICT',
  'CONSUMPTION_CHANGED',
  'AMOUNT_CHANGED',
  'REOPENS_NOT_ACCEPTED',
  'REVISION_CONFLICT',
  'SEAT_TAKEN',
  'INVALID_STATE',
  'BILL_ALREADY_CLOSED',
  'TABLE_FULL',
  'INVALID_SPLIT',
  'REDUCTION_BLOCKED',
  'NEGATIVE_SHARE',
  'DISCOUNT_EXCEEDS_RECEIPT',
  'PERCENT_MISMATCH',
  'OPEN_BLOCKERS',
  'REMOVAL_NOT_ALLOWED',
  'LIMIT_EXCEEDED',
  'INVALID_REFERENCE',
] as const;
export type ErrorCode = (typeof errorCodes)[number];

export interface JoinPreview {
  billId: string;
  status: BillStatus;
  restaurantName?: string;
  table?: string;
  seats: { taken: number; limit: number };
  participants: {
    id: string;
    displayName: string;
    avatar: Avatar;
    status: 'INVITED' | 'ACTIVE' | 'SHARE_CLOSED';
    preRegisteredBy?: string;
  }[];
  hasSession: boolean;
  summary?: unknown;
}

export * from './messages.js';
