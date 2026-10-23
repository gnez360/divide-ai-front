/**
 * Gera os vetores canônicos (§4.5, §17.2) a partir dos enunciados de spec.md:
 * dataset §2.6, estados E-1/E-2 §2.7 e os aceites numéricos CA-A4, CA-C5, CA-C8,
 * CA-D2, CA-D4, CA-D6 a CA-D14. Regenerar: `npx tsx test/vectors/gen-vectors.ts`.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tieBreakHex } from '../../src/calc.js';

type Alloc = { participantId: string; units?: number; fixedAmount?: number; percentBp?: number };
type AnyRec = Record<string, unknown>;

const P = {
  nery: 'a1000000-0000-4000-8000-000000000001',
  ray: 'a1000000-0000-4000-8000-000000000002',
  nath: 'a1000000-0000-4000-8000-000000000003',
  davi: 'a1000000-0000-4000-8000-000000000004',
  thais: 'a1000000-0000-4000-8000-000000000005',
  gabriel: 'a1000000-0000-4000-8000-000000000006',
  ana: 'a1000000-0000-4000-8000-000000000007',
};
const BILL = 'b1000000-0000-4000-8000-000000000001';
const I = {
  pizza: 'd1000000-0000-4000-8000-000000000001',
  cerveja: 'd1000000-0000-4000-8000-000000000002',
  refri: 'd1000000-0000-4000-8000-000000000003',
  batata: 'd1000000-0000-4000-8000-000000000004',
  extra: 'd1000000-0000-4000-8000-000000000005',
  c8: 'd1000000-0000-4000-8000-000000000008',
  c5: 'd1000000-0000-4000-8000-000000000005',
  d2: 'd1000000-0000-4000-8000-000000000012',
  d13: 'd1000000-0000-4000-8000-000000000013',
  d4: 'd1000000-0000-4000-8000-000000000009',
};
const C = {
  servico: 'c1000000-0000-4000-8000-000000000001',
  taxa: 'c1000000-0000-4000-8000-000000000002',
  couvert: 'c1000000-0000-4000-8000-000000000003',
  gorjeta: 'c1000000-0000-4000-8000-000000000004',
  desconto: 'c1000000-0000-4000-8000-000000000005',
  servicoPct: 'c1000000-0000-4000-8000-000000000006',
};

const NOW = '2026-10-23T12:00:00.000Z';

function participant(id: string, name: string, joinOrder: number): AnyRec {
  return {
    id,
    displayName: name,
    avatar: { initial: name[0]!.toUpperCase(), color: 'blue' },
    status: 'ACTIVE',
    consumptionConfirmed: true,
    confirmationSource: 'SELF',
    confirmedBy: id,
    confirmedAt: NOW,
    consumptionVersion: 0,
    closedShareAmount: null,
    shareClosedAt: null,
    preRegisteredBy: null,
    joinedAt: NOW,
    joinOrder,
    anonymized: false,
    version: 1,
  };
}

function item(id: string, over: AnyRec): AnyRec {
  return {
    id,
    name: 'Item',
    quantity: 1,
    priceMode: 'UNIT_PRICE',
    unitPrice: 1000,
    lineTotal: 1000,
    splitMode: null,
    allocations: [],
    origin: 'MANUAL',
    deletedAt: null,
    deletedBy: null,
    version: 1,
    ...over,
  };
}

function charge(id: string, over: AnyRec): AnyRec {
  return {
    id,
    description: 'Serviço',
    kind: 'FEE',
    scope: 'RECEIPT',
    amount: 0,
    percentBp: null,
    amountSource: 'MANUAL',
    origin: 'MANUAL',
    distribution: 'PROPORTIONAL',
    splitAmong: [],
    waiver: 'NONE',
    waivedFor: [],
    confirmed: true,
    confirmedBy: null,
    reviewReason: null,
    version: 1,
    ...over,
  };
}

function doc(over: AnyRec): AnyRec {
  return {
    schemaVersion: 1,
    id: BILL,
    status: 'OPEN',
    createdBy: P.nery,
    details: { version: 1 },
    printedTotal: null,
    seatLimit: 8,
    ocrAttempt: null,
    items: [],
    charges: [],
    participants: [],
    claims: [],
    receiptConfirmedAt: NOW,
    closedAt: null,
    createdAt: NOW,
    ...over,
  };
}

const people = () => [
  participant(P.nery, 'Nery', 1),
  participant(P.ray, 'Ray', 2),
  participant(P.nath, 'Nath', 3),
  participant(P.davi, 'Davi', 4),
  participant(P.thais, 'Thais', 5),
  participant(P.gabriel, 'Gabriel', 6),
];

const servico2100 = () =>
  charge(C.servico, {
    description: 'Serviço 10%',
    amount: 2100,
    amountSource: 'PRINTED',
    confirmedBy: P.nery,
  });

const unidade = (pid: string, units: number): Alloc => ({ participantId: pid, units });
const fixo = (pid: string, fixedAmount: number): Alloc => ({ participantId: pid, fixedAmount });

/** Divisão canônica do dataset (§2.6). `dividida` controla quais itens têm split. */
function datasetDoc(state: 'FINAL' | 'E1' | 'E2', extra: AnyRec = {}): AnyRec {
  const split = {
    pizza: true, // a pizza é dividida em todos os estados de referência
    cerveja: state !== 'E1',
    refri: state !== 'E1',
    batata: state === 'FINAL',
  };
  const items = [
    item(I.pizza, {
      name: 'Pizza Margherita',
      quantity: 1,
      unitPrice: 12000,
      lineTotal: 12000,
      splitMode: split.pizza ? 'CUSTOM_AMOUNT' : null,
      allocations: split.pizza ? [fixo(P.nery, 4000), fixo(P.ray, 4000), fixo(P.nath, 4000)] : [],
    }),
    item(I.cerveja, {
      name: 'Cerveja',
      quantity: 4,
      unitPrice: 900,
      lineTotal: 3600,
      splitMode: split.cerveja ? 'BY_UNITS' : null,
      allocations: split.cerveja
        ? [unidade(P.nery, 1), unidade(P.ray, 1), unidade(P.nath, 1), unidade(P.davi, 1)]
        : [],
    }),
    item(I.refri, {
      name: 'Refrigerante',
      quantity: 4,
      unitPrice: 600,
      lineTotal: 2400,
      splitMode: split.refri ? 'BY_UNITS' : null,
      allocations: split.refri
        ? [unidade(P.davi, 1), unidade(P.thais, 2), unidade(P.gabriel, 1)]
        : [],
    }),
    item(I.batata, {
      name: 'Batata frita',
      quantity: 1,
      unitPrice: 3000,
      lineTotal: 3000,
      splitMode: split.batata ? 'CUSTOM_AMOUNT' : null,
      allocations: split.batata ? [fixo(P.nery, 1000), fixo(P.ray, 1000), fixo(P.nath, 1000)] : [],
    }),
  ];
  return doc({
    items,
    charges: [servico2100()],
    printedTotal: 23100,
    participants: people(),
    ...extra,
  });
}

