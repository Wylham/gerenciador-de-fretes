const LEGACY_PLATE_REGEX = /^[A-Z]{3}-?\d{4}$/;
const MERCOSUL_PLATE_REGEX = /^[A-Z]{3}\d[A-Z]\d{2}$/;

export function normalizePlateInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function isValidPlate(value: string): boolean {
  return LEGACY_PLATE_REGEX.test(value) || MERCOSUL_PLATE_REGEX.test(value);
}
