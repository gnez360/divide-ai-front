import type { ErrorCode } from './index.js';
import { ui } from './ui/index.js';

/**
 * Catálogo único de textos pt-BR (CTR-02, L1).
 *
 * Chaves em inglês; este arquivo é a ÚNICA fonte de texto visível ao usuário
 * fora de `ui`... Não escreva pt-BR literal fora daqui (o lint em `apps/web/src`
 * e `packages/api/src` proíbe texto literal / acentos fora do catálogo).
 */

/** Mapa ErrorCode → mensagem canônica, usada pela API em respostas problem+json. */
export const errorMessages = {
  FORBIDDEN: 'Você não tem permissão para esta ação',
  VERSION_CONFLICT: 'Este item foi alterado por outra pessoa',
  CONSUMPTION_CHANGED: 'O consumo desta pessoa mudou',
  AMOUNT_CHANGED: 'O valor da sua parte mudou',
  REOPENS_NOT_ACCEPTED: 'Esta alteração reabriria partes que você não revisou',
  REVISION_CONFLICT: 'A conta foi atualizada; recarregue para ver o estado atual',
  SEAT_TAKEN: 'Esta vaga já foi ocupada',
  INVALID_STATE: 'Operação não permitida no estado atual da conta',
  BILL_ALREADY_CLOSED: 'A conta está finalizada e não aceita alterações',
  TABLE_FULL: 'A mesa está cheia',
  INVALID_SPLIT: 'A divisão não fecha com o total do item',
  REDUCTION_BLOCKED: 'Não é possível reduzir mais esta parte',
  NEGATIVE_SHARE: 'O desconto/ajuste deixa a parte negativa',
  DISCOUNT_EXCEEDS_RECEIPT: 'Desconto maior que o valor da comanda',
  PERCENT_MISMATCH: 'O valor não bate com o percentual informado',
  OPEN_BLOCKERS: 'Há pendências abertas na conta',
  REMOVAL_NOT_ALLOWED: 'Esta vaga já recebeu itens; remova as atribuições antes',
  LIMIT_EXCEEDED: 'Limite de vagas atingido',
  INVALID_REFERENCE: 'Registro não encontrado',
} as const satisfies Record<ErrorCode, string>;

/** Título HTTP (problem+json `title`) por status. */
export const statusTitles = {
  400: 'Requisição inválida',
  401: 'Não autorizado',
  403: 'Proibido',
  404: 'Não encontrado',
  409: 'Conflito',
  413: 'Corpo muito grande',
  415: 'Tipo não suportado',
  422: 'Não processável',
  429: 'Muitas requisições',
  500: 'Erro interno',
  503: 'Indisponível',
} as const;

/** Título HTTP (`problem+json` `title`) com fallback. */
export function statusTitle(status: number): string {
  return (statusTitles as Record<number, string>)[status] ?? 'Erro';
}

/** Mensagens `message` de problemas HTTP gerados pela API. */
export const problemMessages = {
  billNotDraft: 'a conta não está mais em rascunho',
  invalidPath: 'caminho inválido',
  invalidObjectKey: 'chave de objeto inválida',
  busy: 'conta ocupada; repita em instantes',
  payloadTooLarge: 'corpo acima de 256 KB',
  invalidBody: 'corpo inválido',
  internal: 'erro interno',
  sessionEnded: 'esta sessão foi encerrada',
  imageTooLarge: 'imagem acima de 10 MB',
  invalidJson: 'JSON inválido',
  invalidLink: 'link inválido',
  tooManyRequests: 'muitas requisições; tente em instantes',
  notFoundBill: 'não encontrada',
  notFound: 'não encontrado',
  objectNotUploaded: 'objeto não enviado',
  originNotAllowed: 'origem não permitida',
  participantUnidentified: 'participante não identificado',
  operationExpired: 'pedido expirado ou usado',
  notCreated: 'pedido não criado',
  onlyCreatorUploads: 'só o criador envia a foto',
  sessionMissing: 'sessão ausente',
  sessionExpired: 'sessão expirada',
  sessionInvalid: 'sessão inválida',
  typeMismatch: 'tipo difere do declarado',
  unsupportedMediaType: 'tipo não suportado',
  urlExpired: 'URL expirada',
  invalidUrl: 'URL inválida',
  claimNotApproved: (status: string | null | undefined) => `pedido ${status ?? 'inexistente'}`,
  envVarMissing: (name: string) => `variável de ambiente obrigatória ausente: ${name}`,
  unknownJoinTokenKid: (currentKid: string) => `JOIN_TOKEN_CURRENT_KID desconhecido: ${currentKid}`,
} as const;

/** Mensagens de validação Zod dos schemas (`@cj/contracts`). */
export const zodMessages = {
  unknownCommand: 'comando desconhecido',
  systemCommand: 'comando de sistema',
  unknownEntryCommand: 'comando de entrada desconhecido',
} as const;

/**
 * Mensagens de falha de domínio (`fail()` de `@cj/core`), uma entrada por
 * sítio de falha. Entradas idênticas a `errorMessages` reutilizam o mapa.
 */
