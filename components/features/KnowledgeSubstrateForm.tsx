import { useState } from "react";
import { Button } from "../actions/Button";
import { useWrite } from "../actions/useWrite";
import { Alert } from "../feedback/Alert";
import { WriteError } from "../feedback/WriteError";
import { Field } from "../forms/Field";
import { Input } from "../forms/Input";
import { Select } from "../forms/Select";
import { Card } from "../layout/Card";

export type KnowledgeSubstrateSettings = {
  provider: "native" | "onyx";
  url: string;
  apiKeySet: boolean;
  apiKeyHint: string;
  timeoutSeconds: number;
  searchMode: "keyword" | "agentic";
};

export type KnowledgeSubstrateActions = {
  saveKnowledgeSubstrate?: (value: KnowledgeSubstrateSettings & { apiKey: string }) => void | Promise<void>;
  testKnowledgeSubstrate?: (value: KnowledgeSubstrateSettings & { apiKey: string }) => Promise<{ healthy: boolean; detail?: string }>;
};

export function KnowledgeSubstrateForm({ value, actions, compact = false }: {
  value: KnowledgeSubstrateSettings;
  actions?: KnowledgeSubstrateActions;
  compact?: boolean;
}) {
  const [provider, setProvider] = useState(value.provider);
  const [url, setUrl] = useState(value.url);
  const [apiKey, setApiKey] = useState("");
  const [searchMode, setSearchMode] = useState(value.searchMode);
  const [test, setTest] = useState<{ healthy: boolean; detail?: string } | null>(null);
  const write = useWrite();
  const config = { ...value, provider, url: url.trim(), apiKey, searchMode };
  const valid = provider === "native" || (url.trim().startsWith("http") && (apiKey.trim() || value.apiKeySet));

  return (
    <Card title="Knowledge engine" hint="Search and connector execution used by Mari, Slack, and MCP.">
      <div className={compact ? "grid gap-4" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        <Field label="Provider">
          <Select aria-label="Knowledge engine provider" value={provider} onChange={(event) => { setProvider(event.target.value as "native" | "onyx"); setTest(null); }} className="w-full">
            <option value="onyx">Onyx Community Edition</option>
            <option value="native">Mari native</option>
          </Select>
        </Field>
        {provider === "onyx" && <>
          <Field label="Onyx URL">
            <Input aria-label="Onyx URL" value={url} placeholder="https://onyx.example.com" onChange={(event) => { setUrl(event.target.value); setTest(null); }} className="w-full" />
          </Field>
          <Field label="API key">
            <Input aria-label="Onyx API key" type="password" value={apiKey} placeholder={value.apiKeyHint || (value.apiKeySet ? "Configured" : "Enter API key")} onChange={(event) => { setApiKey(event.target.value); setTest(null); }} className="w-full" />
          </Field>
          <Field label="Search mode">
            <Select aria-label="Onyx search mode" value={searchMode} onChange={(event) => { setSearchMode(event.target.value as "keyword" | "agentic"); setTest(null); }} className="w-full">
              <option value="keyword">Keyword</option>
              <option value="agentic">Agentic</option>
            </Select>
          </Field>
        </>}
      </div>
      {test && <div className="mt-4"><Alert tone={test.healthy ? "ok" : "warning"} title={test.healthy ? "Connection healthy" : "Connection failed"}>{test.detail || (test.healthy ? "Mari can reach the knowledge engine." : "Check the URL and API key.")}</Alert></div>}
      {write.failed && <div className="mt-4"><WriteError onDismiss={() => write.setFailed(null)}>{write.failed}</WriteError></div>}
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
        {actions?.testKnowledgeSubstrate && <Button disabled={!valid || write.busy} onClick={() => void (async () => {
          const result = await write.runFor(() => actions.testKnowledgeSubstrate!(config));
          if (result) setTest(result);
        })()}>Test connection</Button>}
        {actions?.saveKnowledgeSubstrate && <Button variant="primary" disabled={!valid || write.busy} onClick={() => void write.run(() => actions.saveKnowledgeSubstrate!(config))}>Save knowledge engine</Button>}
      </div>
    </Card>
  );
}
