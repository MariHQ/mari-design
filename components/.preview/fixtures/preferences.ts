/* Preferences canvas fixtures.

   The page is a pure presenter, so every value on the canvas is authored here.
   The states that matter are the ones where the page has to render something
   OTHER than three tidy cards: an OAuth account, where there is no password to
   change, and the overflow/stress pair that a person with a very long name and
   an unfamiliar time zone actually produces. */

import type { PreferencesData } from "../../pages/PreferencesPage";
import type { PropertyItem } from "../../data-display/PropertyList";
import type { PageFixtures } from "./types";
import { LONG_NAME, LONG_WORD, MIXED_SCRIPT, UNBREAKABLE } from "./stress";

const SUMMARY: PropertyItem[] = [
  { label: "Role", value: "Admin" },
  { label: "Member since", value: "Nov 3, 2024" },
  { label: "Last sign-in", value: "Today, 09:14" },
  { label: "Sessions", value: "2 active" },
];

const BASE: PreferencesData = {
  profile: {
    name: "Dana Reyes",
    email: "dana@acme-data.com",
    initials: "DR",
    timezone: "America/Los_Angeles",
  },
  provider: "password",
  notifications: { mentions: true, digest: true, flowFailures: true },
  summary: SUMMARY,
};

export const FIXTURES: PageFixtures<PreferencesData> = {
  default: { data: BASE },

  loading: { data: BASE, loading: true },

  error: { data: BASE, error: "Could not reach the API. Retrying in 5s." },

  // "Dirty" is a state of the page's own edit buffer, which the canvas cannot
  // set from outside — so this renders the same form and the QA note is that
  // typing in it is what produces the Save/Discard pair.
  editing: { data: BASE },

  saved: { data: BASE },

  // The case the page exists to get right: no password form, because the
  // credential is GitHub's.
  oauth: {
    data: {
      ...BASE,
      profile: { ...BASE.profile, email: "dana@users.noreply.github.com" },
      provider: "github",
    },
  },

  "notifications-off": {
    data: { ...BASE, notifications: { mentions: false, digest: false, flowFailures: false } },
  },

  overflow: {
    data: {
      ...BASE,
      profile: {
        name: LONG_NAME,
        email: "alexandra.wilhelmina.featherstonehaugh-montgomery@a-very-long-corporate-domain.example.com",
        initials: "AW",
        timezone: "America/Argentina/ComodRivadavia",
      },
      summary: [
        { label: "Role", value: "Workspace administrator and billing contact" },
        { label: "Member since", value: "Nov 3, 2024" },
        { label: "Last sign-in", value: "Today, 09:14 from a device with a very long user agent string" },
        { label: "Sessions", value: "2 active" },
      ],
    },
  },

  stress: {
    data: {
      ...BASE,
      profile: {
        name: MIXED_SCRIPT,
        email: UNBREAKABLE,
        initials: "部",
        timezone: LONG_WORD,
      },
      provider: "google",
      notifications: { mentions: true, digest: false, flowFailures: true },
      summary: [
        { label: LONG_WORD, value: MIXED_SCRIPT },
        { label: "Sessions", value: UNBREAKABLE },
      ],
    },
  },
};