/** menor hash(contexto:id) entre os ids — replicado do §7.9 p/ fixar o centavo no vetor. */
function minHash(context: string, ids: string[]): string {
  return [...ids].sort((a, b) => {
    const ha = tieBreakHex(context, a);
    const hb = tieBreakHex(context, b);
    return ha < hb ? -1 : ha > hb ? 1 : 0;
  })[0]!;
}

type Vector = {
  id: string;
  title: string;
  source: string;
  document: AnyRec;
  commands?: AnyRec[];
  actor?: string;
  expect: AnyRec;
};

const V: Vector[] = [];
const push = (v: Vector) => V.push(v);

// ── dataset §2.6 (estado Final) ─────────────────────────────────────────────
push({
  id: 'dataset',
  title: 'Dataset canônico — estado Final (§2.6)',
  source: 'spec.md §2.6',
  document: datasetDoc('FINAL'),
  expect: {
    totals: {
      itemsTotal: 21000,
      receiptTotal: 23100,
      difference: 0,
      reconciliationAdjustment: 0,
      reconciledTotal: 23100,
      waivedTotal: 0,
      totalMesa: 0,
      amountDue: 23100,
    },
    shares: {
      [P.nery]: { consumption: 5900, amount: 6490, adjustment: 0 },
      [P.ray]: { consumption: 5900, amount: 6490 },
      [P.nath]: { consumption: 5900, amount: 6490 },
      [P.davi]: { consumption: 1500, amount: 1650 },
      [P.thais]: { consumption: 1200, amount: 1320 },
      [P.gabriel]: { consumption: 600, amount: 660 },
    },
    charges: {
      [C.servico]: {
        portions: {
          [P.nery]: 590,
          [P.ray]: 590,
          [P.nath]: 590,
          [P.davi]: 150,
          [P.thais]: 120,
          [P.gabriel]: 60,
        },
        unassigned: 0,
      },
    },
    items: {
      [I.pizza]: { status: 'SPLIT', unassigned: 0 },
      [I.cerveja]: { status: 'SPLIT', unassigned: 0 },
      [I.refri]: { status: 'SPLIT', unassigned: 0 },
      [I.batata]: { status: 'SPLIT', unassigned: 0 },
    },
    unallocated: { total: 0, bySource: { items: 0, charges: 0, adjustment: 0 } },
    blockers: [],
  },
});

