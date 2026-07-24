/* Setup canvas fixtures. Lifted out of `pages/SetupPage.tsx`, which is now a
   pure presenter and ships no demo content. */

import type { SetupData } from "../../pages/SetupPage";
import type { PageFixtures } from "./types";
import { LONG_TITLE, LONG_NAME, UNBREAKABLE, LONG_WORD, MIXED_SCRIPT, LONG_URL } from "./stress";

const LONG_EMAIL =
  "alexandra.wilhelmina.featherstonehaugh-montgomery@platform-reliability-and-incident-response.enterprise-workspace.example.com";

const LOG_SAMPLE = `mari-cloud  ┃ workspace has no admin: one-time setup required
mari-cloud  ┃ admin token:  3f9c-7b21-e04d-a41b   ← yours will differ
mari-cloud  ┃ open http://localhost:8787/setup to claim this workspace`;

const TOKEN_STEP: SetupData = {
  step: "token",
  logSample: LOG_SAMPLE,
  token: "",
  name: "Maya Chen",
  email: "maya@team.com",
  password: "••••••••••",
  workspace: "Acme Product",
};

const ADMIN_STEP: SetupData = { ...TOKEN_STEP, step: "admin" };

/** Long natural text on the admin step: a long person name, a long workspace
    name, and an address that will not fit its input. */
const OVERFLOW: SetupData = {
  step: "admin",
  logSample: LOG_SAMPLE,
  token: LONG_TITLE,
  name: LONG_NAME,
  email: LONG_EMAIL,
  password: "••••••••••",
  workspace: LONG_TITLE,
};

/** Pathological content on the token step: an unbreakable token in the code
    box and in the input, plus mixed scripts in the log. */
const STRESS: SetupData = {
  step: "token",
  logSample: `${UNBREAKABLE}\n${MIXED_SCRIPT}\n${LONG_URL}`,
  token: UNBREAKABLE,
  name: MIXED_SCRIPT,
  email: `${UNBREAKABLE}@example.com`,
  password: LONG_WORD,
  workspace: LONG_WORD,
};

export const FIXTURES: PageFixtures<SetupData> = {
  default: { data: TOKEN_STEP },
  admin: { data: ADMIN_STEP },
  saving: { data: ADMIN_STEP, loading: true },
  error: { data: ADMIN_STEP, error: "Invalid token: check the server logs" },
  success: { data: { ...TOKEN_STEP, step: "done" } },
  overflow: { data: OVERFLOW, error: LONG_TITLE },
  stress: { data: STRESS },
};
