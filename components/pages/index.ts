import type { PageModule } from "./types";

/* Registry of all console pages, in canvas row order (one row per page). */

import { page as overview } from "./OverviewPage";
import { page as knowledge } from "./KnowledgePage";
import { page as docReview } from "./DocReviewPage";
import { page as answers } from "./AnswersPage";
import { page as decisions } from "./DecisionsPage";
import { page as library } from "./LibraryPage";
import { page as lineage } from "./LineagePage";
import { page as facts } from "./FactsPage";
import { page as audit } from "./AuditPage";
import { page as flows } from "./FlowsPage";
import { page as publish } from "./PublishPage";
import { page as insights } from "./InsightsPage";
import { page as tasks } from "./TasksPage";
import { page as sources } from "./SourcesPage";
import { page as settingsGeneral } from "./SettingsGeneralPage";
import { page as settingsMembers } from "./SettingsMembersPage";
import { page as settingsModels } from "./SettingsModelsPage";
import { page as settingsApiKeys } from "./SettingsApiKeysPage";
import { page as settingsAuditLog } from "./SettingsAuditLogPage";
import { page as lookbook } from "./LookbookPage";
import { page as login } from "./LoginPage";
import { page as setup } from "./SetupPage";
import { page as welcome } from "./WelcomePage";

export const PAGES: PageModule<any>[] = [
  overview,
  knowledge,
  docReview,
  answers,
  decisions,
  library,
  lineage,
  facts,
  audit,
  flows,
  publish,
  insights,
  tasks,
  sources,
  settingsGeneral,
  settingsMembers,
  settingsModels,
  settingsApiKeys,
  settingsAuditLog,
  lookbook,
  login,
  setup,
  welcome,
];

export type { PageModule, PageStateDef, PageProps, PageComponent } from "./types";
