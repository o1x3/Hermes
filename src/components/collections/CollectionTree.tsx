import { useMemo, useState, useCallback } from "react";
import { ChevronRight, FolderClosed, GripVertical } from "lucide-react";
import { DraggableTree, SortableItem } from "./DraggableTree";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { MethodBadge } from "@/components/request/MethodBadge";
import { RenameInput } from "./RenameInput";
import {
  TreeContextMenuWrapper,
  collectionActions,
  folderActions,
  requestActions,
} from "./TreeContextMenu";
import { MoveRequestDialog } from "./MoveRequestDialog";
import { useTabStore } from "@/stores/tabStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { buildTree } from "@/lib/tree-utils";
import type {
  Collection,
  Folder,
  SavedRequest,
  TreeNode,
} from "@/types/collection";

interface CollectionTreeProps {
  collections: Collection[];
  folders: Folder[];
  requests: SavedRequest[];
}

export function CollectionTree({
  collections,
  folders,
  requests,
}: CollectionTreeProps) {
  const tree = useMemo(
    () => buildTree(collections, folders, requests),
    [collections, folders, requests],
  );

  const [moveTarget, setMoveTarget] = useState<SavedRequest | null>(null);

  const allRequestIds = useMemo(
    () => requests.map((r) => r.id),
    [requests],
  );

  return (
    <>
      <DraggableTree requestIds={allRequestIds} requests={requests}>
        <SidebarMenu>
          {tree.map((node) => {
            if (node.type !== "collection") return null;
            return (
              <CollectionNode
                key={node.data.id}
                node={node}
                onMoveRequest={setMoveTarget}
              />
            );
          })}
        </SidebarMenu>
      </DraggableTree>

      <MoveRequestDialog
        open={!!moveTarget}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
        request={moveTarget}
      />
    </>
  );
}

