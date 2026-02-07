import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCollectionStore } from "@/stores/collectionStore";
import type { SavedRequest } from "@/types/collection";

interface DraggableTreeProps {
  children: React.ReactNode;
  requestIds: string[];
  requests: SavedRequest[];
}

export function DraggableTree({
  children,
  requestIds,
  requests,
}: DraggableTreeProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const reorderItems = useCollectionStore((s) => s.reorderItems);
  const moveRequest = useCollectionStore((s) => s.moveRequest);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeReq = requests.find((r) => r.id === active.id);
      const overReq = requests.find((r) => r.id === over.id);
      if (!activeReq || !overReq) return;

      // If moving to a different parent (folder/collection), use moveRequest
      if (
        activeReq.folderId !== overReq.folderId ||
        activeReq.collectionId !== overReq.collectionId
      ) {
        moveRequest(activeReq.id, overReq.folderId, overReq.collectionId);
        return;
      }

      // Reorder within same parent
      const siblings = requests
        .filter(
          (r) =>
            r.collectionId === activeReq.collectionId &&
            r.folderId === activeReq.folderId,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const oldIdx = siblings.findIndex((r) => r.id === active.id);
      const newIdx = siblings.findIndex((r) => r.id === over.id);

      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(oldIdx, 1);
      reordered.splice(newIdx, 0, moved);

      const items = reordered.map((r, i) => ({
        id: r.id,
        sortOrder: i,
      }));

      reorderItems(items, "requests");
    },
    [requests, reorderItems, moveRequest],
  );

  const activeRequest = activeId
    ? requests.find((r) => r.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={requestIds}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
      <DragOverlay>
        {activeRequest && (
          <div className="rounded-md bg-card border border-border px-2 py-1 text-xs shadow-lg">
            <span className="font-mono text-[9px] font-bold mr-1">
              {activeRequest.method}
            </span>
            {activeRequest.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}