// ── E-1 §2.7: só a pizza ────────────────────────────────────────────────────
push({
  id: 'e1',
  title: 'Estado E-1 (§2.7): só a pizza dividida; serviço de Nery = (2100×4000)/21000 = 400',
  source: 'spec.md §2.7, §7.7.1',
  document: datasetDoc('E1'),
  expect: {
    shares: {
      [P.nery]: { consumption: 4000, amount: 4400 },
      [P.ray]: { consumption: 4000, amount: 4400 },
      [P.nath]: { consumption: 4000, amount: 4400 },
      [P.davi]: { amount: 0 },
      [P.thais]: { amount: 0 },
      [P.gabriel]: { amount: 0 },
    },
    charges: {
      [C.servico]: {
        portions: { [P.nery]: 400, [P.ray]: 400, [P.nath]: 400 },
        unassigned: 900,
      },
    },
    unallocated: { total: 9900, bySource: { items: 9000, charges: 900 } },
    totals: { reconciledTotal: 23100, amountDue: 23100 },
    blockers: ['ITEM_NAO_DIVIDIDO', 'ITEM_NAO_DIVIDIDO', 'ITEM_NAO_DIVIDIDO'],
  },
});

// ── E-2 §2.7: tudo menos a batata ───────────────────────────────────────────
push({
  id: 'e2',
  title: 'Estado E-2 (§2.7): tudo dividido menos a batata; saldo 33,00',
  source: 'spec.md §2.7',
  document: datasetDoc('E2'),
  expect: {
    shares: {
      [P.nery]: { consumption: 4900, amount: 5390 },
      [P.ray]: { consumption: 4900, amount: 5390 },
      [P.nath]: { consumption: 4900, amount: 5390 },
      [P.davi]: { consumption: 1500, amount: 1650 },
      [P.thais]: { consumption: 1200, amount: 1320 },
      [P.gabriel]: { consumption: 600, amount: 660 },
    },
    charges: {
      [C.servico]: {
        portions: {
          [P.nery]: 490,
          [P.ray]: 490,
          [P.nath]: 490,
          [P.davi]: 150,
          [P.thais]: 120,
          [P.gabriel]: 60,
        },
        unassigned: 300,
      },
    },
    unallocated: { total: 3300, bySource: { items: 3000, charges: 300 } },
    blockers: ['ITEM_NAO_DIVIDIDO'],
  },
});

// ── CA-A4: tolerância de centavos (§11.A) ───────────────────────────────────
push({
  id: 'ca-a4',
  title: 'CA-A4: total impresso 231,03 → ajusteConciliacao +3; Nery/Ray/Nath 64,91',
  source: 'spec.md CA-A4 (§11.A)',
  document: datasetDoc('FINAL', { printedTotal: 23103 }),
  expect: {
    totals: {
      difference: 3,
      reconciliationAdjustment: 3,
      reconciledTotal: 23103,
      amountDue: 23103,
    },
    shares: {
      [P.nery]: { amount: 6491, adjustment: 1 },
      [P.ray]: { amount: 6491, adjustment: 1 },
      [P.nath]: { amount: 6491, adjustment: 1 },
      [P.davi]: { amount: 1650, adjustment: 0 },
      [P.thais]: { amount: 1320, adjustment: 0 },
      [P.gabriel]: { amount: 660, adjustment: 0 },
    },
    blockers: [],
  },
});

// ── CA-C5: percentual guardado (§11.C) ──────────────────────────────────────
const c5Winner = minHash(`item:${I.c5}`, [P.nery, P.ray]);
const c5Loser = c5Winner === P.nery ? P.ray : P.nery;
const c5Item = (lineTotal: number) =>
  item(I.c5, {
    name: 'Batata frita',
    quantity: 1,
    priceMode: 'LINE_TOTAL',
    unitPrice: null,
    lineTotal,
    splitMode: 'CUSTOM_PERCENT',
    allocations: [
      { participantId: P.nery, percentBp: 5000 },
      { participantId: P.ray, percentBp: 5000 },
    ],
  });
