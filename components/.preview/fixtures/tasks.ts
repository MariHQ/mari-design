/* Tasks canvas fixtures. Lifted verbatim out of TasksPage, which now takes a
   required data prop and ships no demo content of its own. Nothing here is
   importable by a consuming app. */

import type { Task, TaskAssignee, TaskPriority, TasksData } from "../../pages/TasksPage";
import type { PageFixtures } from "./types";
import {
  LONG_TITLE, LONG_PARAGRAPH, LONG_DOC_TITLE, LONG_URL, UNBREAKABLE, LONG_WORD,
  HUGE_NUMBER_STR, MIXED_SCRIPT, MANY_TAGS, MANY_INITIALS,
} from "./stress";

const SEED: Task[] = [
  { id: 1, title: "Verify the new proration rule in the billing runbook", who: "DR", kind: "factcheck", kindLabel: "Fact check", done: false, due: "2026-07-28", priority: "High", subject: { type: "document", id: "d-114", title: "Billing runbook", href: "/knowledge/doc?id=d-114" } },
  { id: 2, title: "Approve the SSO onboarding guide for publish", who: "MG", kind: "approval", kindLabel: "Approval", done: false, due: "2026-07-30", subject: { type: "fact", id: "f-208", title: "SSO onboarding is ready", href: "/facts?fact=f-208" } },
  { id: 3, title: "Review the incident escalation ladder", who: "SL", kind: "needs-review", kindLabel: "Needs review", done: false, priority: "Low" },
  { id: 4, title: "Retire two stale screenshots in auth/README", who: "PK", kind: "stale", kindLabel: "Stale", done: true },
  { id: 5, title: "Tag the pricing FAQ as canonical", who: "DR", kind: "canonical", kindLabel: "Canonical", done: true },
];

/* `due` is an ISO date, NOT display text: the row formats it with `fmtDate`
   and the board sorts on it (P-TA-4). These used to be pre-formatted here,
   which the page then re-formatted — a string that no longer parses, so the
   sort and the overdue comparison both fell back to raw text.

   `overdue` is set only where the intent is the SERVER's verdict; the rows
   without it exercise the board's own comparison against local midnight. */
const OVERDUE: Task[] = [
  { id: 11, title: "Re-verify the SLA uptime fact: source expired", who: "MM", kind: "factcheck", kindLabel: "Fact check", done: false, due: "2026-07-18", overdue: true },
  { id: 12, title: "Approve the refund policy update", who: "MG", kind: "approval", kindLabel: "Approval", done: false, due: "2026-07-20", overdue: true },
  { id: 13, title: "Review the on-call rotation doc", who: "SL", kind: "needs-review", kindLabel: "Needs review", done: false, due: "2026-07-21" },
  { id: 14, title: "Retire the deprecated v1 export guide", who: "PK", kind: "stale", kindLabel: "Stale", done: true, due: "2026-07-12" },
];

const MINE: Task[] = [
  { id: 21, title: "Fact-check the new webhook retry cadence", who: "MM", kind: "factcheck", kindLabel: "Fact check", done: false, due: "2026-07-22", priority: "High" },
  { id: 22, title: "Draft an answer for 'How do I rotate my API key?'", who: "MM", kind: "needs-review", kindLabel: "Needs review", done: false, due: "2026-07-24", priority: "Normal" },
  { id: 23, title: "Approve the billing proration runbook", who: "MM", kind: "approval", kindLabel: "Approval", done: true },
];

const MANY: Task[] = [
  ...SEED,
  { id: 31, title: "Reconcile the pricing table against Stripe", who: "MM", kind: "factcheck", kindLabel: "Fact check", done: false },
  { id: 32, title: "Publish the SSO enforcement announcement", who: "MG", kind: "approval", kindLabel: "Approval", done: false },
  { id: 33, title: "Prune 6 stale onboarding screenshots", who: "PK", kind: "stale", kindLabel: "Stale", done: false },
  { id: 34, title: "Verify JWKS rotation cadence in the auth doc", who: "AK", kind: "factcheck", kindLabel: "Fact check", done: false },
  { id: 35, title: "Review the data-retention policy update", who: "SL", kind: "needs-review", kindLabel: "Needs review", done: false },
  { id: 36, title: "Tag the incident postmortem as canonical", who: "DR", kind: "canonical", kindLabel: "Canonical", done: true },
  { id: 37, title: "Retire the legacy billing FAQ", who: "PK", kind: "stale", kindLabel: "Stale", done: true },
  { id: 38, title: "Approve the support macros refresh", who: "MG", kind: "approval", kindLabel: "Approval", done: true },
];

