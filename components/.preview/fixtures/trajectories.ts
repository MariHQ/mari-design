import type { TrajectoriesData, TrajectoryRow } from "../../pages/TrajectoriesPage";
import type { PageFixtures } from "./types";

const ROW: TrajectoryRow = {
  id: 1, sessionId: 10, prompt: "Update the retention documentation", status: "ready",
  model: "ollama:gemma3:4b",
  layer1: "Searched the knowledge base, inspected the runbook, and updated the document.",
  layer2: "Updated a policy document from retrieved evidence.",
  category: "Documentation maintenance", macroIntent: "Repair policy documentation",
  phases: [
    { id: 0, name: "Discover", family: "discover", start: 0, end: 0, steps: 1, substate: "Progress", failures: 0 },
    { id: 1, name: "Inspect", family: "inspect", start: 1, end: 1, steps: 1, substate: "Progress", failures: 0 },
    { id: 2, name: "Change", family: "change", start: 2, end: 2, steps: 1, substate: "Progress", failures: 0 },
  ],
  stepCount: 3, failureCount: 0, reworkCount: 0,
  startedAt: "2026-08-19T12:00:00Z", completedAt: "2026-08-19T12:00:02Z",
  steps: [
    { ordinal: 0, tool: "search", actionFamily: "discover", args: { query: "retention" }, summary: "3 hits", ok: true },
    { ordinal: 1, tool: "read_document", actionFamily: "inspect", args: { id: 1 }, summary: "read runbook", ok: true },
    { ordinal: 2, tool: "edit_document", actionFamily: "change", args: { id: 1 }, summary: "updated runbook", ok: true },
  ],
};

const BASE: TrajectoriesData = {
  rows: [ROW], total: 1, categories: [ROW.category], category: null, offset: 0, limit: 25,
};
const EMPTY: TrajectoriesData = { ...BASE, rows: [], total: 0, categories: [] };
const STRESS: TrajectoriesData = {
  ...BASE,
  rows: Array.from({ length: 25 }, (_, index) => ({
    ...ROW, id: index + 1, macroIntent: `Workflow ${index + 1}: ${"very long intent ".repeat(8)}`,
  })),
  total: 5000,
};

export const FIXTURES: PageFixtures<TrajectoriesData> = {
  default: { data: BASE },
  loading: { data: EMPTY, loading: true },
  error: { data: EMPTY, error: "Trajectory catalog unavailable." },
  empty: { data: EMPTY },
  stress: { data: STRESS },
};
