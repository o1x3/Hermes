import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabase";
import { useCollectionStore } from "@/stores/collectionStore";

export async function shareCollectionToTeam(
  collectionId: string,
  teamId: string,
): Promise<void> {
  const store = useCollectionStore.getState();
  const collection = store.getCollection(collectionId);
  if (!collection) throw new Error("Collection not found");

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Upload collection to Supabase
  const { data: cloudCollection, error: colErr } = await supabase
    .from("collections")
    .insert({
      team_id: teamId,
      name: collection.name,
      description: collection.description,
      default_headers: collection.defaultHeaders,
      default_auth: collection.defaultAuth,
      variables: collection.variables,
      sort_order: collection.sortOrder,
      created_by: userId,
    })
    .select()
    .single();
  if (colErr) throw colErr;

  // Mark local collection as synced
  await invoke("mark_synced", {
    table: "collections",
    localId: collection.id,
    cloudId: cloudCollection.id,
    teamId,
  });

  // Upload folders
  const folders = store.folders.filter((f) => f.collectionId === collectionId);
  const folderCloudIdMap = new Map<string, string>();

  // Sort folders so parents come before children
  const sortedFolders = [...folders].sort((a, b) => {
    if (a.parentFolderId === null && b.parentFolderId !== null) return -1;
    if (a.parentFolderId !== null && b.parentFolderId === null) return 1;
    return 0;
  });

  for (const folder of sortedFolders) {
    const parentCloudId = folder.parentFolderId
      ? folderCloudIdMap.get(folder.parentFolderId) ?? null
      : null;

    const { data: cloudFolder, error: fErr } = await supabase
      .from("folders")
      .insert({
        collection_id: cloudCollection.id,
        parent_folder_id: parentCloudId,
        name: folder.name,
        default_headers: folder.defaultHeaders,
        default_auth: folder.defaultAuth,
        variables: folder.variables,
        sort_order: folder.sortOrder,
      })
      .select()
      .single();
    if (fErr) throw fErr;

    folderCloudIdMap.set(folder.id, cloudFolder.id);
    await invoke("mark_synced", {
      table: "folders",
      localId: folder.id,
      cloudId: cloudFolder.id,
    });
  }

  // Upload requests
  const requests = store.requests.filter((r) => r.collectionId === collectionId);
  for (const req of requests) {
    const folderCloudId = req.folderId
      ? folderCloudIdMap.get(req.folderId) ?? null
      : null;

    const { data: cloudReq, error: rErr } = await supabase
      .from("requests")
      .insert({
        collection_id: cloudCollection.id,
        folder_id: folderCloudId,
        name: req.name,
        method: req.method,
        url: req.url,
        headers: req.headers,
        params: req.params,
        body: req.body,
        auth: req.auth,
        variables: req.variables,
        sort_order: req.sortOrder,
        updated_by: userId,
      })
      .select()
      .single();
    if (rErr) throw rErr;

    await invoke("mark_synced", {
      table: "requests",
      localId: req.id,
      cloudId: cloudReq.id,
    });
  }

  // Refresh workspace to reflect sync metadata
  await store.loadWorkspace();
}

export async function unshareCollection(collectionId: string): Promise<void> {
  const store = useCollectionStore.getState();
  const collection = store.getCollection(collectionId);
  if (!collection?.cloudId) throw new Error("Collection not synced");

  // Delete from Supabase (cascades to folders/requests)
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collection.cloudId);
  if (error) throw error;

  // Clear sync metadata locally
  await invoke("mark_synced", {
    table: "collections",
    localId: collection.id,
    cloudId: "",
    teamId: "",
  });

  // Refresh
  await store.loadWorkspace();
}
