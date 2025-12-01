import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects, DropAnimation, useDroppable, pointerWithin, closestCorners, rectIntersection, CollisionDetection, MeasuringStrategy } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Test } from '@/types';
import BaseModal from './BaseModal';
import { CaretRight, PencilSimple, Warning } from '@phosphor-icons/react';
import { createClient } from '@/utils/supabase/client';

interface MergeTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTest: Test;
  targetTest: Test;
  onMerge: (updates: any[], deletes: string[]) => void;
}

interface SetItem {
  id: string;
  title: string;
  originalTestId: string;
  questions: any[];
}

function SortableSetItem({ id, title, questionsCount, onRename, isOverlay = false }: { id: string, title: string, questionsCount: number, onRename?: (newTitle: string) => void, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  const handleRenameSubmit = () => {
    if (editTitle.trim() && onRename) {
        onRename(editTitle);
    } else {
        setEditTitle(title);
    }
    setIsEditing(false);
  };

  const content = (
      <div className={`bg-white dark:bg-slate-800 p-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex items-center justify-between group cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${isOverlay ? 'scale-105 border-blue-500 dark:border-blue-400 shadow-xl pointer-events-none' : 'mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-1 h-6 bg-gray-200 dark:bg-slate-700 rounded-full flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors" />
              {isEditing ? (
                  <input 
                      type="text" 
                      value={editTitle} 
                      maxLength={20}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={(e) => {
                          e.stopPropagation(); 
                          if (e.key === 'Enter') handleRenameSubmit();
                      }}
                      autoFocus
                      className="flex-1 bg-gray-50 dark:bg-slate-900 border border-blue-500 rounded px-1 py-0.5 text-sm outline-none text-gray-900 dark:text-white min-w-0"
                      onPointerDown={(e) => e.stopPropagation()} 
                  />
              ) : (
                  <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm flex-1 min-w-0" title={title}>{title}</h4>
              )}
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-100 dark:border-slate-700 ml-2">
               {!isEditing && (
                  <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">{questionsCount} q</span>
               )}
               {!isEditing && onRename && (
                  <button 
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => {
                        e.stopPropagation(); 
                        setIsEditing(true);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <PencilSimple size={14} />
                  </button>
              )}
          </div>
      </div>
  );

  if (isOverlay) {
      return content;
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {content}
    </div>
  );
}

// Droppable Container Component to handle isOver state cleanly
function DroppableContainer({ id, children, title, setTitle, sets, onRename }: { id: string, children: React.ReactNode, title: string, setTitle: (t: string) => void, sets: SetItem[], onRename: (id: string, t: string) => void }) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div 
            ref={setNodeRef}
            className={`flex-1 flex flex-col rounded-xl border p-3 transition-all duration-200 min-w-0 min-h-[300px] ${
                isOver
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 dark:border-blue-400 ring-2 ring-blue-400 dark:ring-blue-600 shadow-lg z-10 scale-[1.01]' 
                    : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-slate-600'
            }`}
        >
            <input 
                className="font-bold text-base mb-3 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-gray-900 dark:text-white transition-colors w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 min-h-[200px]">
                <SortableContext items={sets.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {sets.map(set => (
                        <SortableSetItem 
                            key={set.id} 
                            id={set.id} 
                            title={set.title} 
                            questionsCount={set.questions.length} 
                            onRename={(t) => onRename(set.id, t)}
                        />
                    ))}
                </SortableContext>
                {sets.length === 0 && (
                    <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-gray-400 dark:text-slate-600 italic text-sm border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-800/50 pointer-events-none">
                        <p>No sets</p>
                        <p className="text-xs opacity-70">Drop sets here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MergeTestModal({ isOpen, onClose, sourceTest, targetTest, onMerge }: MergeTestModalProps) {
  const [loading, setLoading] = useState(true);
  const [sourceSets, setSourceSets] = useState<SetItem[]>([]);
  const [targetSets, setTargetSets] = useState<SetItem[]>([]);
  const [sourceTitle, setSourceTitle] = useState(sourceTest.title);
  const [targetTitle, setTargetTitle] = useState(targetTest.title);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingMergeAction, setPendingMergeAction] = useState<(() => void) | null>(null);

  const [sourceFullContent, setSourceFullContent] = useState<any>(null);
  const [targetFullContent, setTargetFullContent] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
        fetchData();
    }
  }, [isOpen, sourceTest.id, targetTest.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) return;

        const [res1, res2] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/tests/${sourceTest.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/tests/${targetTest.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        ]);

        if (res1.ok && res2.ok) {
            const data1 = await res1.json();
            const data2 = await res2.json();
            
            setSourceFullContent(data1.content);
            setTargetFullContent(data2.content);
            setSourceTitle(data1.title);
            setTargetTitle(data2.title);

            const parseSets = (testData: any, testId: string): SetItem[] => {
                if (testData.content && testData.content.sets) {
                    return testData.content.sets.map((s: any, i: number) => ({
                        id: `${testId}-set-${i}-${Date.now()}`,
                        title: s.title || `Set ${i+1}`,
                        originalTestId: testId,
                        questions: s.questions
                    }));
                } else {
                    return [];
                }
            };

            setSourceSets(parseSets(data1, sourceTest.id));
            setTargetSets(parseSets(data2, targetTest.id));
        }
    } catch (e) {
        console.error("Error fetching test details", e);
    } finally {
        setLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = useCallback((id: string) => {
    if (id === 'source-container') return 'source';
    if (id === 'target-container') return 'target';
    if (sourceSets.find(s => s.id === id)) return 'source';
    if (targetSets.find(s => s.id === id)) return 'target';
    return null;
  }, [sourceSets, targetSets]);

  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    // Waterfall strategy:
    // 1. Check pointerWithin (best for items)
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;

    // 2. Check rectIntersection (best for containers)
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;

    // 3. Last resort
    return closestCorners(args);
  }, []);

  const handleDragStart = (event: any) => {
      setActiveId(event.active.id);
  };

  const handleDragOver = useCallback((event: any) => {
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || active.id === overId) return;

    const overContainer = findContainer(overId);
    const activeContainer = findContainer(active.id);

    if (!overContainer || !activeContainer) return;

    if (activeContainer !== overContainer) {
      const activeItems = activeContainer === 'source' ? sourceSets : targetSets;
      const overItems = overContainer === 'source' ? sourceSets : targetSets;
      const activeIndex = activeItems.findIndex(i => i.id === active.id);
      const overIndex = overItems.findIndex(i => i.id === overId);

      let newIndex;
      if (overId === 'source-container' || overId === 'target-container') {
        newIndex = overItems.length; // Append to end if dropped on container
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      const item = activeItems[activeIndex];
      
      if (item) {
          if (activeContainer === 'source') {
              setSourceSets(items => items.filter(i => i.id !== active.id));
              setTargetSets(items => {
                  const newItems = [...items];
                  newItems.splice(newIndex, 0, item);
                  return newItems;
              });
          } else {
              setTargetSets(items => items.filter(i => i.id !== active.id));
              setSourceSets(items => {
                  const newItems = [...items];
                  newItems.splice(newIndex, 0, item);
                  return newItems;
              });
          }
      }
    }
  }, [findContainer, sourceSets, targetSets]);

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    const activeContainer = findContainer(active.id);
    const overContainer = over ? findContainer(over.id) : null;

    if (activeContainer && overContainer && activeContainer === overContainer) {
        const activeIndex = (activeContainer === 'source' ? sourceSets : targetSets).findIndex(i => i.id === active.id);
        const overIndex = (overContainer === 'source' ? sourceSets : targetSets).findIndex(i => i.id === over.id);

        if (activeIndex !== overIndex) {
            if (activeContainer === 'source') {
                setSourceSets((items) => arrayMove(items, activeIndex, overIndex));
            } else {
                setTargetSets((items) => arrayMove(items, activeIndex, overIndex));
            }
        }
    }

    setActiveId(null);
  }, [findContainer, sourceSets, targetSets]);

  const moveAllToTarget = () => {
    setTargetSets([...targetSets, ...sourceSets]);
    setSourceSets([]);
  };

  const moveAllToSource = () => {
    setSourceSets([...sourceSets, ...targetSets]);
    setTargetSets([]);
  };

  const handleRename = (id: string, newTitle: string, list: 'source' | 'target') => {
      if (list === 'source') {
          setSourceSets(sourceSets.map(s => s.id === id ? { ...s, title: newTitle } : s));
      } else {
          setTargetSets(targetSets.map(s => s.id === id ? { ...s, title: newTitle } : s));
      }
  };

  const executeMerge = (deletes: string[] = []) => {
      const updates = [];
      
      // 1. Update Source Test
      if (sourceSets.length > 0) {
          const newContent = { ...sourceFullContent, sets: sourceSets.map(s => ({ title: s.title, questions: s.questions })) };
          const totalQ = sourceSets.reduce((acc, s) => acc + s.questions.length, 0);
          updates.push({
              id: sourceTest.id,
              title: sourceTitle,
              content: newContent,
              question_count: totalQ,
              set_count: sourceSets.length,
          });
      }

      // 2. Update Target Test
      if (targetSets.length > 0) {
          const newContent = { ...targetFullContent, sets: targetSets.map(s => ({ title: s.title, questions: s.questions })) };
          const totalQ = targetSets.reduce((acc, s) => acc + s.questions.length, 0);
          updates.push({
              id: targetTest.id,
              title: targetTitle,
              content: newContent,
              question_count: totalQ,
              set_count: targetSets.length,
          });
      }

      onMerge(updates, deletes);
      onClose();
  };

  const handleMergeClick = () => {
    const deletes: string[] = [];
    let message = "";

    if (sourceSets.length === 0) {
        deletes.push(sourceTest.id);
        message = `"${sourceTitle}" will be empty and deleted.`;
    }
    if (targetSets.length === 0) {
        deletes.push(targetTest.id);
        message = message ? `Both "${sourceTitle}" and "${targetTitle}" will be empty and deleted.` : `"${targetTitle}" will be empty and deleted.`;
    }

    if (deletes.length > 0) {
        setConfirmMessage(message);
        setPendingMergeAction(() => () => executeMerge(deletes));
        setConfirmModalOpen(true);
    } else {
        executeMerge([]);
    }
  };

  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: {
            opacity: '0.3',
          },
        },
      }),
  };

  const activeItem = activeId ? (sourceSets.find(s => s.id === activeId) || targetSets.find(s => s.id === activeId)) : null;
  
  // Calculate dynamic height
  const totalSets = sourceSets.length + targetSets.length;
  // Base height for header/footer + padding ~ 180px
  // Item height ~ 50px
  // Min height ~ 300px
  const calculatedHeight = Math.max(totalSets * 50 + 200, 350);
  const modalHeightStyle = { height: `${Math.min(calculatedHeight, 800)}px` }; // Cap at 800px

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Merge Tests" maxWidth="max-w-3xl">
      <div style={modalHeightStyle} className="flex flex-col transition-all duration-300 ease-in-out">
        {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-400">Loading test details...</div>
        ) : (
            <DndContext 
                sensors={sensors} 
                collisionDetection={collisionDetectionStrategy} 
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            >
                <div className="flex-1 flex gap-3 min-h-0">
                    <DroppableContainer 
                        id="source-container"
                        title={sourceTitle}
                        setTitle={setSourceTitle}
                        sets={sourceSets}
                        onRename={(id, t) => handleRename(id, t, 'source')}
                    >
                        {/* Children handled inside DroppableContainer */}
                        {null} 
                    </DroppableContainer>

                    {/* Controls Column */}
                    <div className="flex flex-col justify-center gap-2">
                        <button onClick={moveAllToTarget} className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-110 active:scale-95 shadow-sm" title="Move all to right">
                            <CaretRight size={16} weight="bold" />
                        </button>
                        <button onClick={moveAllToSource} className="p-2 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:scale-110 active:scale-95 shadow-sm" title="Move all to left">
                            <CaretRight size={16} weight="bold" className="rotate-180" />
                        </button>
                    </div>

                    <DroppableContainer 
                        id="target-container"
                        title={targetTitle}
                        setTitle={setTargetTitle}
                        sets={targetSets}
                        onRename={(id, t) => handleRename(id, t, 'target')}
                    >
                        {/* Children handled inside DroppableContainer */}
                        {null}
                    </DroppableContainer>
                </div>
                <DragOverlay dropAnimation={dropAnimation} className="z-[9999]" style={{ pointerEvents: 'none' }}>
                    {activeItem ? (
                         <SortableSetItem 
                            id={activeItem.id} 
                            title={activeItem.title} 
                            questionsCount={activeItem.questions.length} 
                            isOverlay
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        )}

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium">
                Cancel
            </button>
            <button 
                onClick={handleMergeClick}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
                Merge & Save
            </button>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-700 transform scale-100 animate-in fade-in zoom-in duration-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-500">
                          <Warning size={32} weight="fill" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirm Deletion</h3>
                      <p className="text-gray-600 dark:text-slate-300 mb-6">
                          {confirmMessage} <br/>
                          <span className="text-sm mt-2 block opacity-80">This action cannot be undone.</span>
                      </p>
                      <div className="flex gap-3 w-full">
                          <button 
                              onClick={() => setConfirmModalOpen(false)}
                              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={() => {
                                  if (pendingMergeAction) pendingMergeAction();
                                  setConfirmModalOpen(false);
                              }}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm"
                          >
                              Confirm
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </BaseModal>
  );
}