const c5Doc = (lineTotal: number) =>
  doc({
    participants: [participant(P.nery, 'Nery', 1), participant(P.ray, 'Ray', 2)],
    items: [c5Item(lineTotal)],
    createdBy: P.nery,
  });
push({
  id: 'ca-c5a',
  title: 'CA-C5: item R$ 0,01 com 50%/50% → 0,01/0,00 pelo desempate',
  source: 'spec.md CA-C5 (§11.C)',
  document: c5Doc(1),
  expect: {
    shares: {
      [c5Winner]: { amount: 1 },
      [c5Loser]: { amount: 0 },
    },
    items: { [I.c5]: { status: 'SPLIT', unassigned: 0 } },
  },
});
push({
  id: 'ca-c5b',
  title: 'CA-C5: percentual persiste — item passa a R$ 0,02 → 0,01/0,01',
  source: 'spec.md CA-C5 (§11.C)',
  document: c5Doc(1),
  commands: [{ type: 'EDIT_ITEM', itemId: I.c5, lineTotal: 2 }],
  actor: P.nery,
  expect: {
    shares: { [P.nery]: { amount: 1 }, [P.ray]: { amount: 1 } },
    items: { [I.c5]: { status: 'SPLIT', unassigned: 0 } },
  },
});
push({
  id: 'ca-c5c',
  title: 'CA-C5: batata R$ 30,00 com 30%/30% → 9,00/9,00 e faltam R$ 12,00',
  source: 'spec.md CA-C5 (§11.C)',
  document: doc({
    participants: [participant(P.nery, 'Nery', 1), participant(P.ray, 'Ray', 2)],
    createdBy: P.nery,
    items: [
      item(I.batata, {
        name: 'Batata frita',
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 3000,
        splitMode: 'CUSTOM_PERCENT',
        allocations: [
          { participantId: P.nery, percentBp: 3000 },
          { participantId: P.ray, percentBp: 3000 },
        ],
      }),
    ],
  }),
  expect: {
    shares: { [P.nery]: { amount: 900 }, [P.ray]: { amount: 900 } },
    items: { [I.batata]: { status: 'PARTIAL', unassigned: 1200 } },
    blockers: ['DIVISAO_INCOMPLETA'],
  },
});
push({
  id: 'ca-c5d',
  title: 'CA-C5: soma de percentuais acima de 100% é rejeitada',
  source: 'spec.md CA-C5 (§11.C)',
  document: doc({
    participants: [participant(P.nery, 'Nery', 1), participant(P.ray, 'Ray', 2)],
    createdBy: P.nery,
    items: [
      item(I.batata, {
        name: 'Batata frita',
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 3000,
      }),
    ],
  }),
  commands: [
    {
      type: 'SET_SPLIT',
      itemId: I.batata,
      mode: 'CUSTOM_PERCENT',
      allocations: [
        { participantId: P.nery, percentBp: 5000 },
        { participantId: P.ray, percentBp: 6000 },
      ],
    },
  ],
  actor: P.nery,
  expect: { error: 'INVALID_SPLIT' },
});

// ── CA-C8: unidades por total da linha (§11.C) ──────────────────────────────
const c8Item = (allocations: Alloc[]) =>
  item(I.c8, {
    name: 'Cerveja',
    quantity: 3,
    priceMode: 'LINE_TOTAL',
    unitPrice: null,
    lineTotal: 10000,
    splitMode: 'BY_UNITS',
    allocations,
  });
const c8Doc = (allocations: Alloc[]) =>
  doc({
    participants: [participant(P.nery, 'Nery', 1), participant(P.ray, 'Ray', 2)],
    createdBy: P.nery,
    items: [c8Item(allocations)],
  });
push({
  id: 'ca-c8',
  title: 'CA-C8: 3 un · R$ 10,00 com Nery 2 e Ray 1 → 6,67/3,33',
  source: 'spec.md CA-C8 (§11.C)',
  document: c8Doc([unidade(P.nery, 2), unidade(P.ray, 1)]),
  expect: {
    shares: { [P.nery]: { amount: 6667 }, [P.ray]: { amount: 3333 } },
    items: { [I.c8]: { status: 'SPLIT', unassigned: 0 } },
  },
});
push({
  id: 'ca-c8b',
  title: 'CA-C8: trocar a ordem das pessoas não muda o resultado',
  source: 'spec.md CA-C8 (§11.C)',
  document: c8Doc([unidade(P.ray, 1), unidade(P.nery, 2)]),
  expect: {
    shares: { [P.nery]: { amount: 6667 }, [P.ray]: { amount: 3333 } },
  },
});