export const domainMessages = {
  participantOnly: 'ação exclusiva de participante',
  creatorOnly: 'ação exclusiva do criador',
  participantNotFound: 'participante não encontrado',
  itemNotFound: 'item não encontrado',
  chargeNotFound: 'cobrança não encontrada',
  billClosed: 'a conta está finalizada e não aceita alterações',
  printedTotalDivergence: 'há divergência entre o total impresso e o calculado',
  lineTotalRequired: 'item por total de linha exige lineTotal',
  mergeOnlyUndivided: 'só é possível mesclar itens ainda não divididos',
  selectAtLeastOnePerson: 'selecione ao menos uma pessoa',
  amountsDoNotMatchTotal: 'a soma dos valores não fecha com o total do item',
  percentSumMustBe100: 'a soma dos percentuais deve ser 100%',
  valueDoesNotMatchPercent: 'o valor não bate com o percentual informado',
  divergenceChangedOnScreen: 'a divergência mudou desde que você abriu a tela',
  tableFull: 'a mesa está cheia',
  renameOnlyUnjoinedSeats: 'só dá para renomear vagas que ainda não entraram',
  creatorOnlyRemovesSeats: 'só o criador remove vagas',
  removalOnlyUnjoined: 'só é possível remover vagas que ainda não entraram',
  seatHasItems: 'esta vaga já recebeu itens; remova as atribuições antes',
  claimNotFound: 'pedido não encontrado',
  claimAlreadyAnswered: 'este pedido já foi respondido',
  itemsAssignedToYou: 'há itens atribuídos a você',
  shareAmountChangedOnScreen: 'o valor da sua parte mudou desde que você abriu a tela',
  useOwnCommand: 'use o comando próprio',
  itemsAssignedToPerson: 'há itens atribuídos a esta pessoa',
  openBlockers: 'há pendências abertas na conta',
  systemCommandFromClient: 'comando de sistema não pode vir do cliente',
  reopensNotReviewed: 'esta alteração reabriria partes que você não revisou',
  consumptionChanged: 'o consumo desta pessoa mudou',
  negativeShare: 'O desconto/ajuste deixa a parte negativa — ajuste os valores',
  discountExceedsReceipt: 'Desconto maior que o valor da comanda — ajuste os valores',
  invalidLink: 'link inválido',
  billUnavailable: 'conta indisponível',
  seatTaken: 'esta vaga já foi ocupada',
  claimNotClaimable: 'este participante não pode ser reivindicado',
  systemCommandInvalid: 'comando de sistema inválido',
  notPermittedInState: (what: string) => `${what} não permitido no estado atual da conta`,
  unitsFor: (sumUnits: number, quantity: number) => `${sumUnits} unidades para ${quantity}`,
  distributeAllUnits: (sumUnits: number, quantity: number) =>
    `distribua todas as unidades (${sumUnits}/${quantity})`,
  unsupportedCommand: (t: string) => `comando não suportado: ${t}`,
  entityChangedByOther: (what: string) => `o ${what} foi alterado por outra pessoa`,
  reductionBlocked: (allocatedUnits: number) =>
    `Há ${allocatedUnits} unidades distribuídas; ajuste a divisão antes de reduzir`,

  /* rótulos de operação (what) e descrições exibidas na UI */
  manualEntry: 'Digitar manualmente',
  cancelReading: 'Cancelar leitura',
  abandonReading: 'Abandonar leitura',
  tryAgain: 'Tentar de novo',
  takeAnotherPhoto: 'Tirar outra foto',
  discardReceipt: 'Descartar comanda',
  confirmReceipt: 'Confirmar comanda',
  editDetails: 'Editar detalhes',
  setPrintedTotal: 'Definir total impresso',
  addItem: 'Adicionar item',
  editItem: 'Editar item',
  deleteItem: 'Excluir item',
  restoreItem: 'Restaurar item',
  mergeItems: 'Mesclar itens',
  addCharge: 'Adicionar cobrança',
  editCharge: 'Editar cobrança',
  removeCharge: 'Remover cobrança',
  confirmCharge: 'Confirmar cobrança',
  adjustReceipt: 'Ajuste de comanda',
  splitItem: 'Dividir item',
  waivePayment: ' dispensar pagamento',
  preRegisterParticipant: 'Pré-cadastrar participante',
  renameSeat: 'Renomear vaga',
  removeParticipant: 'Remover participante',
  rotateLink: 'Rotacionar link',
  confirmConsumption: 'Confirmar consumo',
  confirmZero: 'Confirmar sem consumo',
  closeMyShare: 'Fechar minha parte',
  reopenMyShare: 'Reabrir minha parte',
  confirmOnBehalf: 'Confirmar em nome de',
  unlinkConsumptions: 'Desvincular consumos',
  closeBill: 'Fechar conta',
  whatDetails: 'detalhe da conta',
  whatItem: 'item',
  whatCharge: 'cobrança',
  whatProfile: 'seu cadastro',
  discrepancyAdjustment: 'Ajuste de divergência',
  reconciliationLine: 'Ajuste de conciliação',
} as const;

/** Textos das telas do PWA (`apps/web`), agrupados por tela em `src/ui/`. */
export { ui };

export const messages = {
  errorMessages,
  statusTitles,
  problemMessages,
  zodMessages,
  domainMessages,
  ui,
} as const;
