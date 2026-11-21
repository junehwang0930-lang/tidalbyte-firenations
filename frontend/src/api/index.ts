import type { BuildingGraph, HealthResponse } from '../types';

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new Error(`Request to ${path} failed (HTTP ${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export const getHealth = (signal?: AbortSignal) => getJson<HealthResponse>('/health', signal);
export const getGraph = (signal?: AbortSignal) => getJson<BuildingGraph>('/api/graph', signal);
