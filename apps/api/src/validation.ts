export const DEFAULT_TAGGY_OPTIONS = [
  "MOVE MAIS",
  "CONECTCAR",
  "SEM PARAR",
  "EDENRED",
  "VELOE",
] as const;

export const RECEIVER_OPTIONS = ["MOTORISTA", "PROPRIET\u00c1RIO"] as const;

export type TaggyOption = string;
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
const MAX_TAGGY_LENGTH = 40;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizeTaggyName(value: unknown): string {
  return normalizeText(value).toUpperCase();
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
    return { errors: { date: "A data \u00e9 obrigat\u00f3ria." } };
  }

  if (!isValidDateString(date)) {
    return { errors: { date: "A data deve estar no formato YYYY-MM-DD." } };
  }

  return { data: date };
}

export function validateTaggyOptionName(value: unknown): ValidationResult<string> {
  const name = normalizeTaggyName(value);

  if (!name) {
    return { errors: { name: "Informe o nome da Taggy." } };
  }

  if (name.length > MAX_TAGGY_LENGTH) {
    return { errors: { name: `A Taggy deve ter no m\u00e1ximo ${MAX_TAGGY_LENGTH} caracteres.` } };
  }

  return { data: name };
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
    return { errors: { body: "O corpo da requisi\u00e7\u00e3o deve ser um objeto." } };
  }

  const input = payload as Record<string, unknown>;
  const date = normalizeText(input.date);
  const plate = normalizePlate(input.plate);
  const client = normalizeText(input.client);
  const loteMotz = normalizeText(input.loteMotz);
  const loteAtua = normalizeText(input.loteAtua);
  const taggy = normalizeTaggyName(input.taggy) as TaggyOption;
  const receiver = normalizeText(input.receiver) as ReceiverOption;
  const freightCents = parseFreightCents(input.freightCents);
  const observation = normalizeText(input.observation);

  const errors: Record<string, string> = {};

  if (!date) {
    errors.date = "A data \u00e9 obrigat\u00f3ria.";
  } else if (!isValidDateString(date)) {
    errors.date = "A data deve estar no formato YYYY-MM-DD.";
  }

  if (!plate) {
    errors.plate = "A placa \u00e9 obrigat\u00f3ria.";
  } else if (!LEGACY_PLATE_REGEX.test(plate) && !MERCOSUL_PLATE_REGEX.test(plate)) {
    errors.plate = "A placa deve ser v\u00e1lida: ABC1D23 ou ABC-1234.";
  }

  if (!client) {
    errors.client = "O cliente \u00e9 obrigat\u00f3rio.";
  }

  if (!loteMotz) {
    errors.loteMotz = "O lote MOTZ \u00e9 obrigat\u00f3rio.";
  }

  if (!loteAtua) {
    errors.loteAtua = "O lote ATUA \u00e9 obrigat\u00f3rio.";
  }

  if (!taggy) {
    errors.taggy = "Selecione uma op\u00e7\u00e3o v\u00e1lida de Taggy.";
  } else if (taggy.length > MAX_TAGGY_LENGTH) {
    errors.taggy = `A Taggy deve ter no m\u00e1ximo ${MAX_TAGGY_LENGTH} caracteres.`;
  }

  if (freightCents === null) {
    errors.freightCents = "O valor do frete deve ser um inteiro em centavos.";
  }

  if (!RECEIVER_OPTIONS.includes(receiver)) {
    errors.receiver = "Selecione um recebedor v\u00e1lido.";
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