function CollectionNode({
  node,
  onMoveRequest,
}: {
  node: Extract<TreeNode, { type: "collection" }>;
  onMoveRequest: (req: SavedRequest) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const updateCollection = useCollectionStore((s) => s.updateCollection);
  const deleteCollection = useCollectionStore((s) => s.deleteCollection);
  const createFolder = useCollectionStore((s) => s.createFolder);
  const saveRequest = useCollectionStore((s) => s.saveRequest);

  const handleNewFolder = useCallback(async () => {
    await createFolder(node.data.id, "New Folder");
  }, [createFolder, node.data.id]);

  const handleNewRequest = useCallback(async () => {
    await saveRequest({
      collectionId: node.data.id,
      folderId: null,
      name: "New Request",
      method: "GET",
      url: "",
      headers: [],
      params: [],
      body: { type: "none" },
      auth: { type: "none" },
      variables: [],
    });
  }, [saveRequest, node.data.id]);

  const actions = collectionActions({
    onNewFolder: handleNewFolder,
    onNewRequest: handleNewRequest,
    onRename: () => setRenaming(true),
  });

  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen className="group/collapsible">
        <TreeContextMenuWrapper
          items={actions}
          onDelete={() => deleteCollection(node.data.id)}
          deleteName={node.data.name}
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton size="sm" className="font-medium">
              <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              {renaming ? (
                <RenameInput
                  value={node.data.name}
                  onSave={(name) => {
                    updateCollection(node.data.id, { name });
                    setRenaming(false);
                  }}
                  onCancel={() => setRenaming(false)}
                />
              ) : (
                <span className="truncate">{node.data.name}</span>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
        </TreeContextMenuWrapper>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) => (
              <SidebarMenuSubItem key={child.data.id}>
                <SubTreeNode node={child} onMoveRequest={onMoveRequest} />
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function SubTreeNode({
  node,
  onMoveRequest,
}: {
  node: TreeNode;
  onMoveRequest: (req: SavedRequest) => void;
}) {
  switch (node.type) {
    case "folder":
      return <FolderNode node={node} onMoveRequest={onMoveRequest} />;
    case "request":
      return <RequestSubNode node={node} onMoveRequest={onMoveRequest} />;
    case "collection":
      return null;
  }
}

function FolderNode({
  node,
  onMoveRequest,
}: {
  node: Extract<TreeNode, { type: "folder" }>;
  onMoveRequest: (req: SavedRequest) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const updateFolder = useCollectionStore((s) => s.updateFolder);
  const deleteFolder = useCollectionStore((s) => s.deleteFolder);
  const createFolder = useCollectionStore((s) => s.createFolder);
  const saveRequest = useCollectionStore((s) => s.saveRequest);

  const handleNewRequest = useCallback(async () => {
    await saveRequest({
      collectionId: node.data.collectionId,
      folderId: node.data.id,
      name: "New Request",
      method: "GET",
      url: "",
      headers: [],
      params: [],
      body: { type: "none" },
      auth: { type: "none" },
      variables: [],
    });
  }, [saveRequest, node.data.collectionId, node.data.id]);

  const handleNewSubfolder = useCallback(async () => {
    await createFolder(node.data.collectionId, "New Folder", node.data.id);
  }, [createFolder, node.data.collectionId, node.data.id]);

  const actions = folderActions({
    onNewRequest: handleNewRequest,
    onNewSubfolder: handleNewSubfolder,
    onRename: () => setRenaming(true),
  });

  return (
    <Collapsible defaultOpen className="group/folder">
      <TreeContextMenuWrapper
        items={actions}
        onDelete={() => deleteFolder(node.data.id)}
        deleteName={node.data.name}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton size="sm" className="cursor-pointer">
            <FolderClosed className="size-3.5 text-muted-foreground" />
            {renaming ? (
              <RenameInput
                value={node.data.name}
                onSave={(name) => {
                  updateFolder(node.data.id, { name });
                  setRenaming(false);
                }}
                onCancel={() => setRenaming(false)}
              />
            ) : (
              <span className="truncate">{node.data.name}</span>
            )}
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
      </TreeContextMenuWrapper>
      <CollapsibleContent>
        <SidebarMenuSub>
          {node.children.map((child) => (
            <SidebarMenuSubItem key={child.data.id}>
              <SubTreeNode node={child} onMoveRequest={onMoveRequest} />
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RequestSubNode({
  node,
  onMoveRequest,
}: {
  node: Extract<TreeNode, { type: "request" }>;
  onMoveRequest: (req: SavedRequest) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const openSavedRequest = useTabStore((s) => s.openSavedRequest);
  const activeTab = useTabStore((s) => s.getActiveTab());
  const isActive = activeTab?.savedRequestId === node.data.id;
  const updateSavedRequest = useCollectionStore((s) => s.updateSavedRequest);
  const deleteSavedRequest = useCollectionStore((s) => s.deleteSavedRequest);
  const duplicateRequest = useCollectionStore((s) => s.duplicateRequest);

  const actions = requestActions({
    onRename: () => setRenaming(true),
    onDuplicate: () => duplicateRequest(node.data.id),
    onMove: () => onMoveRequest(node.data),
  });

  return (
    <SortableItem id={node.data.id}>
      <TreeContextMenuWrapper
        items={actions}
        onDelete={() => deleteSavedRequest(node.data.id)}
        deleteName={node.data.name}
      >
        <SidebarMenuSubButton
          size="sm"
          isActive={isActive}
          onClick={() => openSavedRequest(node.data)}
          className="cursor-pointer"
        >
          <GripVertical className="size-3 text-muted-foreground/40 shrink-0 cursor-grab" />
          <MethodBadge
            method={node.data.method}
            className="text-[9px] px-1 py-0 rounded leading-tight"
          />
          {renaming ? (
            <RenameInput
              value={node.data.name}
              onSave={(name) => {
                updateSavedRequest(node.data.id, { name });
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="truncate">{node.data.name}</span>
          )}
        </SidebarMenuSubButton>
      </TreeContextMenuWrapper>
    </SortableItem>
  );
}
