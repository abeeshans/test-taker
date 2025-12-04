import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { Trash, PencilSimple, FloppyDisk, X, DotsSixVertical } from '@phosphor-icons/react';
import { createClient } from '@/utils/supabase/client';
import { API_URL } from '@/lib/api';
import LoadingSpinner from '../LoadingSpinner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ManageSetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  testId: string;
  testTitle: string;
  onUpdate: () => void;
}

interface TestSet {
  id: string; // Temporary ID for dnd-kit
  title: string;
  questions: any[];
}

interface SortableSetItemProps {
  set: TestSet;
  index: number;
  totalSets: number;
  onRename: (index: number, newName: string) => void;
  onDelete: (index: number) => void;
}

function SortableSetItem({ set, index, totalSets, onRename, onDelete }: SortableSetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: set.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 ${isDragging ? 'shadow-lg ring-2 ring-blue-500/20' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <DotsSixVertical size={20} />
        </div>
        <label className="text-xs text-gray-500 dark:text-slate-400 block">
          Set {index + 1} ({set.questions.length} Qs)
        </label>
      </div>
      <div className="flex items-center gap-3 pl-7">
        <input
          type="text"
          value={set.title}
          onChange={(e) => onRename(index, e.target.value)}
          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Set Name"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start from input
        />
        <div className="relative group/delete">
          <button
            onClick={() => onDelete(index)}
            disabled={totalSets <= 1}
            className={`p-2 rounded-lg transition-colors ${
              totalSets <= 1
                ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            <Trash size={20} />
          </button>
          {totalSets <= 1 && (
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/delete:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 text-center pointer-events-none">
              Cannot delete the only set in a test
              {/* Arrow pointing right */}
              <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-gray-800 rotate-45"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManageSetsModal({ isOpen, onClose, testId, testTitle, onUpdate }: ManageSetsModalProps) {
  const [sets, setSets] = useState<TestSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch test details when opened
  useEffect(() => {
    if (isOpen && testId) {
      fetchTestDetails();
    }
  }, [isOpen, testId]);

  const fetchTestDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(`${API_URL}/tests/${testId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch test details");

      const data = await response.json();
      if (data.content && data.content.sets) {
        // Add unique IDs for dnd-kit
        setSets(data.content.sets.map((s: any) => ({ ...s, id: crypto.randomUUID() })));
      } else {
        setSets([]);
      }
    } catch (err: any) {
      console.error("Error fetching sets:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameSet = (index: number, newName: string) => {
    const newSets = [...sets];
    newSets[index].title = newName;
    setSets(newSets);
  };

  const handleDeleteSet = (index: number) => {
    if (sets.length <= 1) return;
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Recalculate stats
      const questionCounts = sets.map(s => s.questions.length);
      const totalQuestions = questionCounts.reduce((a, b) => a + b, 0);
      const setCount = sets.length;
      
      let questionRange = null;
      if (setCount > 1) {
        const minQ = Math.min(...questionCounts);
        const maxQ = Math.max(...questionCounts);
        questionRange = minQ !== maxQ ? `${minQ}-${maxQ}` : `${minQ}`;
      }

      // Prepare content for saving (remove temporary IDs)
      const setsToSave = sets.map(({ id, ...rest }) => rest);
      const newContent = { sets: setsToSave };

      const response = await fetch(`${API_URL}/tests/${testId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: newContent,
          question_count: totalQuestions,
          set_count: setCount,
          question_range: questionRange
        }),
      });

      if (!response.ok) throw new Error("Failed to update test");

      onUpdate();
      onClose();
    } catch (err: any) {
      console.error("Error saving sets:", err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={`Manage Sets: ${testTitle}`} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <LoadingSpinner size={32} />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        ) : (
          <>
            <div className="space-y-3 pr-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sets.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sets.map((set, idx) => (
                    <SortableSetItem
                      key={set.id}
                      set={set}
                      index={idx}
                      totalSets={sets.length}
                      onRename={handleRenameSet}
                      onDelete={handleDeleteSet}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 dark:bg-purple-600 hover:bg-blue-700 dark:hover:bg-purple-700 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner size={16} color="text-white" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FloppyDisk size={18} weight="bold" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
}
