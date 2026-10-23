import { z } from 'zod';

export type OcrErrorCode = 'OCR-01' | 'OCR-02' | 'OCR-03' | 'OCR-04' | 'OCR-05';

export const extractedLineSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().int().min(1).max(999),
  unitPrice: z.number().int().nonnegative().optional(),
  lineTotal: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
});

export const extractedChargeSchema = z.object({
  description: z.string().min(1).max(120),
  kind: z.enum(['FEE', 'DISCOUNT']),
  amount: z.number().int().optional(),
  percentBp: z.number().int().optional(),
  confidence: z.number().min(0).max(1),
});

export const extractedReceiptSchema = z
  .object({
    restaurantName: z.string().max(160).optional(),
    table: z.string().max(40).optional(),
    receiptNumber: z.string().max(40).optional(),
    items: z.array(extractedLineSchema).min(1).max(100),
    charges: z.array(extractedChargeSchema).max(20),
    printedTotal: z.number().int().min(0).max(999_999_99).optional(),
    subtotalRead: z.number().int().nonnegative().optional(),
  })
  .superRefine((r, ctx) => {
    for (const [i, item] of r.items.entries()) {
      if (item.unitPrice !== undefined && item.quantity * item.unitPrice !== item.lineTotal) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', i, 'lineTotal'],
          message: 'quantity * unitPrice !== lineTotal',
        });
      }
      if (item.lineTotal > 999_999_99) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items', i, 'lineTotal'],
          message: 'valor acima do limite',
        });
      }
    }
    if (r.printedTotal !== undefined && r.printedTotal > 999_999_99) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['printedTotal'],
        message: 'valor acima do limite',
      });
    }
  });

export type ExtractedReceipt = z.infer<typeof extractedReceiptSchema>;
export type ExtractedLine = z.infer<typeof extractedLineSchema>;
export type ExtractedCharge = z.infer<typeof extractedChargeSchema>;

export interface ExtractionDiagnostics {
  providerMs: number;
  parserMs: number;
}

export type ExtractionResult =
  | { ok: true; receipt: ExtractedReceipt; diagnostics: ExtractionDiagnostics }
  | { ok: false; code: OcrErrorCode; detail?: string };

export interface ReceiptExtractor {
  readonly name: string;
  extract(image: Uint8Array, options: { signal: AbortSignal }): Promise<ExtractionResult>;
}
