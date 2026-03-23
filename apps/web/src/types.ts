import { RECEIVER_OPTIONS, TAGGY_OPTIONS } from "./constants";

export type TaggyOption = (typeof TAGGY_OPTIONS)[number];
export type ReceiverOption = (typeof RECEIVER_OPTIONS)[number];
export type TaggyFilter = "Todos" | TaggyOption;

export interface FreightRecord {
  _id: string;
  date: string;
  plate: string;
  client: string;
  loteMotz: string;
  loteAtua: string;
  taggy: TaggyOption;
  freightCents: number;
  receiver: ReceiverOption;
  observation?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface FreightFormValues {
  date: string;
  plate: string;
  client: string;
  loteMotz: string;
  loteAtua: string;
  taggy: string;
  freight: string;
  receiver: string;
  observation: string;
}

export type FreightFormErrors = Partial<Record<keyof FreightFormValues, string>>;

export type ToastType = "success" | "warning" | "error";

export interface ToastState {
  id: number;
  type: ToastType;
  message: string;
}

export type ConnectionState = "loading" | "online" | "offline" | "error";

export interface ConnectionStatus {
  state: ConnectionState;
  detail: string;
}
