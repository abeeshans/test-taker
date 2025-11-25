import React, { useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Folder, Pencil, Trash, Info, CaretDown, CaretUp, Star } from "@phosphor-icons/react";

interface FolderCardProps {
  folder: {
    id: string;
    name: string;
    test_count?: number;
    folder_count?: number;
    avg_score?: number;
    parent_id?: string | null;
  };
  folders: any[];
  tests: any[];
  onToggle: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}

// Draggable Folder Item within Folder
function DraggableFolderItem({ folder }: { folder: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `folder-drag-${folder.id}`, // Consistent with main grid drag ID
    data: { type: "folder-drag", id: folder.id, parentId: folder.parent_id, fromPreview: true },
  });

  const style = {
    // transform: CSS.Translate.toString(transform), // Disable transform to let Overlay handle movement
    opacity: isDragging ? 0.3 : 1,
    // zIndex: isDragging ? 10000 : "auto", // No need for zIndex if not moving
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="text-xs text-gray-600 dark:text-white truncate flex items-center gap-2 group cursor-grab active:cursor-grabbing hover:bg-blue-100/50 dark:hover:bg-slate-700/50 rounded px-1 py-1"
    >
      <Folder size={14} weight="fill" className="text-blue-400 flex-shrink-0" />
      <span className="truncate flex-1" title={folder.name}>
        {folder.name}
      </span>
      <span className="text-[10px] text-gray-400 dark:text-gray-300 flex-shrink-0">
        {(folder.folder_count || 0) + (folder.test_count || 0)} items
      </span>
    </div>
  );
}

