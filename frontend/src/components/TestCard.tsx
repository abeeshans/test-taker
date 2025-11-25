import React, { useState, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { DotsThreeVertical, Star, Trash, Pencil, ArrowCounterClockwise, DownloadSimple } from "@phosphor-icons/react";

interface TestCardProps {
  test: {
    id: string;
    title: string;
    created_at: string;
    is_starred: boolean;
    folder_id?: string | null;
    last_accessed?: string;
    question_count: number;
    set_count: number;
    attempt_count: number;
    avg_score?: number;
    best_score?: number;
    last_score?: number;
    question_range?: string;
  };
  onStart: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
  onReset: (id: string) => void;
  onToggleStar: (id: string, isStarred: boolean) => void;
  onReview: (id: string) => void;
  onDownload: (id: string, title: string) => void;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}

function TestCard({ test, onStart, onDelete, onRename, onReset, onToggleStar, onReview, onDownload, isSelected, onClick, onDoubleClick }: TestCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: test.id,
    data: { type: "test", id: test.id, folderId: test.folder_id ?? null, fromPreview: false },
  });

  const style = {
    // transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`test-card bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 relative flex flex-col h-72 hover:shadow-md dark:hover:border-slate-600 cursor-pointer
        ${isSelected ? "!ring-2 !ring-blue-500 !shadow-md z-10" : ""}
      `}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
    >
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-2 line-clamp-2" title={test.title}>
          {test.title}
        </h3>

        <div className="space-y-1 text-sm text-gray-500 dark:text-slate-300">
          <div>
            <span>{test.attempt_count} attempt(s)</span>
          </div>

          <div>
            {test.question_range ? `${test.question_range}` : test.question_count} questions • {test.set_count} sets
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="flex flex-col items-center p-1.5 bg-gray-50 dark:bg-slate-900/50 rounded border border-gray-100 dark:border-slate-700">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold">Avg</span>
              <span className={`text-sm font-bold ${test.avg_score !== null && test.avg_score !== undefined ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-slate-600"}`}>
                {test.avg_score !== null && test.avg_score !== undefined ? `${test.avg_score}%` : "N/A"}
              </span>
            </div>
            <div className="flex flex-col items-center p-1.5 bg-gray-50 dark:bg-slate-900/50 rounded border border-gray-100 dark:border-slate-700">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold">Best</span>
              <span className={`text-sm font-bold ${test.best_score !== null && test.best_score !== undefined ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-slate-600"}`}>
                {test.best_score !== null && test.best_score !== undefined ? `${test.best_score}%` : "N/A"}
              </span>
            </div>
            <div className="flex flex-col items-center p-1.5 bg-gray-50 dark:bg-slate-900/50 rounded border border-gray-100 dark:border-slate-700">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 font-semibold">Last</span>
              <span className={`text-sm font-bold ${test.last_score !== null && test.last_score !== undefined ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-slate-600"}`}>
                {test.last_score !== null && test.last_score !== undefined ? `${test.last_score}%` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-2">
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart(test.id);
            }}
            className="px-4 py-1.5 bg-blue-800 text-white text-sm font-medium rounded hover:bg-blue-900 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow cursor-pointer"
          >
            Start
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReview(test.id);
            }}
            disabled={test.attempt_count === 0}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-all hover:scale-105 active:scale-95 ${
              test.attempt_count === 0
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 cursor-pointer'
            }`}
            title={test.attempt_count === 0 ? "No attempts yet" : "Review your last test"}
          >
            Review Last Test
          </button>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer"
          >
            <DotsThreeVertical size={24} weight="bold" />
          </button>

          {showMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-10 animate-in fade-in zoom-in-95 duration-100 origin-bottom-right">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(test.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Pencil size={16} /> Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReset(test.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowCounterClockwise size={16} /> Reset Stats
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(test.id, test.title);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <DownloadSimple size={16} /> Download JSON
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(test.id);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash size={16} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(test.id, !test.is_starred);
        }}
        className={`absolute top-4 right-4 p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer ${
          test.is_starred ? "text-yellow-400 hover:bg-yellow-50" : "text-gray-300 hover:text-gray-400 hover:bg-gray-100"
        }`}
      >
        <Star size={20} weight={test.is_starred ? "fill" : "regular"} />
      </button>
    </div>
  );
}

export default React.memo(TestCard);
