/* Macro / page-level feature components — each composes the library's
 * primitives into a full feature (card / panel / view / drawer / wizard /
 * editor), distilled from the mari-cloud console (see mari-pages/features).
 * Every component renders standalone with baked-in demo data; all props are
 * optional. Kept in their own barrel (not re-exported by the root index) so
 * macro names can mirror the primitives they build on. */

// Overview
export { OverviewStatTiles } from "./OverviewStatTiles";
export { OverviewDigestCard } from "./OverviewDigestCard";
export { OverviewTodayReview } from "./OverviewTodayReview";
export { OverviewSourcePulse } from "./OverviewSourcePulse";
export { OverviewLiveActivity } from "./OverviewLiveActivity";
export { OverviewWorkflowStrip } from "./OverviewWorkflowStrip";
export { OverviewRecentDocs } from "./OverviewRecentDocs";

// Knowledge
export { KnowledgeBrowser } from "./KnowledgeBrowser";
export { KnowledgeInspector } from "./KnowledgeInspector";

// Doc review
export { DocReviewEditor } from "./DocReviewEditor";
export { DocReviewMarkdown } from "./DocReviewMarkdown";
export { DocReviewFindingsPanel } from "./DocReviewFindingsPanel";
export { DocReviewChangeQueue } from "./DocReviewChangeQueue";
export { DocReviewRefinePanel } from "./DocReviewRefinePanel";
export { DocReviewOutlinePanel } from "./DocReviewOutlinePanel";

// Lineage
export { LineageDataModel } from "./LineageDataModel";
export { LineageGraph } from "./LineageGraph";
export { LineageToolbar } from "./LineageToolbar";
export { LineageTimeScrubber } from "./LineageTimeScrubber";
export { LineageNodeDrawer } from "./LineageNodeDrawer";
export { LineageEdgeDrawer } from "./LineageEdgeDrawer";
export { LineageGroupDrawer } from "./LineageGroupDrawer";
export { LineageAssertDrawer } from "./LineageAssertDrawer";

// Flows
export { FlowsList } from "./FlowsList";
export { FlowsPipelineEditor } from "./FlowsPipelineEditor";
export { FlowsRunPanel } from "./FlowsRunPanel";
export { FlowsRunHistory } from "./FlowsRunHistory";

// Insights
export { InsightsWidgets } from "./InsightsWidgets";
export { InsightsFreshnessChart } from "./InsightsFreshnessChart";

// Audit
export { AuditFindingsChecklist } from "./AuditFindingsChecklist";
export { FactsVerificationAudit } from "./FactsVerificationAudit";

// Library
export { LibraryGlossaryPanel } from "./LibraryGlossaryPanel";
export { LibraryGuidesPanel } from "./LibraryGuidesPanel";
export { LibraryRulesPanel } from "./LibraryRulesPanel";
export { LibraryTagsPanel } from "./LibraryTagsPanel";
export { LibraryTemplatesPanel } from "./LibraryTemplatesPanel";

// Answers
export { AnswersHarvestWizard } from "./AnswersHarvestWizard";
export { AnswerCard } from "./AnswerCard";

// Sources
export { SourcesConnectorCard } from "./SourcesConnectorCard";
export { SourcesConnectorWizard } from "./SourcesConnectorWizard";
export { SourcesSyncStatus } from "./SourcesSyncStatus";
export { SourcesBots } from "./SourcesBots";

// Onboarding
export { WelcomeGenericConnect } from "./WelcomeGenericConnect";
export { WelcomeGithubConnect } from "./WelcomeGithubConnect";
export { WelcomeGlossaryStep } from "./WelcomeGlossaryStep";
export { WelcomeGuideStep } from "./WelcomeGuideStep";
export { WelcomeSyncPanel } from "./WelcomeSyncPanel";
export { WelcomeUploadConnect } from "./WelcomeUploadConnect";

// Admin
export { SettingsMembersTable } from "./SettingsMembersTable";
export { SettingsApiKeys } from "./SettingsApiKeys";
export { SettingsAuditLog } from "./SettingsAuditLog";
export { SettingsModelsConfig } from "./SettingsModelsConfig";
export { BrandingEditor } from "./BrandingEditor";
export { AuthSession } from "./AuthSession";

// Publish
export { PublishSiteEditor } from "./PublishSiteEditor";
export { PublishMcpServers } from "./PublishMcpServers";

// Misc (macro versions of single primitives, in page context)
export { ImpactPanelFeature } from "./ImpactPanelFeature";
export { DecisionCardFeature } from "./DecisionCardFeature";
export { TokenRevealFeature } from "./TokenRevealFeature";
export { TagPickerFeature } from "./TagPickerFeature";
export { GlobalIconsArt } from "./GlobalIconsArt";
export { ChatDockFeature } from "./ChatDockFeature";