// ── CA-D2: Maior Resto (§11.D) ──────────────────────────────────────────────
const d2Winner = minHash(`item:${I.d2}`, [P.nery, P.ray, P.nath]);
const d2Losers = [P.nery, P.ray, P.nath].filter((id) => id !== d2Winner);
push({
  id: 'ca-d2',
  title: 'CA-D2: R$ 100,00 ÷ 3 → 33,34/33,33/33,33; centavo no menor hash',
  source: 'spec.md CA-D2 (§11.D), §7.9',
  document: doc({
    participants: [
      participant(P.nery, 'Nery', 1),
      participant(P.ray, 'Ray', 2),
      participant(P.nath, 'Nath', 3),
    ],
    createdBy: P.nery,
    items: [
      item(I.d2, {
        name: 'Conta',
        quantity: 1,
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 10000,
        splitMode: 'EQUAL',
        allocations: [
          { participantId: P.nery },
          { participantId: P.ray },
          { participantId: P.nath },
        ],
      }),
    ],
  }),
  expect: {
    shares: {
      [d2Winner]: { amount: 3334 },
      [d2Losers[0]!]: { amount: 3333 },
      [d2Losers[1]!]: { amount: 3333 },
    },
    items: { [I.d2]: { status: 'SPLIT', unassigned: 0 } },
  },
});

// ── CA-D4: arredondamento do percentual (§11.D) ─────────────────────────────
push({
  id: 'ca-d4',
  title: 'CA-D4: itens R$ 123,45 e serviço 10% sem valor impresso → R$ 12,35 (meio para cima)',
  source: 'spec.md CA-D4 (§11.D), §7.1',
  document: doc({
    participants: [participant(P.nery, 'Nery', 1)],
    createdBy: P.nery,
    items: [
      item(I.d4, {
        name: 'Consumo',
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 12345,
        splitMode: 'CUSTOM_AMOUNT',
        allocations: [fixo(P.nery, 12345)],
      }),
    ],
    charges: [
      charge(C.servicoPct, {
        description: 'Serviço 10%',
        amount: 0,
        percentBp: 1000,
        amountSource: 'FROM_PERCENT',
      }),
    ],
  }),
  expect: {
    charges: { [C.servicoPct]: { portions: { [P.nery]: 1235 }, base: 12345, unassigned: 0 } },
    shares: { [P.nery]: { consumption: 12345, amount: 13580 } },
    totals: { itemsTotal: 12345, receiptTotal: 13580 },
  },
});

// ── CA-D6: parte negativa rejeitada (§11.D) ─────────────────────────────────
push({
  id: 'ca-d6',
  title: 'CA-D6: desconto proporcional deixa A −30,00 → 422 NEGATIVE_SHARE, sem piso',
  source: 'spec.md CA-D6 (§11.D), §7.10',
  document: doc({
    participants: [participant(P.nery, 'Nery', 1), participant(P.ray, 'Ray', 2)],
    createdBy: P.nery,
    items: [
      item(I.extra, {
        name: 'Consumo de A',
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 10000,
        splitMode: 'CUSTOM_AMOUNT',
        allocations: [fixo(P.nery, 10000)],
      }),
    ],
    charges: [
      charge(C.taxa, {
        description: 'Taxa',
        amount: 10000,
        distribution: 'EQUAL_PER_PERSON',
        splitAmong: [P.nery, P.ray],
      }),
    ],
  }),
  commands: [
    {
      type: 'ADD_CHARGE',
      description: 'Desconto proporcional',
      kind: 'DISCOUNT',
      amount: 18000,
      distribution: 'PROPORTIONAL',
    },
  ],
  actor: P.nery,
  expect: { error: 'NEGATIVE_SHARE' },
});

