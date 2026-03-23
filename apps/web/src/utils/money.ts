const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function sanitizeMoneyInput(value: string): string {
  return value.replace(/[^\d,.-]/g, "");
}

export function parseMoneyInputToCents(value: string): number | null {
  const cleaned = sanitizeMoneyInput(value).trim();

  if (!cleaned || cleaned.includes("-")) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);

  if (separatorIndex === -1) {
    const digits = cleaned.replace(/\D/g, "");
    return digits ? Number(digits) * 100 : null;
  }

  const integerPart = cleaned.slice(0, separatorIndex).replace(/\D/g, "") || "0";
  const decimalRaw = cleaned.slice(separatorIndex + 1).replace(/\D/g, "");
  const decimalPart = (decimalRaw || "0").slice(0, 2).padEnd(2, "0");

  return Number(integerPart) * 100 + Number(decimalPart);
}

export function formatCentsToBRL(value: number): string {
  return currencyFormatter.format(value / 100);
}

export function formatCentsToInput(value: number): string {
  return decimalFormatter.format(value / 100);
}
