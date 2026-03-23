import type { FreightPayload, FreightRecord } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "Erro ao processar a requisição.";

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function getFreights(date: string): Promise<FreightRecord[]> {
  return request<FreightRecord[]>(`/freights?date=${encodeURIComponent(date)}`);
}

export function getTaggies(): Promise<{ taggyOptions: string[] }> {
  return request<{ taggyOptions: string[] }>("/taggies");
}

export function createTaggy(name: string): Promise<{ taggy: string; taggyOptions: string[] }> {
  return request<{ taggy: string; taggyOptions: string[] }>("/taggies", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function deleteTaggy(name: string): Promise<{ taggy: string; taggyOptions: string[] }> {
  return request<{ taggy: string; taggyOptions: string[] }>(`/taggies/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

export function createFreight(payload: FreightPayload): Promise<FreightRecord> {
  return request<FreightRecord>("/freights", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFreight(id: string, payload: FreightPayload): Promise<FreightRecord> {
  return request<FreightRecord>(`/freights/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteFreight(id: string): Promise<void> {
  return request<void>(`/freights/${id}`, {
    method: "DELETE",
  });
}

export function clearFreightsByDate(date: string): Promise<{ deletedCount: number }> {
  return request<{ deletedCount: number }>(`/freights/by-date?date=${encodeURIComponent(date)}`, {
    method: "DELETE",
  });
}
