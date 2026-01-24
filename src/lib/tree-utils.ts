import type {
  Collection,
  Folder,
  SavedRequest,
  TreeNode,
} from "@/types/collection";

export function buildTree(
  collections: Collection[],
  folders: Folder[],
  requests: SavedRequest[],
): TreeNode[] {
  return collections
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((col): TreeNode => ({
      type: "collection",
      data: col,
      children: buildCollectionChildren(col.id, null, folders, requests),
    }));
}

function buildCollectionChildren(
  collectionId: string,
  parentFolderId: string | null,
  folders: Folder[],
  requests: SavedRequest[],
): TreeNode[] {
  const childFolders = folders
    .filter(
      (f) =>
        f.collectionId === collectionId &&
        f.parentFolderId === parentFolderId,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((folder): TreeNode => ({
      type: "folder",
      data: folder,
      children: buildCollectionChildren(
        collectionId,
        folder.id,
        folders,
        requests,
      ),
    }));

  const childRequests = requests
    .filter(
      (r) =>
        r.collectionId === collectionId &&
        r.folderId === parentFolderId,
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((req): TreeNode => ({
      type: "request",
      data: req,
    }));

  return [...childFolders, ...childRequests];
}
