import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyValueEditor } from "./KeyValueEditor";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";
import type {
  HeaderEntry,
  ParamEntry,
  RequestAuth,
  RequestBody,
} from "@/types/request";
import type { VariableCompletionItem } from "@/lib/codemirror/variable-extension";

interface InheritedAuth {
  auth: RequestAuth;
  sourceName: string;
}

interface RequestConfigTabsProps {
  params: ParamEntry[];
  headers: HeaderEntry[];
  auth: RequestAuth;
  bodyConfig: RequestBody;
  onParamsChange: (params: ParamEntry[]) => void;
  onHeadersChange: (headers: HeaderEntry[]) => void;
  onAuthChange: (auth: RequestAuth) => void;
  onBodyConfigChange: (body: RequestBody) => void;
  onBodyTypeChange: (type: RequestBody["type"]) => void;
  inheritedAuth?: InheritedAuth | null;
  variableItems?: () => VariableCompletionItem[];
  isVariableResolved?: (name: string) => boolean;
  disabled?: boolean;
}

function countActive(entries: { key: string; enabled: boolean }[]): number {
  return entries.filter((e) => e.enabled && e.key).length;
}

export function RequestConfigTabs({
  params,
  headers,
  auth,
  bodyConfig,
  onParamsChange,
  onHeadersChange,
  onAuthChange,
  onBodyConfigChange,
  onBodyTypeChange,
  inheritedAuth,
  variableItems,
  isVariableResolved,
  disabled,
}: RequestConfigTabsProps) {
  const paramCount = countActive(params);
  const headerCount = countActive(headers);
  const hasBody = bodyConfig.type !== "none";
  const hasAuth = auth.type !== "none";

  return (
    <Tabs defaultValue="params" className="h-full gap-0">
      <TabsList
        variant="line"
        className="shrink-0 border-b border-border/50 px-2 w-full justify-start"
      >
        <TabsTrigger value="params" className="text-xs gap-1">
          Params
          {paramCount > 0 && (
            <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 min-w-[18px] text-center">
              {paramCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="headers" className="text-xs gap-1">
          Headers
          {headerCount > 0 && (
            <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded-full px-1.5 min-w-[18px] text-center">
              {headerCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="auth" className="text-xs gap-1">
          Auth
          {hasAuth && (
            <span className="size-1.5 rounded-full bg-primary" />
          )}
        </TabsTrigger>
        <TabsTrigger value="body" className="text-xs gap-1">
          Body
          {hasBody && (
            <span className="size-1.5 rounded-full bg-primary" />
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="params" className="overflow-y-auto">
        <KeyValueEditor
          entries={params}
          onChange={onParamsChange}
          keyPlaceholder="Parameter"
          valuePlaceholder="Value"
          disabled={disabled}
        />
      </TabsContent>

      <TabsContent value="headers" className="overflow-y-auto">
        <KeyValueEditor
          entries={headers}
          onChange={onHeadersChange}
          keyPlaceholder="Header"
          valuePlaceholder="Value"
          disabled={disabled}
        />
      </TabsContent>

      <TabsContent value="auth" className="overflow-y-auto p-4">
        <AuthEditor auth={auth} onChange={onAuthChange} inheritedAuth={inheritedAuth} disabled={disabled} />
      </TabsContent>

      <TabsContent value="body" className="overflow-y-auto p-4">
        <BodyEditor
          body={bodyConfig}
          onChange={onBodyConfigChange}
          onTypeChange={onBodyTypeChange}
          variableItems={variableItems}
          isVariableResolved={isVariableResolved}
          disabled={disabled}
        />
      </TabsContent>
    </Tabs>
  );
}
