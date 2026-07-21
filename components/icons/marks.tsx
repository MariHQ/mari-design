// Source / provider brand marks harvested from the console's connector catalog.
// Bespoke glyphs (GitHub, Slack, Google Drive, Notion, Granola, Google Docs)
// keep their brand colors; providers without a bespoke glyph fall back to a
// neutral plug drawn with `currentColor`. Upload → send glyph, website → globe.

import { IconSend, IconGlobe } from "./ui";

export interface MarkProps {
  /** Square edge length in px. Default 22. */
  size?: number;
  className?: string;
}

export function GithubMark({ size = 22, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden>
      <path
        fill="#24292f"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function SlackMark({ size = 22, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 54 54" className={className} aria-hidden>
      <g>
        <path fill="#36C5F0" d="M19.7 32.7a5.4 5.4 0 1 1-5.4-5.4h5.4zm2.7 0a5.4 5.4 0 0 1 10.8 0v13.5a5.4 5.4 0 0 1-10.8 0z" />
        <path fill="#2EB67D" d="M21.3 19.7a5.4 5.4 0 1 1 5.4-5.4v5.4zm0 2.7a5.4 5.4 0 0 1 0 10.8H7.8a5.4 5.4 0 0 1 0-10.8z" />
        <path fill="#ECB22E" d="M34.3 21.3a5.4 5.4 0 1 1 5.4 5.4h-5.4zm-2.7 0a5.4 5.4 0 0 1-10.8 0V7.8a5.4 5.4 0 0 1 10.8 0z" transform="rotate(180 32.95 21.3)" />
        <path fill="#E01E5A" d="M32.7 34.3a5.4 5.4 0 1 1-5.4 5.4v-5.4zm0-2.7a5.4 5.4 0 0 1 0-10.8h13.5a5.4 5.4 0 0 1 0 10.8z" transform="rotate(180 39.45 32.95)" />
      </g>
    </svg>
  );
}

export function DriveMark({ size = 22, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 87.3 78" className={className} aria-hidden>
      <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" />
      <path fill="#00ac47" d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" />
      <path fill="#ea4335" d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" />
      <path fill="#00832d" d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" />
      <path fill="#2684fc" d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
      <path fill="#ffba00" d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" />
    </svg>
  );
}

export function NotionMark({ size = 22, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="3.5" fill="#fff" stroke="#2d2a22" strokeWidth="1.5" />
      <path d="M7.5 17.5 V 6.8 l1.8 -.2 5.6 8.6 V 6.5 H 17 v 10.8 l-2 .2 -5.7 -8.7 v 8.5 z" fill="#2d2a22" />
    </svg>
  );
}

export function GranolaMark({ size = 22, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#2d2a22" />
      <path
        d="M16.6 8.6 a5.4 5.4 0 1 0 .9 4.6 h-5"
        fill="none" stroke="#f6f0e3" strokeWidth="2.1" strokeLinecap="round"
      />
    </svg>
  );
}

export function DocsMark({ size = 22, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" fill="#3086f6" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Neutral plug mark (currentColor) for providers without a bespoke glyph. */
export function PlugMark({ size = 22, className }: MarkProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      <path d="M9 7V3M15 7V3" />
      <path d="M6.5 7h11v4a5.5 5.5 0 0 1-11 0V7Z" />
      <path d="M12 16.5V19a2.5 2.5 0 0 1-2.5 2.5" />
    </svg>
  );
}

/** Every provider the console's connector catalog defines. */
export const PROVIDERS = [
  "github", "slack", "gdocs", "gdrive", "notion", "granola", "docs",
  "upload", "website", "confluence", "jira", "linear", "zendesk",
  "asana", "trello", "airtable", "dropbox",
] as const;

export type Provider = (typeof PROVIDERS)[number];

/** Human-readable provider names (mirrors the source PROVIDER_NAME map). */
export const PROVIDER_NAME: Record<string, string> = {
  github: "GitHub", slack: "Slack", gdocs: "Google Drive", gdrive: "Google Drive",
  docs: "Google Docs", notion: "Notion", granola: "Granola", upload: "Upload",
  website: "Website", confluence: "Confluence", jira: "Jira", linear: "Linear",
  zendesk: "Zendesk", asana: "Asana", trello: "Trello", airtable: "Airtable",
  dropbox: "Dropbox",
};

/**
 * Keyed provider mark: bespoke glyph where one exists, else a neutral plug.
 * `gdrive` aliases to the Drive glyph; `upload`/`website` reuse UI icons.
 */
export function SourceMark({ provider, size = 22, className }: MarkProps & { provider: string }) {
  const key = provider === "gdrive" ? "gdocs" : provider;
  switch (key) {
    case "github": return <GithubMark size={size} className={className} />;
    case "slack": return <SlackMark size={size} className={className} />;
    case "gdocs": return <DriveMark size={size} className={className} />;
    case "notion": return <NotionMark size={size} className={className} />;
    case "granola": return <GranolaMark size={size} className={className} />;
    case "docs": return <DocsMark size={size} className={className} />;
    case "upload": return <IconSend size={size} className={className} style={{ transform: "rotate(-45deg)" }} />;
    case "website": return <IconGlobe size={size} className={className} />;
    default: return <PlugMark size={size} className={className} />;
  }
}