// ── CA-D7: estado parcial; serviço de quem não está na cerveja não muda ──────
push({
  id: 'ca-d7',
  title:
    'CA-D7: E-1 + dividir cerveja entre Nery/Ray/Nath/Davi; Thais e Gabriel continuam sem serviço',
  source: 'spec.md CA-D7 (§11.D)',
  document: datasetDoc('E1'),
  commands: [
    {
      type: 'SET_SPLIT',
      itemId: I.cerveja,
      mode: 'BY_UNITS',
      allocations: [unidade(P.nery, 1), unidade(P.ray, 1), unidade(P.nath, 1), unidade(P.davi, 1)],
    },
  ],
  actor: P.nery,
  expect: {
    shares: {
      [P.nery]: { amount: 5390 },
      [P.ray]: { amount: 5390 },
      [P.nath]: { amount: 5390 },
      [P.davi]: { amount: 990 },
      [P.thais]: { amount: 0 },
      [P.gabriel]: { amount: 0 },
    },
    charges: {
      [C.servico]: {
        portions: { [P.nery]: 490, [P.ray]: 490, [P.nath]: 490, [P.davi]: 90 },
        unassigned: 540,
      },
    },
    unallocated: { total: 5940, bySource: { items: 5400, charges: 540 } },
    blockers: ['ITEM_NAO_DIVIDIDO', 'ITEM_NAO_DIVIDIDO'],
  },
});

// ── CA-D8: arredondamento final (§11.D) ─────────────────────────────────────
const d8Doc = () =>
  doc({
    participants: [
      participant(P.nery, 'Nery', 1),
      participant(P.ray, 'Ray', 2),
      participant(P.ana, 'Ana', 3),
    ],
    createdBy: P.nery,
    items: [
      item(I.pizza, {
        name: 'A',
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 1000,
        splitMode: 'CUSTOM_AMOUNT',
        allocations: [fixo(P.nery, 1000)],
      }),
      item(I.cerveja, {
        name: 'B',
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 1000,
        splitMode: 'CUSTOM_AMOUNT',
        allocations: [fixo(P.ray, 1000)],
      }),
      item(I.extra, {
        name: 'Sem dono',
        quantity: 1,
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 1000,
      }),
    ],
    charges: [charge(C.servico, { description: 'Serviço', amount: 100 })],
  });
const d8Winner = minHash(`charge:${C.servico}`, [P.nery, P.ray, P.ana]);
push({
  id: 'ca-d8',
  title:
    'CA-D8: serviço de R$ 1,00 com item sem dono → 0,33/0,33 + saldo; atribuído a C, Maior Resto distribui os centavos',
  source: 'spec.md CA-D8 (§11.D), §7.7.1',
  document: d8Doc(),
  commands: [
    {
      type: 'SET_SPLIT',
      itemId: I.extra,
      mode: 'CUSTOM_AMOUNT',
      allocations: [fixo(P.ana, 1000)],
    },
  ],
  actor: P.nery,
  expect: {
    charges: {
      [C.servico]: {
        portions: { [P.nery]: 33, [P.ray]: 33, [d8Winner]: 34 },
        unassigned: 0,
      },
    },
    unallocated: { total: 0 },
    totals: { amountDue: 3100 },
  },
});

// ── CA-D9: taxa igual por pessoa (§11.D) ────────────────────────────────────
push({
  id: 'ca-d9a',
  title: 'CA-D9: couvert R$ 90,00 ainda sem quem divide → saldo e COBRANCA_SEM_RATEIO',
  source: 'spec.md CA-D9 (§11.D), §7.7.2',
  document: doc({
    participants: people(),
    createdBy: P.nery,
    charges: [
      charge(C.couvert, {
        description: 'Couvert artístico',
        amount: 9000,
        distribution: 'EQUAL_PER_PERSON',
        splitAmong: [],
      }),
    ],
  }),
  expect: {
    unallocated: { total: 9000, bySource: { charges: 9000 } },
    blockers: ['COBRANCA_SEM_RATEIO'],
    totals: { receiptTotal: 9000, amountDue: 9000 },
  },
});
push({
  id: 'ca-d9b',
  title: 'CA-D9: couvert entre as 6 pessoas → 15,00 cada; quem entra depois não é incluído',
  source: 'spec.md CA-D9 (§11.D), §7.7.2',
  document: doc({
    participants: [...people(), participant(P.ana, 'Ana', 7)],
    createdBy: P.nery,
    charges: [
      charge(C.couvert, {
        description: 'Couvert artístico',
        amount: 9000,
        distribution: 'EQUAL_PER_PERSON',
        splitAmong: [P.nery, P.ray, P.nath, P.davi, P.thais, P.gabriel],
      }),
    ],
  }),
  expect: {
    charges: {
      [C.couvert]: {
        portions: {
          [P.nery]: 1500,
          [P.ray]: 1500,
          [P.nath]: 1500,
          [P.davi]: 1500,
          [P.thais]: 1500,
          [P.gabriel]: 1500,
        },
        unassigned: 0,
      },
    },
    shares: {
      [P.nery]: { amount: 1500 },
      [P.ana]: { amount: 0 },
    },
    blockers: [],
  },
});