// Draggable Test Item within Folder
function DraggableTestItem({ test }: { test: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `folder-test-${test.id}`, // Prefix to avoid ID collisions
    data: { type: "test", id: test.id, folderId: test.folder_id, fromPreview: true },
  });

  const style = {
    // transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    // zIndex: isDragging ? 10000 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="text-xs text-gray-500 dark:text-white truncate flex justify-between items-center group cursor-grab active:cursor-grabbing hover:bg-blue-100/50 dark:hover:bg-slate-700/50 rounded px-1 py-0.5"
    >
      <span className="truncate flex-1 flex items-center gap-1" title={test.title}>
        {test.is_starred && <Star size={10} weight="fill" className="text-yellow-400 flex-shrink-0" />}
        {test.title}
      </span>
      <span
        className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded ${
          test.avg_score !== null && test.avg_score !== undefined
            ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            : "text-gray-400 dark:text-slate-400"
        }`}
      >
        {test.avg_score !== null && test.avg_score !== undefined ? `${test.avg_score}%` : "N/A"}
      </span>
    </div>
  );
}

function FolderCard({ folder, folders, tests, onToggle, onRename, onDelete, isSelected, onClick, onDoubleClick }: FolderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only enable folder drop zone for external items, not items from within this folder
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", id: folder.id },
    disabled: false, // We'll handle this in the drag logic instead
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `folder-drag-${folder.id}`,
    data: { type: "folder-drag", id: folder.id, parentId: folder.parent_id ?? null, fromPreview: false },
  });

  const style = {
    // transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  // Sort tests: Completed first (alphabetical), then Uncompleted (alphabetical)
  const sortedTests = React.useMemo(() => {
    return [...tests].sort((a, b) => {
      const aCompleted = (a.attempt_count > 0 || a.last_score !== null);
      const bCompleted = (b.attempt_count > 0 || b.last_score !== null);

      if (aCompleted && !bCompleted) return -1;
      if (!aCompleted && bCompleted) return 1;

      return a.title.localeCompare(b.title);
    });
  }, [tests]);

  const displayFolderCount = folder.folder_count !== undefined ? folder.folder_count : folders.length;
  const displayTestCount = folder.test_count !== undefined ? folder.test_count : tests.length;

  // Calculate real-time average from displayed tests if available
  const calculatedAvg = React.useMemo(() => {
    if (tests.length === 0) return null;
    const scores = tests.map(t => t.avg_score).filter(s => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }, [tests]);

  const displayAvg = calculatedAvg !== null ? calculatedAvg : folder.avg_score;

  // Determine if we need to show the "Show More" button
  // We'll show it if there are more than 4 items total
  const totalItems = folders.length + tests.length;
  const shouldShowMore = totalItems > 4;
  const displayedFolders = isExpanded ? folders : folders.slice(0, 2);
  const displayedTests = isExpanded ? sortedTests : sortedTests.slice(0, Math.max(0, 4 - displayedFolders.length));

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDragRef(node);
      }}
      style={style}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      className={`folder-card bg-blue-50/50 dark:bg-[#1E2A45] rounded-lg p-4 border border-blue-100 dark:border-slate-700 shadow-sm flex flex-col transition-all relative cursor-pointer group
        ${isExpanded ? "h-auto min-h-[18rem]" : "h-72"}
        ${isOver ? "ring-2 ring-blue-400 bg-blue-100 dark:bg-slate-600 !shadow-lg scale-[1.02]" : ""}
        ${isDragging ? "opacity-50" : "hover:shadow-md dark:hover:border-slate-600"}
        ${isSelected ? "!ring-2 !ring-blue-500 !shadow-md z-10 bg-blue-50 dark:bg-slate-600" : ""}
      `}
      {...attributes}
      {...listeners}
    >
      {/* Blue Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 rounded-t-lg" />
      {/* Header - Draggable Handle */}
      <div className="flex items-start justify-between mb-3">
        <Folder size={24} weight="regular" className="text-gray-700 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => onRename(folder.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(folder.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer">
            <Trash size={16} />
          </button>
          <div className="relative group/info">
            <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-all hover:scale-110 active:scale-95 cursor-help">
              <Info size={16} />
            </button>
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover/info:block w-32 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 text-center">
              Double click to open folder
            </div>
          </div>
        </div>
      </div>

      {/* Title & Stats */}
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1 truncate" title={folder.name}>
          {folder.name}
        </h3>
        <div className="text-sm text-gray-500 dark:text-slate-300 flex justify-between items-end">
          <div>
            <div className="text-xs mt-0.5 text-gray-400 dark:text-slate-400">
              {displayFolderCount} folder(s) • {displayTestCount} test(s)
            </div>
          </div>
          {displayAvg !== undefined && displayAvg !== null && (
            <div className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              Avg: {displayAvg}%
            </div>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <div
        className={`flex-1 space-y-1 pr-1 relative ${
          isExpanded ? "overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent max-h-96" : "overflow-hidden"
        }`}
      >
        {/* Sub-folders */}
        {displayedFolders.map((sub) => (
          <DraggableFolderItem key={sub.id} folder={sub} />
        ))}

        {/* Tests */}
        {displayedTests.map((test) => (
          <DraggableTestItem key={test.id} test={test} />
        ))}

        {tests.length === 0 && folders.length === 0 && <div className="text-xs text-gray-400 italic">Empty folder</div>}
        
        {/* Gradient Overlay when collapsed and has more items */}
        {!isExpanded && shouldShowMore && !isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-50/90 to-transparent dark:from-[#1E2A45] dark:to-[#1E2A45]/0 pointer-events-none" />
        )}
      </div>

      {/* Show More/Less Button */}
      {shouldShowMore && (
        <div className="mt-2 pt-2 border-t border-blue-200/30 dark:border-slate-600/30 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-white hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100/50 px-2 py-1 rounded transition-all hover:scale-105 active:scale-95 w-full justify-center cursor-pointer font-medium opacity-70 hover:opacity-100"
          >
            {isExpanded ? (
              <>
                <CaretUp size={12} />
                Show Less
              </>
            ) : (
              <>
                <CaretDown size={12} />
                Show {totalItems - displayedFolders.length - displayedTests.length} More Items
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(FolderCard);
