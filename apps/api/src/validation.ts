export const TAGGY_OPTIONS = [
  "MOVE MAIS",
  "CONECTCAR",
  "SEM PARAR",
  "EDENRED",
  "VELOE",
] as const;

export const RECEIVER_OPTIONS = ["MOTORISTA", "PROPRIETÁRIO"] as const;

export type TaggyOption = (typeof TAGGY_OPTIONS)[number];
export type ReceiverOption = (typeof RECEIVER_OPTIONS)[number];

export interface FreightPayload {
  date: string;
  plate: string;
  client: string;
  loteMotz: string;
  loteAtua: string;
  taggy: TaggyOption;
  freightCents: number;
  receiver: ReceiverOption;
  observation?: string;
}

export interface ValidationResult<T> {
  data?: T;
  errors?: Record<string, string>;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const LEGACY_PLATE_REGEX = /^[A-Z]{3}-?\d{4}$/;
const MERCOSUL_PLATE_REGEX = /^[A-Z]{3}\d[A-Z]\d{2}$/;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizePlate(value: unknown): string {
  return normalizeText(value).toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function isValidDateString(value: string): boolean {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateDate(value: unknown): ValidationResult<string> {
  const date = normalizeText(value);

  if (!date) {
    return { errors: { date: "A data é obrigatória." } };
  }

  if (!isValidDateString(date)) {
    return { errors: { date: "A data deve estar no formato YYYY-MM-DD." } };
  }

  return { data: date };
}

function parseFreightCents(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

export function validateFreightPayload(payload: unknown): ValidationResult<FreightPayload> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { errors: { body: "O corpo da requisição deve ser um objeto." } };
  }

  const input = payload as Record<string, unknown>;
  const date = normalizeText(input.date);
  const plate = normalizePlate(input.plate);
  const client = normalizeText(input.client);
  const loteMotz = normalizeText(input.loteMotz);
  const loteAtua = normalizeText(input.loteAtua);
  const taggy = normalizeText(input.taggy) as TaggyOption;
  const receiver = normalizeText(input.receiver) as ReceiverOption;
  const freightCents = parseFreightCents(input.freightCents);
  const observation = normalizeText(input.observation);

  const errors: Record<string, string> = {};

  if (!date) {
    errors.date = "A data é obrigatória.";
  } else if (!isValidDateString(date)) {
    errors.date = "A data deve estar no formato YYYY-MM-DD.";
  }

  if (!plate) {
    errors.plate = "A placa é obrigatória.";
  } else if (!LEGACY_PLATE_REGEX.test(plate) && !MERCOSUL_PLATE_REGEX.test(plate)) {
    errors.plate = "A placa deve ser válida: ABC1D23 ou ABC-1234.";
  }

  if (!client) {
    errors.client = "O cliente é obrigatório.";
  }

  if (!loteMotz) {
    errors.loteMotz = "O lote MOTZ é obrigatório.";
  }

  if (!loteAtua) {
    errors.loteAtua = "O lote ATUA é obrigatório.";
  }

  if (!TAGGY_OPTIONS.includes(taggy)) {
    errors.taggy = "Selecione uma opção válida de Taggy.";
  }

  if (freightCents === null) {
    errors.freightCents = "O valor do frete deve ser um inteiro em centavos.";
  }

  if (!RECEIVER_OPTIONS.includes(receiver)) {
    errors.receiver = "Selecione um recebedor válido.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      date,
      plate,
      client,
      loteMotz,
      loteAtua,
      taggy,
      freightCents: freightCents as number,
      receiver,
      observation: observation || undefined,
    },
  };
}
