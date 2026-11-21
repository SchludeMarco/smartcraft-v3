import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";

export function renderWithProviders(ui: ReactElement, { route = "/" }: { route?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

type Handler = (request: Request) => { status?: number; body: unknown } | undefined;

/** Ersetzt fetch durch einen Fake-Server. Unbekannte Anfragen schlagen den Test fehl. */
export function mockApi(handler: Handler) {
  const calls: Request[] = [];
  const fetchMock = vi.fn(async (input: Request) => {
    calls.push(input.clone());
    const reply = handler(input);
    if (!reply) throw new Error(`Unerwartete Anfrage: ${input.method} ${input.url}`);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls };
}

export function path(request: Request): string {
  return new URL(request.url).pathname.replace(/^\/api/, "");
}
