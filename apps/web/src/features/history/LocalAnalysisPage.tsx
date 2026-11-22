import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Disclaimer } from "../../components/Disclaimer";
import { ErrorMessage } from "../../components/ErrorMessage";
import { getLocalAnalysis } from "../../lib/localAnalyses";
import { tradeStyle } from "../../lib/trades";
import { ResultDisplay } from "../analysis/ResultDisplay";

/** Lokal gespeicherte Analyse ansehen – funktioniert auch, wenn der Server sie nicht mehr kennt. */
export function LocalAnalysisPage() {
  const { localId = "" } = useParams();
  const entry = useQuery({ queryKey: ["local-analyses", localId], queryFn: () => getLocalAnalysis(localId) });

  if (entry.isPending) return <p className="text-gray-500">Lade lokale Analyse …</p>;
  if (entry.isError) return <ErrorMessage error={entry.error} />;
  if (!entry.data) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={new Error("Lokale Analyse nicht gefunden.")} />
        <Link to="/" className="font-semibold text-(--accent) underline">
          Zur Startseite
        </Link>
      </div>
    );
  }
  const { detail, photos, tools } = entry.data;
  return (
    <article className="space-y-4" style={tradeStyle(detail.result.trade)}>
      <Disclaimer />
      <Link to="/" className="text-sm font-semibold text-(--accent)">
        ← Zur Startseite
      </Link>
      <h2>
        <span className="badge-pill">Lokal gespeicherte Analyse</span>
      </h2>
      <ResultDisplay detail={detail} local={{ photos, tools }} />
    </article>
  );
}
