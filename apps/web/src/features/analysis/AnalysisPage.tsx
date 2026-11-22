import { Link, useParams } from "react-router";
import { Disclaimer } from "../../components/Disclaimer";
import { ErrorMessage } from "../../components/ErrorMessage";
import { tradeStyle } from "../../lib/trades";
import { useAnalysis } from "./api";
import { ResultDisplay } from "./ResultDisplay";

/** Gespeicherte Analyse erneut ansehen (aus Projekt oder Verlauf) – gleiche Ansicht wie Schritt 3. */
export function AnalysisPage() {
  const { analysisId = "" } = useParams();
  const analysis = useAnalysis(analysisId);

  if (analysis.isPending) return <p className="text-gray-500">Lade Analyse …</p>;
  if (analysis.isError) {
    return (
      <div className="space-y-3">
        <ErrorMessage error={analysis.error} />
        <Link to="/" className="font-semibold text-(--accent) underline">
          Zur Startseite
        </Link>
      </div>
    );
  }
  const detail = analysis.data;
  return (
    <article className="space-y-4" style={tradeStyle(detail.result.trade)}>
      <Disclaimer />
      <Link
        to={detail.project_id ? `/projects/${detail.project_id}` : "/analyse"}
        className="text-sm font-semibold text-(--accent)"
      >
        ← {detail.project_id ? "Zum Projekt" : "Zur Analyse"}
      </Link>
      <h2>
        <span className="badge-pill">Ergebnis der KI-Analyse</span>
      </h2>
      <ResultDisplay detail={detail} />
    </article>
  );
}