const OVERFLOW_TASKS: Task[] = [
  { id: 41, title: LONG_TITLE, who: "AW", kind: "factcheck", kindLabel: "Fact check: reconcile against the last four incident retrospectives", done: false, due: "Due by the end of the third fiscal quarter, 2026" },
  { id: 42, title: `Approve ${LONG_DOC_TITLE} for publish across every connected workspace and region`, who: "DR", kind: "approval", kindLabel: "Needs a second approver", done: false, due: "Before the platform-wide freeze on Jul 23, 2026" },
  { id: 43, title: LONG_PARAGRAPH, who: "MC", kind: "needs-review", kindLabel: "Needs review", done: false },
  { id: 44, title: "Retire the deprecated single-sign-on migration screenshots scattered across the authentication README and the onboarding guide", who: "PK", kind: "stale", kindLabel: "Stale", done: true },
  { id: 45, title: "Tag the consolidated quarterly platform reliability runbook as the canonical source of truth", who: "SL", kind: "canonical", kindLabel: "Canonical", done: true },
];

const STRESS_TASKS: Task[] = [
  { id: 51, title: UNBREAKABLE, who: "ABCDEFGH", kind: "factcheck", kindLabel: LONG_WORD, done: false, due: HUGE_NUMBER_STR },
  { id: 52, title: LONG_WORD, who: "日本語ABC", kind: "approval", kindLabel: MIXED_SCRIPT, done: false, due: MIXED_SCRIPT },
  { id: 53, title: LONG_URL, who: "MM", kind: "stale", kindLabel: "stale", done: false, due: HUGE_NUMBER_STR },
  { id: 54, title: `${MIXED_SCRIPT} ${UNBREAKABLE}`, who: MANY_INITIALS.slice(0, 4).join(""), kind: "canonical", kindLabel: HUGE_NUMBER_STR, done: true },
];

/* ── states ─────────────────────────────────────────────────────────────── */

/** Who a task can be filed to. Without these the composer draws no owner
    picker at all, so the canvas could not review the control. */
const ASSIGNEES: TaskAssignee[] = [
  { id: "dana@acme.test", name: "Dana R.", initials: "DR" },
  { id: "mia@acme.test", name: "Mia G.", initials: "MG" },
  { id: "sam@acme.test", name: "Sam L.", initials: "SL" },
  { id: "priya@acme.test", name: "Priya K.", initials: "PK" },
];

/** The workspace's priority vocabulary. Empty and no priority control is
    drawn, which is the state `empty` below keeps. */
const PRIORITIES: TaskPriority[] = [
  { id: "high", label: "High" },
  { id: "normal", label: "Normal" },
  { id: "low", label: "Low" },
];

/** A quiet board: no draft in the composer, nothing submitting, no strip. */
const board = (tasks: Task[]): TasksData => ({
  tasks, draft: "", saving: false, strip: null,
  assignees: ASSIGNEES, priorities: PRIORITIES,
});

const DEFAULT = board(SEED);

/** A brand-new inbox. Genuinely no rows, so the page's own per-column empty
    text fires — the canvas is not faking the empty state. It also carries no
    assignee or priority vocabulary, which is the other half of a new
    workspace: the composer files to whoever is signed in and draws neither
    control. */
const EMPTY: TasksData = { ...board([]), assignees: [], priorities: [] };

export const FIXTURES: PageFixtures<TasksData> = {
  default: { data: DEFAULT },
  "open-only": { data: board(SEED.map((t) => ({ ...t, done: false }))) },
  "all-done": { data: board(SEED.map((t) => ({ ...t, done: true }))) },
  single: { data: board(SEED.slice(0, 1)) },
  many: { data: board(MANY) },
  overdue: { data: board(OVERDUE) },
  "assigned-to-me": { data: board(MINE) },
  "composer-open": {
    data: { ...board(SEED), draft: "Re-verify the enterprise SLA uptime fact against the status page" },
  },
  saving: { data: { ...board(SEED), saving: true } },
  loading: { data: DEFAULT, loading: true },
  error: { data: DEFAULT, error: "Tasks are unavailable right now." },
  empty: { data: EMPTY },
  overflow: {
    data: {
      ...board(OVERFLOW_TASKS),
      strip: {
        title: "Every reviewer, tag, and label on this task: wrapped rather than clipped",
        tags: MANY_TAGS.slice(0, 10),
        people: MANY_INITIALS.slice(0, 8),
        statValue: "482,913",
        statLabel: "times reopened",
      },
    },
  },
  stress: {
    data: {
      ...board(STRESS_TASKS),
      strip: {
        title: MIXED_SCRIPT,
        tags: MANY_TAGS,
        people: MANY_INITIALS,
        statValue: HUGE_NUMBER_STR,
        statLabel: "times reopened",
      },
    },
  },
};