// ── CA-D10: dispensa parcial do serviço (§11.D) ─────────────────────────────
push({
  id: 'ca-d10',
  title: 'CA-D10: Davi, Thais e Gabriel dispensados do serviço → total a pagar 227,70',
  source: 'spec.md CA-D10 (§11.D), §7.7.3',
  document: datasetDoc('FINAL'),
  commands: [
    {
      type: 'SET_WAIVER',
      chargeId: C.servico,
      waiver: 'PARTIAL',
      waivedFor: [P.davi, P.thais, P.gabriel],
    },
  ],
  actor: P.nery,
  expect: {
    shares: {
      [P.nery]: { amount: 6490 },
      [P.ray]: { amount: 6490 },
      [P.nath]: { amount: 6490 },
      [P.davi]: { amount: 1500 },
      [P.thais]: { amount: 1200 },
      [P.gabriel]: { amount: 600 },
    },
    charges: {
      [C.servico]: {
        portions: { [P.nery]: 590, [P.ray]: 590, [P.nath]: 590 },
        waived: { [P.davi]: 150, [P.thais]: 120, [P.gabriel]: 60 },
        unassigned: 0,
      },
    },
    totals: { reconciledTotal: 23100, waivedTotal: 330, amountDue: 22770 },
    blockers: [],
  },
});

// ── CA-D11: dispensa total (§11.D) ──────────────────────────────────────────
push({
  id: 'ca-d11',
  title: 'CA-D11: "Ninguém paga" o serviço → total a pagar 210,00, sem divergência',
  source: 'spec.md CA-D11 (§11.D), §7.7.3',
  document: datasetDoc('FINAL'),
  commands: [
    {
      type: 'SET_WAIVER',
      chargeId: C.servico,
      waiver: 'FULL',
      waivedFor: [P.nery, P.ray, P.nath, P.davi, P.thais, P.gabriel],
    },
  ],
  actor: P.nery,
  expect: {
    shares: {
      [P.nery]: { amount: 5900 },
      [P.ray]: { amount: 5900 },
      [P.nath]: { amount: 5900 },
      [P.davi]: { amount: 1500 },
      [P.thais]: { amount: 1200 },
      [P.gabriel]: { amount: 600 },
    },
    charges: { [C.servico]: { portions: {}, unassigned: 0 } },
    totals: {
      difference: 0,
      reconciledTotal: 23100,
      waivedTotal: 2100,
      amountDue: 21000,
    },
  },
});

// ── CA-D12: gorjeta extra (§11.D) ───────────────────────────────────────────
push({
  id: 'ca-d12',
  title: 'CA-D12: gorjeta de mesa R$ 12,00 igual entre os 6 → Nery 66,90; total a pagar 243,00',
  source: 'spec.md CA-D12 (§11.D), §7.4',
  document: doc({
    participants: people(),
    createdBy: P.nery,
    items: datasetDoc('FINAL').items as AnyRec[],
    charges: [
      servico2100(),
      charge(C.gorjeta, {
        description: 'Gorjeta extra',
        scope: 'TABLE',
        amount: 1200,
        distribution: 'EQUAL_PER_PERSON',
        splitAmong: [P.nery, P.ray, P.nath, P.davi, P.thais, P.gabriel],
      }),
    ],
    printedTotal: 23100,
  }),
  expect: {
    shares: {
      [P.nery]: { amount: 6690 },
      [P.gabriel]: { amount: 860 },
    },
    charges: {
      [C.gorjeta]: {
        portions: {
          [P.nery]: 200,
          [P.ray]: 200,
          [P.nath]: 200,
          [P.davi]: 200,
          [P.thais]: 200,
          [P.gabriel]: 200,
        },
        unassigned: 0,
      },
    },
    totals: { receiptTotal: 23100, difference: 0, totalMesa: 1200, amountDue: 24300 },
  },
});

