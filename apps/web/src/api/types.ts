import type { components } from "./schema";

type Schemas = components["schemas"];

export type Project = Schemas["ProjectOut"];
export type ProjectCreate = Schemas["ProjectCreate"];
export type AnalysisSummary = Schemas["AnalysisSummaryOut"];
export type RiskLevel = Schemas["RiskLevel"];
export type Health = Schemas["HealthResponse"];
