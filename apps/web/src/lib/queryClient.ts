import { QueryClient } from "@tanstack/react-query";

/** Zwischenspeicher-Dauer der App; Tests nutzen denselben Wert, damit sie wie die App laufen. */
export const STALE_TIME_MS = 30_000;

export function createQueryClient(retry: number | false = 1): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { staleTime: STALE_TIME_MS, retry } } });
}
