import type { components } from "./schema";

type Schemas = components["schemas"];

export type Project = Schemas["ProjectOut"];
export type ProjectCreate = Schemas["ProjectCreate"];
export type AnalysisSummary = Schemas["AnalysisSummaryOut"];
export type AnalysisDetail = Schemas["AnalysisDetailOut"];
export type AnalysisResult = Schemas["AnalysisResult"];
export type CheckItem = Schemas["CheckItemOut"];
export type Capture = Schemas["CaptureOut"];
export type AnalysisOverlay = Schemas["AnalysisOverlay"];
export type OverlayAnchor = Schemas["OverlayAnchor"];
export type RiskLevel = Schemas["RiskLevel"];
export type Hazard = Schemas["Hazard"];
export type Trade = Schemas["Trade"];
export type TradeOption = Schemas["TradeOut"];
export type Health = Schemas["HealthResponse"];
export type Severity = Schemas["Finding"]["severity"];
export type Confidence = Schemas["Finding"]["confidence"];
export type CheckUpdate = Schemas["CheckUpdate"];
export type Note = Schemas["NoteOut"];
export type ProjectReport = Schemas["ProjectReportOut"];
export type NoteCreate = Schemas["NoteCreate"];
