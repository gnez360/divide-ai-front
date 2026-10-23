export function money(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100);
  const centavos = String(abs % 100).padStart(2, '0');
  const grouped = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '−' : ''}R$ ${grouped},${centavos}`;
}

export function qty(n: number): string {
  return `${n}×`;
}