// ── CA-D13: linha sem unitário exato (§11.D) ────────────────────────────────
const d13Winner = minHash(`item:${I.d13}`, [P.nery, P.ray, P.nath]);
const d13Losers = [P.nery, P.ray, P.nath].filter((id) => id !== d13Winner);
push({
  id: 'ca-d13',
  title: 'CA-D13: 3 un · R$ 10,00 em TOTAL_LINHA distribuídas 1/1/1 → somam exatamente R$ 10,00',
  source: 'spec.md CA-D13 (§11.D)',
  document: doc({
    participants: [
      participant(P.nery, 'Nery', 1),
      participant(P.ray, 'Ray', 2),
      participant(P.nath, 'Nath', 3),
    ],
    createdBy: P.nery,
    items: [
      item(I.d13, {
        name: 'Cerveja',
        quantity: 3,
        priceMode: 'LINE_TOTAL',
        unitPrice: null,
        lineTotal: 10000,
        splitMode: 'BY_UNITS',
        allocations: [unidade(P.nery, 1), unidade(P.ray, 1), unidade(P.nath, 1)],
      }),
    ],
  }),
  expect: {
    shares: {
      [d13Winner]: { amount: 3334 },
      [d13Losers[0]!]: { amount: 3333 },
      [d13Losers[1]!]: { amount: 3333 },
    },
    items: { [I.d13]: { status: 'SPLIT', unassigned: 0 } },
  },
});

// ── CA-D14: ajuste de conciliação positivo e negativo (§11.D) ───────────────
function d14(printed: number, printedLabel: string): Vector {
  // entre Nery/Ray/Nath os restos empatam — o hash decide a ordem (§7.9)
  const order3 = [P.nery, P.ray, P.nath].sort((a, b) => {
    const ha = tieBreakHex(`bill:${BILL}`, a);
    const hb = tieBreakHex(`bill:${BILL}`, b);
    return ha < hb ? -1 : ha > hb ? 1 : 0;
  });
  const shares: AnyRec = {
    [P.gabriel]: { amount: 660, adjustment: 0 },
  };
  if (printed === 23101) {
    // +1: bases 0; só o menor hash entre os três empatados recebe o centavo
    for (const id of [P.nery, P.ray, P.nath]) {
      shares[id] = { amount: id === order3[0] ? 6491 : 6490, adjustment: id === order3[0] ? 1 : 0 };
    }
    shares[P.davi] = { amount: 1650, adjustment: 0 };
    shares[P.thais] = { amount: 1320, adjustment: 0 };
  } else if (printed === 23105) {
    // +5: bases 1/1/1 ((5×5900)/21000) e leftover 2 → os dois menores hashes +1 cada
    for (const [rank, id] of order3.entries()) {
      const adj = rank < 2 ? 2 : 1;
      shares[id] = { amount: 6490 + adj, adjustment: adj };
    }
    shares[P.davi] = { amount: 1650, adjustment: 0 };
    shares[P.thais] = { amount: 1320, adjustment: 0 };
  } else if (printed === 23099) {
    // −1: mesmas bases 0; disputa por hash com sinal negativo
    for (const id of [P.nery, P.ray, P.nath]) {
      shares[id] = {
        amount: id === order3[0] ? 6489 : 6490,
        adjustment: id === order3[0] ? -1 : 0,
      };
    }
    shares[P.davi] = { amount: 1650, adjustment: 0 };
    shares[P.thais] = { amount: 1320, adjustment: 0 };
  } else {
    // −5: bases −1/−1/−1 e leftover −2 → os dois menores hashes −1 extra
    for (const [rank, id] of order3.entries()) {
      const adj = rank < 2 ? -2 : -1;
      shares[id] = { amount: 6490 + adj, adjustment: adj };
    }
    shares[P.davi] = { amount: 1650, adjustment: 0 };
    shares[P.thais] = { amount: 1320, adjustment: 0 };
  }
  return {
    id: `ca-d14-${printedLabel}`,
    title: `CA-D14: ajuste de conciliação ${printedLabel} sobre o estado final — determinístico, sem parte negativa, Σ = total impresso`,
    source: 'spec.md CA-D14 (§11.D), §7.7.4',
    document: datasetDoc('FINAL', { printedTotal: printed }),
    expect: {
      totals: {
        difference: printed - 23100,
        reconciliationAdjustment: printed - 23100,
        reconciledTotal: printed,
        amountDue: printed,
      },
      shares,
      blockers: [],
    },
  };
}
push(d14(23101, 'p1'));
push(d14(23105, 'p5'));
push(d14(23099, 'n1'));
push(d14(23095, 'n5'));

// ── escrita ─────────────────────────────────────────────────────────────────
const dir = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });
for (const v of V) {
  writeFileSync(path.join(dir, `${v.id}.json`), JSON.stringify(v, null, 2) + '\n', 'utf8');
}
console.log(`vectors: ${V.length} escritos em ${dir}`);
