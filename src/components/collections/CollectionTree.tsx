import { useMemo } from "react";
import { ChevronRight, FolderClosed } from "lucide-react";
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
import { useTabStore } from "@/stores/tabStore";
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

  return (
    <SidebarMenu>
      {tree.map((node) => (
        <TreeNodeComponent key={node.data.id} node={node} />
      ))}
    </SidebarMenu>
  );
}

function TreeNodeComponent({ node }: { node: TreeNode }) {
  switch (node.type) {
    case "collection":
      return <CollectionNode node={node} />;
    case "folder":
      return <FolderNode node={node} />;
    case "request":
      return <RequestNode node={node} />;
  }
}

function CollectionNode({
  node,
}: {
  node: Extract<TreeNode, { type: "collection" }>;
}) {
  return (
    <SidebarMenuItem>
      <Collapsible defaultOpen className="group/collapsible">
        <CollapsibleTrigger asChild>
          <SidebarMenuButton size="sm" className="font-medium">
            <ChevronRight className="size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90" />
            <span className="truncate">{node.data.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children.map((child) => (
              <SidebarMenuSubItem key={child.data.id}>
                <SubTreeNodeComponent node={child} />
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function FolderNode({
  node,
}: {
  node: Extract<TreeNode, { type: "folder" }>;
}) {
  return (
    <Collapsible defaultOpen className="group/folder">
      <CollapsibleTrigger asChild>
        <SidebarMenuSubButton size="sm" className="cursor-pointer">
          <FolderClosed className="size-3.5 text-muted-foreground" />
          <span className="truncate">{node.data.name}</span>
        </SidebarMenuSubButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {node.children.map((child) => (
            <SidebarMenuSubItem key={child.data.id}>
              <SubTreeNodeComponent node={child} />
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RequestNode({
  node,
}: {
  node: Extract<TreeNode, { type: "request" }>;
}) {
  const openSavedRequest = useTabStore((s) => s.openSavedRequest);
  const activeTab = useTabStore((s) => s.getActiveTab());
  const isActive = activeTab?.savedRequestId === node.data.id;

  return (
    <SidebarMenuButton
      size="sm"
      isActive={isActive}
      onClick={() => openSavedRequest(node.data)}
      className="cursor-pointer"
    >
      <MethodBadge
        method={node.data.method}
        className="text-[9px] px-1 py-0 rounded leading-tight"
      />
      <span className="truncate">{node.data.name}</span>
    </SidebarMenuButton>
  );
}

// For sub-level rendering (inside SidebarMenuSub)
function SubTreeNodeComponent({ node }: { node: TreeNode }) {
  switch (node.type) {
    case "folder":
      return <FolderNode node={node as Extract<TreeNode, { type: "folder" }>} />;
    case "request":
      return <RequestSubNode node={node as Extract<TreeNode, { type: "request" }>} />;
    case "collection":
      return null; // collections don't nest inside other collections
  }
}

function RequestSubNode({
  node,
}: {
  node: Extract<TreeNode, { type: "request" }>;
}) {
  const openSavedRequest = useTabStore((s) => s.openSavedRequest);
  const activeTab = useTabStore((s) => s.getActiveTab());
  const isActive = activeTab?.savedRequestId === node.data.id;

  return (
    <SidebarMenuSubButton
      size="sm"
      isActive={isActive}
      onClick={() => openSavedRequest(node.data)}
      className="cursor-pointer"
    >
      <MethodBadge
        method={node.data.method}
        className="text-[9px] px-1 py-0 rounded leading-tight"
      />
      <span className="truncate">{node.data.name}</span>
    </SidebarMenuSubButton>
  );
}
