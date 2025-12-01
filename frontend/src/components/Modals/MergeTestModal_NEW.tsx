import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, defaultDropAnimationSideEffects, DropAnimation, useDroppable, pointerWithin, closestCorners, rectIntersection, CollisionDetection } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Test } from '@/types';
import BaseModal from './BaseModal';
import { ArrowsLeftRight, Trash, CaretRight, CaretDown, PencilSimple, Warning } from '@phosphor-icons/react';
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
