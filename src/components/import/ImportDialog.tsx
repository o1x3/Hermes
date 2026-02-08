import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCollectionStore } from "@/stores/collectionStore";
import { useTabStore } from "@/stores/tabStore";
import { toast } from "sonner";
import { parsePostmanCollection, type PostmanImport } from "@/lib/import/postman";
import { parseCurl, type CurlImport } from "@/lib/import/curl";
import { parseOpenApi, type OpenApiImport } from "@/lib/import/openapi";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  // Postman
  const [postmanData, setPostmanData] = useState<PostmanImport | null>(null);
  const [postmanError, setPostmanError] = useState<string | null>(null);
  const [postmanImporting, setPostmanImporting] = useState(false);

  // cURL
  const [curlInput, setCurlInput] = useState("");
  const [curlData, setCurlData] = useState<CurlImport | null>(null);
  const [curlError, setCurlError] = useState<string | null>(null);

  // OpenAPI
  const [openApiData, setOpenApiData] = useState<OpenApiImport | null>(null);
  const [openApiError, setOpenApiError] = useState<string | null>(null);
  const [openApiImporting, setOpenApiImporting] = useState(false);

  const handlePostmanFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostmanError(null);
    setPostmanData(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parsePostmanCollection(reader.result as string);
        setPostmanData(result);
      } catch (err) {
        setPostmanError(err instanceof Error ? err.message : "Failed to parse file");
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePostmanImport = useCallback(async () => {
    if (!postmanData) return;
    setPostmanImporting(true);
    try {
      const store = useCollectionStore.getState();
      const collection = await store.createCollection(postmanData.name);

      // Create folders, mapping name paths to IDs
      const folderIdMap = new Map<string, string>();
      for (const folder of postmanData.folders) {
        const parentPath = folder.parentPath.join("/");
        const parentId = parentPath ? folderIdMap.get(parentPath) ?? null : null;
        const created = await store.createFolder(collection.id, folder.name, parentId ?? undefined);
        const fullPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
        folderIdMap.set(fullPath, created.id);
      }

      // Create requests
      for (const req of postmanData.requests) {
        const folderPath = req.folderPath.join("/");
        const folderId = folderPath ? folderIdMap.get(folderPath) ?? null : null;
        await store.saveRequest({
          collectionId: collection.id,
          folderId,
          name: req.name,
          method: req.method,
          url: req.url,
          headers: req.headers,
          params: req.params,
          body: req.body,
          auth: req.auth,
          variables: [],
        });
      }

      toast.success(`Imported ${postmanData.requests.length} requests from Postman`);
      onOpenChange(false);
      resetState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setPostmanError(msg);
      toast.error(`Import failed: ${msg}`);
    } finally {
      setPostmanImporting(false);
    }
  }, [postmanData, onOpenChange]);

  const handleCurlChange = useCallback((value: string) => {
    setCurlInput(value);
    setCurlError(null);
    setCurlData(null);
    if (!value.trim()) return;
    try {
      setCurlData(parseCurl(value));
    } catch (err) {
      setCurlError(err instanceof Error ? err.message : "Failed to parse");
    }
  }, []);

  const handleCurlImport = useCallback(() => {
    if (!curlData) return;
    const tabStore = useTabStore.getState();
    tabStore.openNewTab();
    // Set the state on the newly created tab
    setTimeout(() => {
      const store = useTabStore.getState();
      store.setMethod(curlData.method);
      store.setUrl(curlData.url);
      store.setHeaders(curlData.headers);
      store.setBodyConfig(curlData.body);
      store.setAuth(curlData.auth);
    }, 0);
    toast.success("Request imported from cURL");
    onOpenChange(false);
    resetState();
  }, [curlData, onOpenChange]);

  const handleOpenApiFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOpenApiError(null);
    setOpenApiData(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseOpenApi(reader.result as string);
        setOpenApiData(result);
      } catch (err) {
        setOpenApiError(err instanceof Error ? err.message : "Failed to parse file");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleOpenApiImport = useCallback(async () => {
    if (!openApiData) return;
    setOpenApiImporting(true);
    try {
      const store = useCollectionStore.getState();
      const name = `${openApiData.title}${openApiData.version ? ` v${openApiData.version}` : ""}`;
      const collection = await store.createCollection(name);

      for (const ep of openApiData.endpoints) {
        const url = openApiData.baseUrl
          ? `${openApiData.baseUrl.replace(/\/$/, "")}${ep.path}`
          : ep.path;

        await store.saveRequest({
          collectionId: collection.id,
          folderId: null,
          name: ep.summary || ep.operationId || `${ep.method} ${ep.path}`,
          method: ep.method,
          url,
          headers: ep.headers,
          params: ep.params,
          body: ep.body,
          auth: { type: "none" },
          variables: [],
        });
      }

      toast.success(`Imported ${openApiData.endpoints.length} endpoints from OpenAPI`);
      onOpenChange(false);
      resetState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setOpenApiError(msg);
      toast.error(`Import failed: ${msg}`);
    } finally {
      setOpenApiImporting(false);
    }
  }, [openApiData, onOpenChange]);

  function resetState() {
    setPostmanData(null);
    setPostmanError(null);
    setCurlInput("");
    setCurlData(null);
    setCurlError(null);
    setOpenApiData(null);
    setOpenApiError(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="postman" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="postman" className="text-xs">Postman</TabsTrigger>
            <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
            <TabsTrigger value="openapi" className="text-xs">OpenAPI</TabsTrigger>
          </TabsList>

          {/* Postman */}
          <TabsContent value="postman" className="space-y-3 mt-3">
            <input
              type="file"
              accept=".json"
              onChange={handlePostmanFile}
              className="text-xs file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted file:text-muted-foreground hover:file:bg-muted/80 cursor-pointer"
            />
            {postmanError && (
              <p className="text-xs text-destructive">{postmanError}</p>
            )}
            {postmanData && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-md p-3">
                <p className="font-medium text-foreground">{postmanData.name}</p>
                <p>{postmanData.requests.length} requests, {postmanData.folders.length} folders</p>
              </div>
            )}
            <Button
              size="sm"
              disabled={!postmanData || postmanImporting}
              onClick={handlePostmanImport}
              className="w-full"
            >
              {postmanImporting ? "Importing..." : "Import Collection"}
            </Button>
          </TabsContent>

          {/* cURL */}
          <TabsContent value="curl" className="space-y-3 mt-3">
            <textarea
              value={curlInput}
              onChange={(e) => handleCurlChange(e.target.value)}
              placeholder="Paste cURL command..."
              rows={5}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 resize-none"
            />
            {curlError && (
              <p className="text-xs text-destructive">{curlError}</p>
            )}
            {curlData && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-md p-3">
                <p className="font-medium text-foreground">
                  {curlData.method} {curlData.url}
                </p>
                <p>
                  {curlData.headers.length} headers
                  {curlData.body.type !== "none" ? ", has body" : ""}
                </p>
              </div>
            )}
            <Button
              size="sm"
              disabled={!curlData}
              onClick={handleCurlImport}
              className="w-full"
            >
              Import as Request
            </Button>
          </TabsContent>

          {/* OpenAPI */}
          <TabsContent value="openapi" className="space-y-3 mt-3">
            <input
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleOpenApiFile}
              className="text-xs file:mr-2 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted file:text-muted-foreground hover:file:bg-muted/80 cursor-pointer"
            />
            {openApiError && (
              <p className="text-xs text-destructive">{openApiError}</p>
            )}
            {openApiData && (
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 rounded-md p-3">
                <p className="font-medium text-foreground">
                  {openApiData.title} {openApiData.version && `v${openApiData.version}`}
                </p>
                <p>{openApiData.endpoints.length} endpoints</p>
                {openApiData.baseUrl && <p className="font-mono">{openApiData.baseUrl}</p>}
              </div>
            )}
            <Button
              size="sm"
              disabled={!openApiData || openApiImporting}
              onClick={handleOpenApiImport}
              className="w-full"
            >
              {openApiImporting ? "Importing..." : "Import as Collection"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
