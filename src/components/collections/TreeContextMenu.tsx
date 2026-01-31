import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FolderPlus,
  FilePlus,
  Pencil,
  Trash2,
  Copy,
  ArrowRightLeft,
} from "lucide-react";
import { useState } from "react";

interface ContextMenuWrapperProps {
  children: React.ReactNode;
  items: ContextAction[];
  onDelete?: () => Promise<void>;
  deleteName?: string;
}

interface ContextAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

export function TreeContextMenuWrapper({
  children,
  items,
  onDelete,
  deleteName,
}: ContextMenuWrapperProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const allItems = onDelete
    ? [
        ...items,
        {
          label: "Delete",
          icon: <Trash2 className="size-3.5" />,
          onClick: () => setShowDeleteConfirm(true),
          destructive: true,
        },
      ]
    : items;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {allItems.map((item, i) => (
            <span key={i}>
              {item.destructive && i > 0 && <ContextMenuSeparator />}
              <ContextMenuItem
                onClick={item.onClick}
                className={item.destructive ? "text-destructive" : undefined}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </ContextMenuItem>
            </span>
          ))}
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{deleteName}</strong> and all its contents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                await onDelete?.();
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Pre-built action factories
export function collectionActions({
  onNewFolder,
  onNewRequest,
  onRename,
}: {
  onNewFolder: () => void;
  onNewRequest: () => void;
  onRename: () => void;
}): ContextAction[] {
  return [
    {
      label: "New Folder",
      icon: <FolderPlus className="size-3.5" />,
      onClick: onNewFolder,
    },
    {
      label: "New Request",
      icon: <FilePlus className="size-3.5" />,
      onClick: onNewRequest,
    },
    {
      label: "Rename",
      icon: <Pencil className="size-3.5" />,
      onClick: onRename,
    },
  ];
}

export function folderActions({
  onNewRequest,
  onNewSubfolder,
  onRename,
}: {
  onNewRequest: () => void;
  onNewSubfolder: () => void;
  onRename: () => void;
}): ContextAction[] {
  return [
    {
      label: "New Request",
      icon: <FilePlus className="size-3.5" />,
      onClick: onNewRequest,
    },
    {
      label: "New Subfolder",
      icon: <FolderPlus className="size-3.5" />,
      onClick: onNewSubfolder,
    },
    {
      label: "Rename",
      icon: <Pencil className="size-3.5" />,
      onClick: onRename,
    },
  ];
}

export function requestActions({
  onRename,
  onDuplicate,
  onMove,
}: {
  onRename: () => void;
  onDuplicate: () => void;
  onMove: () => void;
}): ContextAction[] {
  return [
    {
      label: "Rename",
      icon: <Pencil className="size-3.5" />,
      onClick: onRename,
    },
    {
      label: "Duplicate",
      icon: <Copy className="size-3.5" />,
      onClick: onDuplicate,
    },
    {
      label: "Move to...",
      icon: <ArrowRightLeft className="size-3.5" />,
      onClick: onMove,
    },
  ];
}
