import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";

/** Warnt dauerhaft, solange das Backend nur die Mock-KI nutzt. */
export function TestModeBanner() {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: async () => unwrap(await api.GET("/health")),
  });
  if (data?.ai_provider !== "mock") return null;
  return (
    <div role="status" className="bg-amber-300 px-4 py-2 text-sm font-medium text-amber-950">
      Testmodus: Analysen kommen aus der Mock-KI und werten Fotos nicht aus.
    </div>
  );
}
