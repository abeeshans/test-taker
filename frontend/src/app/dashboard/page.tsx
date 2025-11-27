"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MagnifyingGlass, FolderPlus, PlusCircle, ChartBar, Question, SignOut, House, CaretRight } from "@phosphor-icons/react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { motion, AnimatePresence } from "framer-motion";

import FolderCard from "@/components/FolderCard";
import TestCard from "@/components/TestCard";
import CreateFolderModal from "@/components/Modals/CreateFolderModal";
import RenameModal from "@/components/Modals/RenameModal";
import DeleteModal from "@/components/Modals/DeleteModal";
import ResetStatsModal from "@/components/Modals/ResetStatsModal";
import TimeInputModal from "@/components/Modals/TimeInputModal";
import HelpModal from "@/components/Modals/HelpModal";
import TestStatsModal from "@/components/Modals/TestStatsModal";
import ReviewTestModal from "@/components/Modals/ReviewTestModal";
import UploadResultsModal from "@/components/Modals/UploadResultsModal";
import AlertModal from "@/components/Modals/AlertModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { API_URL } from "@/lib/api";
import { Test, Folder } from "@/types";



// Droppable Breadcrumb Item
function BreadcrumbDroppable({ id, name, isCurrent, onClick }: { id: string | null; name: string | React.ReactNode; isCurrent: boolean; onClick: () => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `breadcrumb-${id ?? "root"}`,
    data: { type: "folder", id: id }, // Treat as folder drop target
    disabled: isCurrent, // Can't drop on current folder
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`flex items-center px-3 py-2 rounded transition-colors min-w-0 ${
        isOver && !isCurrent ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-300 dark:ring-blue-600" : "hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400"
      } ${isCurrent ? "font-bold text-gray-800 dark:text-white cursor-default" : "text-gray-700 dark:text-slate-300"}`}
    >
      {name}
    </button>
  );
}

export default function Dashboard() {
  const [tests, setTests] = useState<Test[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  // Modals state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: "test" | "folder"; name: string } | null>(null);
  const [testToStart, setTestToStart] = useState<Test | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);
  const [reviewTestId, setReviewTestId] = useState<string | null>(null);
  const [reviewTestTitle, setReviewTestTitle] = useState<string>("");
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [alertMessage, setAlertMessage] = useState<string>("");

  const handleCardClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCardId(id);
  }, []);

  // Calculate recursive folder stats
  const enrichedFolders = useMemo(() => {
    const folderMap = new Map(folders.map(f => [f.id, { ...f }]));
    const childrenMap = new Map<string, string[]>();
    const testsMap = new Map<string, string[]>();

    // Initialize maps
    folders.forEach(f => {
      childrenMap.set(f.id, []);
      testsMap.set(f.id, []);
    });

    // Build hierarchy
    folders.forEach(f => {
      if (f.parent_id && childrenMap.has(f.parent_id)) {
        childrenMap.get(f.parent_id)!.push(f.id);
      }
    });

    tests.forEach(t => {
      if (t.folder_id && testsMap.has(t.folder_id)) {
        testsMap.get(t.folder_id)!.push(t.id);
      }
    });

    // Recursive calculation
    const getStats = (folderId: string): { testCount: number; folderCount: number } => {
      const folder = folderMap.get(folderId);
      if (!folder) return { testCount: 0, folderCount: 0 };

      // Check if already calculated (optimization: assuming we process leaves first or memoize)
      // Since we don't have a guaranteed order, we'll just recalculate. 
      // For a small number of folders, this is fine. For larger, we'd want memoization.
      // Let's add simple memoization.
      if ((folder as any)._statsCalculated) {
        return { testCount: folder.test_count || 0, folderCount: folder.folder_count || 0 };
      }

      const childIds = childrenMap.get(folderId) || [];
      const testIds = testsMap.get(folderId) || [];

      let testCount = testIds.length;
      let folderCount = childIds.length;

      childIds.forEach(childId => {
        const childStats = getStats(childId);
        testCount += childStats.testCount;
        folderCount += childStats.folderCount;
      });

      folder.test_count = testCount;
      folder.folder_count = folderCount;
      (folder as any)._statsCalculated = true;

      return { testCount, folderCount };
    };

    // Calculate for all roots (and thus all nodes)
    // Actually, we need to ensure every node is calculated. 
    // Iterating all folders and calling getStats works because of the memoization check.
    folders.forEach(f => getStats(f.id));

    return Array.from(folderMap.values());
  }, [folders, tests]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedCardId(null);
  }, []);

  // Drag and Drop state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Global drop zone for when items are dragged from folder cards
  // Removed global-drop-zone in favor of main-grid and header-drop-zone coverage

  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const customCollisionDetection: CollisionDetection = (args) => {
    const activeMeta = (args.active?.data?.current as { folderId?: string | null; parentId?: string | null; fromPreview?: boolean } | undefined) ?? undefined;
    const fromPreview = Boolean(activeMeta?.fromPreview);
    const sourceFolderId = activeMeta?.folderId ?? activeMeta?.parentId ?? null;

    let collisions = pointerWithin(args);

    if (fromPreview && sourceFolderId) {
      // Allow interaction with source folder to enable dropping back into it
      // collisions = collisions.filter((c) => c.id.toString() !== `folder-${sourceFolderId}`);
    }

    // Inject main-grid when dragging preview item if not already present
    if (fromPreview && !collisions.some((c) => c.id === "main-grid")) {
      const mainGrid = args.droppableContainers.find((d) => d.id === "main-grid");
      if (mainGrid) {
        collisions.push({ id: "main-grid", data: mainGrid.data.current });
      }
    }

    if (collisions.length > 0) {
      const prioritized = collisions.filter((c) => c.id.toString().startsWith("folder-") || c.id.toString().startsWith("breadcrumb-"));
      if (prioritized.length > 0) {
        return prioritized;
      }
      return collisions;
    }

    // Fallback: rectangle intersections (e.g., fast pointer movement)
    let rects = rectIntersection(args);
    if (fromPreview && sourceFolderId) {
       // Allow interaction with source folder
       // rects = rects.filter((c) => c.id.toString() !== `folder-${sourceFolderId}`);
    }
    if (fromPreview && rects.length === 0) {
      return [{ id: "main-grid" }];
    }
    return rects;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    const activeId = active.id as string;
    const dragMeta = (active.data.current as { fromPreview?: boolean } | undefined) ?? undefined;
    const isDraggingFromFolderCard = Boolean(dragMeta?.fromPreview);

    // Determine target folder ID
    let targetFolderId: string | null = null;
    let overId = over?.id as string | undefined;

    // Fallback: If no drop target found but dragging from preview, assume main grid
    if (!over && isDraggingFromFolderCard) {
      overId = "main-grid";
    }

    if (!overId) return;

    // Check drop zone ID - SPECIAL HANDLING when dragging from folder cards
    if (overId === "main-grid" || overId === "header-drop-zone" || overId === "global-drop-zone") {
      // MAIN GRID DROP - always goes to current directory level
      targetFolderId = currentFolderId;
    } else if (overId.startsWith("folder-")) {
      const folderDropId = overId.replace("folder-", "");

      // SPECIAL CASE: If dragging from folder card to the same folder, treat as main grid drop
      if (isDraggingFromFolderCard) {
        // Get the source folder of the dragged item directly from data
        const activeData = active.data.current as { folderId?: string | null; parentId?: string | null } | undefined;
        // For tests, it's folderId. For folders, it's parentId.
        const sourceFolderId = activeData?.folderId ?? activeData?.parentId;

        // If dropping on the same folder it came from, treat as a valid drop (stay in folder)
        // unless explicitly dropped on the main grid (which is handled by overId === "main-grid")
        if (sourceFolderId === folderDropId) {
          // Do nothing (stay in folder)
          return;
        } else {
          targetFolderId = folderDropId;
        }
      } else {
        // Normal folder drop from main grid
        targetFolderId = folderDropId;
      }
    } else if (overId.startsWith("breadcrumb-")) {
      // BREADCRUMB DROP - goes to breadcrumb level
      const breadcrumbId = overId.replace("breadcrumb-", "");
      targetFolderId = breadcrumbId === "root" ? null : breadcrumbId;
    } else {
      return; // Unknown drop target
    }

    // Handle Folder Drag
    if (activeId.startsWith("folder-drag-")) {
      const draggedFolderId = activeId.replace("folder-drag-", "");

      // Prevent self-drop
      if (draggedFolderId === targetFolderId) {
        return;
      }

      // Find the dragged folder to check current location
      const draggedFolder = folders.find((f) => f.id === draggedFolderId);
      if (!draggedFolder) {
        return;
      }

      // Handle type conversions for comparison
      const folderParentId = draggedFolder.parent_id === null ? null : String(draggedFolder.parent_id);
      const targetId = targetFolderId === null ? null : String(targetFolderId);

      // IMPORTANT: Only prevent move if we're trying to move folder to the same parent
      // When dragging from folder cards, we usually want to move OUT of the folder
      if (folderParentId === targetId) {
        return;
      }

      // Prevent circular nesting
      let curr = folders.find((f) => f.id === targetFolderId);
      while (curr) {
        if (curr.id === draggedFolderId) {
          return; // Circular!
        }
        if (!curr.parent_id) break;
        const parentId = curr.parent_id;
        curr = folders.find((f) => f.id === parentId);
      }

      // Optimistic update
      setFolders(folders.map((f) => {
        if (f.id === draggedFolderId) {
          return { ...f, parent_id: targetFolderId };
        }
        // Update counts for source folder (if it exists)
        if (f.id === draggedFolder.parent_id) {
          return { ...f, folder_count: (f.folder_count || 0) - 1 };
        }
        // Update counts for target folder (if it exists)
        if (f.id === targetFolderId) {
          return { ...f, folder_count: (f.folder_count || 0) + 1 };
        }
        return f;
      }));

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const response = await fetch(`${API_URL}/folders/${draggedFolderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ parent_id: targetFolderId }),
        });

        if (response.ok) {
        } else {
          console.error("Folder move failed:", response.status, await response.text());
          // Revert optimistic update
          setFolders(folders.map((f) => {
             if (f.id === draggedFolderId) return { ...f, parent_id: draggedFolder.parent_id };
             if (f.id === draggedFolder.parent_id) return { ...f, folder_count: (f.folder_count || 0) + 1 };
             if (f.id === targetFolderId) return { ...f, folder_count: (f.folder_count || 0) - 1 };
             return f;
          }));
        }
      } catch (error) {
        console.error("Error moving folder:", error);
        // Revert optimistic update
        setFolders(folders.map((f) => {
             if (f.id === draggedFolderId) return { ...f, parent_id: draggedFolder.parent_id };
             if (f.id === draggedFolder.parent_id) return { ...f, folder_count: (f.folder_count || 0) + 1 };
             if (f.id === targetFolderId) return { ...f, folder_count: (f.folder_count || 0) - 1 };
             return f;
        }));
      }
      return;
    }

    // Handle Test Drag (Both from main grid and inside folder cards)
    let testId = activeId;
    if (testId.startsWith("folder-test-")) {
      testId = testId.replace("folder-test-", "");
    }

    const test = tests.find((t) => t.id === testId);

    if (!test) {
      return;
    }
    // If test already in target folder, do nothing (handle type conversions)
    const testFolderId = test.folder_id === null ? null : String(test.folder_id);
    const targetId = targetFolderId === null ? null : String(targetFolderId);

    if (testFolderId === targetId) {
      return;
    }

    // Optimistic update
    setTests(tests.map((t) => (t.id === testId ? { ...t, folder_id: targetFolderId } : t)));
    
    // Update folder counts
    setFolders(folders.map(f => {
        // Decrement from source folder
        if (f.id === test.folder_id) {
            return { ...f, test_count: Math.max(0, (f.test_count || 0) - 1) };
        }
        // Increment to target folder
        if (f.id === targetFolderId) {
            return { ...f, test_count: (f.test_count || 0) + 1 };
        }
        return f;
    }));

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const response = await fetch(`${API_URL}/tests/${testId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ folder_id: targetFolderId }),
      });

      if (response.ok) {
      } else {
        console.error("Test move failed:", response.status, await response.text());
        // Revert optimistic update
        setTests(tests.map((t) => (t.id === testId ? { ...t, folder_id: test.folder_id } : t)));
        setFolders(folders.map(f => {
            if (f.id === test.folder_id) return { ...f, test_count: (f.test_count || 0) + 1 };
            if (f.id === targetFolderId) return { ...f, test_count: Math.max(0, (f.test_count || 0) - 1) };
            return f;
        }));
      }
    } catch (error) {
      console.error("Error moving test:", error);
      // Revert optimistic update
      setTests(tests.map((t) => (t.id === testId ? { ...t, folder_id: test.folder_id } : t)));
      setFolders(folders.map(f => {
            if (f.id === test.folder_id) return { ...f, test_count: (f.test_count || 0) + 1 };
            if (f.id === targetFolderId) return { ...f, test_count: Math.max(0, (f.test_count || 0) - 1) };
            return f;
        }));
    }
  };

  // Drop zones
  const { setNodeRef: setHeaderRef, isOver: isOverHeader } = useDroppable({
    id: "header-drop-zone",
    data: { type: "container", id: "header" },
  });

  const { setNodeRef: setMainGridRef, isOver: isOverMainGrid } = useDroppable({
    id: "main-grid",
    data: { type: "container", id: "main" },
  });

  const { setNodeRef: setGlobalDropRef, isOver: isOverGlobal } = useDroppable({
    id: "global-drop-zone",
    data: { type: "container", id: "global" },
  });

  const handleCreateFolder = async (name: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/folders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name,
          parent_id: currentFolderId,
        }),
      });

      if (response.ok) {
        const newFolder = await response.json();
        setFolders([...folders, newFolder]);
        setActiveModal(null);
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async (newName: string) => {
    if (!selectedItem) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsSubmitting(true);
    const endpoint = selectedItem.type === "folder" ? "folders" : "tests";
    
    try {
      const response = await fetch(`${API_URL}/${endpoint}/${selectedItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(selectedItem.type === "folder" ? { name: newName } : { title: newName }),
      });

      if (response.ok) {
        if (selectedItem.type === "folder") {
          setFolders(folders.map(f => f.id === selectedItem.id ? { ...f, name: newName } : f));
        } else {
          setTests(tests.map(t => t.id === selectedItem.id ? { ...t, title: newName } : t));
        }
        setActiveModal(null);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Error renaming:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (moveContentsToParent?: boolean) => {
    if (!selectedItem) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setIsSubmitting(true);
    const endpoint = selectedItem.type === "folder" ? "folders" : "tests";

    try {
      const url = selectedItem.type === "folder" && moveContentsToParent
        ? `${API_URL}/${endpoint}/${selectedItem.id}?move_contents=true`
        : `${API_URL}/${endpoint}/${selectedItem.id}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        if (selectedItem.type === "folder") {
          setFolders(folders.filter(f => f.id !== selectedItem.id));
          // If moving contents to parent, refresh to show moved items
          if (moveContentsToParent) {
            fetchData();
          }
        } else {
          setTests(tests.filter(t => t.id !== selectedItem.id));
          setStatsRefreshTrigger(prev => prev + 1); // Trigger stats refresh
        }
        setActiveModal(null);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetStats = async () => {
    if (!selectedItem || selectedItem.type !== "test") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const response = await fetch(`${API_URL}/tests/${selectedItem.id}/reset_stats`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        // Refresh tests to get updated stats (0)
        // For now just locally update
        setTests(tests.map(t => t.id === selectedItem.id ? { ...t, attempt_count: 0, best_score: undefined, last_score: undefined, avg_score: undefined } : t));
        setStatsRefreshTrigger(prev => prev + 1); // Trigger stats refresh
        setActiveModal(null);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error("Error resetting stats:", error);
    }
  };

  const handleToggleStar = async (id: string, isStarred: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Optimistic update
    setTests(tests.map(t => t.id === id ? { ...t, is_starred: isStarred } : t));

    try {
      await fetch(`${API_URL}/tests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_starred: isStarred }),
      });
    } catch (error) {
      console.error("Error toggling star:", error);
      // Revert
      setTests(tests.map(t => t.id === id ? { ...t, is_starred: !isStarred } : t));
    }
  };

  const handleDownload = async (id: string, title: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const response = await fetch(`${API_URL}/tests/${id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const testData = await response.json();
        // Ensure we download the content, not the wrapper
        const content = testData.content;
        // Ensure ID is included in the downloaded file
        if (!content.id) {
            content.id = testData.id;
        }

        const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        setUploading(false);
        return;
    }

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append("files", file);
    });
    if (currentFolderId) {
        formData.append("folder_id", currentFolderId);
    }

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResults(result.results);
        setActiveModal("upload-results");
        fetchData();
        setStatsRefreshTrigger(prev => prev + 1); // Trigger stats refresh
      }
    } catch (error) {
      console.error("Error uploading:", error);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  };



  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        setLoading(false);
        return;
    }

    try {
      const [testsRes, foldersRes] = await Promise.all([
        fetch(`${API_URL}/tests`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch(`${API_URL}/folders`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      ]);

      if (!testsRes.ok) {
        console.error(`Tests fetch failed: ${testsRes.status} ${testsRes.statusText}`);
        try { console.error(await testsRes.text()); } catch (e) {}
      }
      if (!foldersRes.ok) {
        console.error(`Folders fetch failed: ${foldersRes.status} ${foldersRes.statusText}`);
        try { console.error(await foldersRes.text()); } catch (e) {}
      }

      if (testsRes.ok && foldersRes.ok) {
        const testsData = await testsRes.json();
        const foldersData = await foldersRes.json();
        setTests(testsData);
        setFolders(foldersData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      console.error("API_URL was:", API_URL);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Filtering & View ---

  const filteredItems = useMemo(() => {
    let filteredTests = tests;
    let filteredFolders = folders;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredTests = tests.filter((t) => t.title.toLowerCase().includes(q));
      filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(q));
    } else {
      // Folder filter
      filteredTests = tests.filter((t) => t.folder_id === currentFolderId);
      filteredFolders = folders.filter((f) => f.parent_id === currentFolderId);
    }

    // Sort Tests: Starred first, then Created At (newest first)
    filteredTests.sort((a, b) => {
      if (a.is_starred !== b.is_starred) {
        return a.is_starred ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Sort Folders: Name (A-Z)
    filteredFolders.sort((a, b) => a.name.localeCompare(b.name));

    return { tests: filteredTests, folders: filteredFolders };
  }, [tests, folders, currentFolderId, searchQuery]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs = [{ id: null, name: "Home" }];
    let curr = currentFolderId;
    const path = [];
    while (curr) {
      const f = folders.find((f) => f.id === curr);
      if (!f) break;
      path.unshift({ id: f.id, name: f.name });
      curr = f.parent_id;
    }
    return [...crumbs, ...path];
  }, [currentFolderId, folders]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={customCollisionDetection}>
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
        {/* Header */}
        <header
          ref={setHeaderRef}
          className={`bg-white dark:bg-slate-900/90 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between z-20 sticky top-0 ${
            activeDragId && isOverHeader ? "bg-blue-50 dark:bg-blue-900/20" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentFolderId(null)} className="p-0 bg-transparent border-0 flex items-center gap-2">
              <div className="relative w-9 h-9">
                <Image src="/icon.ico" fill alt="Logo" className="object-contain dark:hidden" />
                <Image src="/icon-dark.ico" fill alt="Logo" className="object-contain hidden dark:block" />
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white hidden lg:block">SelfTest</span>
            </button>
          </div>

          <div className="relative flex-grow max-w-2xl mx-2 md:mx-6 min-w-[120px]">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
            <input
              type="search"
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
            />
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0">
            <button
              onClick={() => setActiveModal("create-folder")}
              className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-medium py-2 px-3 md:px-4 rounded-xl flex items-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Create Folder"
            >
              <FolderPlus size={18} className="md:mr-1" /> <span className="hidden md:inline">Create Folder</span>
            </button>

            <label className="cursor-pointer text-sm bg-blue-600 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium py-2 px-3 md:px-4 rounded-xl flex items-center btn-primary transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow" title="Add Files">
              <PlusCircle size={18} className="md:mr-1" />
              <span className="hidden md:inline">{uploading ? "Uploading..." : "Add More Files"}</span>
              <input type="file" accept=".json,.pdf" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>

            <button
              onClick={() => setActiveModal("test-stats")}
              className="text-sm font-medium flex items-center py-2 px-3 md:px-4 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-all hover:scale-105 active:scale-95 shadow-sm hover:shadow cursor-pointer"
              title="Test Statistics"
            >
              <ChartBar size={18} className="md:mr-1" /> <span className="hidden md:inline">Statistics</span>
            </button>

            <button
              onClick={() => setActiveModal("help")}
              className="text-sm text-gray-600 hover:text-blue-800 dark:text-slate-400 dark:hover:text-blue-300 font-medium flex items-center p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
              title="Help"
            >
              <Question size={20} />
            </button>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-all hover:scale-110 active:scale-95 cursor-pointer"
              title="Sign Out"
            >
              <SignOut size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main
          ref={setMainGridRef}
          onClick={handleBackgroundClick}
          className={`flex-1 p-4 overflow-y-auto relative ${activeDragId && isOverMainGrid ? "bg-blue-100/40" : ""}`}
        >
          <div ref={setGlobalDropRef} className={`absolute inset-0 -z-10 ${activeDragId && isOverGlobal ? "bg-blue-50/30" : ""}`} />
          {/* Blue background overlay when dragging to main grid */}
          {activeDragId && isOverMainGrid && <div className="absolute inset-0 bg-blue-50/50 pointer-events-none z-0" />}
          {/* Breadcrumbs */}
          {!searchQuery && (
            <div className="flex items-center gap-1 mb-6 text-sm text-gray-600 dark:text-slate-300 breadcrumb bg-gray-50/90 dark:bg-slate-900/90 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 overflow-x-auto -mx-4 px-4 py-2 backdrop-blur-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id || "home"} className="flex items-center flex-shrink-0">
                  {index > 0 && <CaretRight size={14} className="mx-1 text-gray-400 dark:text-slate-400" />}
                  <BreadcrumbDroppable
                    id={crumb.id}
                    name={crumb.id === null ? <House size={18} /> : crumb.name}
                    isCurrent={index === breadcrumbs.length - 1}
                    onClick={() => setCurrentFolderId(crumb.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 h-full">
              <LoadingSpinner size={48} />
              <p className="mt-4 text-gray-500 font-medium">Loading your dashboard...</p>
            </div>
          ) : (
            <motion.div 
              layout 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-96 items-start content-start"
            >
              <AnimatePresence mode="popLayout">
                {/* Folders */}
                {filteredItems.folders.map((folder) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
                      key={folder.id}
                    >
                      <FolderCard
                        folder={folder}
                        folders={enrichedFolders.filter((f) => f.parent_id === folder.id)}
                        tests={tests.filter((t) => t.folder_id === folder.id)}
                        onToggle={() => setCurrentFolderId(folder.id)}
                        onRename={(id) => {
                          setSelectedItem({ id, type: "folder", name: folder.name });
                          setActiveModal("rename");
                        }}
                        onDelete={(id) => {
                          setSelectedItem({ id, type: "folder", name: folder.name });
                          setActiveModal("delete");
                        }}
                        isSelected={selectedCardId === folder.id}
                        onClick={(e) => handleCardClick(folder.id, e)}
                        onDoubleClick={() => setCurrentFolderId(folder.id)}
                      />
                    </motion.div>
                  ))}
                {filteredItems.tests.map((test) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.5 }}
                    key={test.id}
                  >
                    <TestCard
                      test={test}
                      onStart={() => {
                        if (test.question_count === 0) {
                          setAlertMessage("This test has no questions and needs to be updated.");
                          setActiveModal("alert");
                          return;
                        }
                        setTestToStart(test);
                        setActiveModal("time-input");
                      }}
                      onDelete={(id) => {
                        setSelectedItem({ id, type: "test", name: test.title });
                        setActiveModal("delete");
                      }}
                      onRename={(id) => {
                        setSelectedItem({ id, type: "test", name: test.title });
                        setActiveModal("rename");
                      }}
                      onReset={(id) => {
                        setSelectedItem({ id, type: "test", name: test.title });
                        setActiveModal("reset-stats");
                      }}
                      onToggleStar={handleToggleStar}
                      onReview={(id) => {
                        if (test && test.attempt_count > 0) {
                          setReviewTestId(id);
                          setReviewTestTitle(test.title);
                        }
                      }}
                      onDownload={handleDownload}
                      isSelected={selectedCardId === test.id}
                      onClick={(e) => handleCardClick(test.id, e)}
                      onDoubleClick={() => {
                        if (test.question_count === 0) {
                          setAlertMessage("This test has no questions and needs to be updated.");
                          setActiveModal("alert");
                          return;
                        }
                        setTestToStart(test);
                        setActiveModal("time-input");
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        {/* Modals */}
        <TestStatsModal
          isOpen={activeModal === "test-stats"}
          onClose={() => setActiveModal(null)}
          refreshTrigger={statsRefreshTrigger}
        />

        <HelpModal
          isOpen={activeModal === "help"}
          onClose={() => setActiveModal(null)}
        />

        <UploadResultsModal 
          isOpen={activeModal === "upload-results"} 
          onClose={() => {
            setActiveModal(null);
            setUploadResults([]);
          }} 
          results={uploadResults} 
        />
        <CreateFolderModal 
          isOpen={activeModal === "create-folder"} 
          onClose={() => setActiveModal(null)} 
          onConfirm={handleCreateFolder} 
          isSubmitting={isSubmitting}
        />

        <RenameModal 
          isOpen={activeModal === "rename"} 
          onClose={() => setActiveModal(null)} 
          onConfirm={handleRename} 
          currentName={selectedItem?.name || ""} 
          isSubmitting={isSubmitting}
        />

        <DeleteModal
          isOpen={activeModal === "delete"}
          onClose={() => setActiveModal(null)}
          onConfirm={handleDelete}
          itemName={selectedItem?.name || ""}
          isFolder={selectedItem?.type === "folder"}
          isSubmitting={isSubmitting}
        />

        <AlertModal
          isOpen={activeModal === "alert"}
          onClose={() => setActiveModal(null)}
          message={alertMessage}
        />

        <ResetStatsModal
          isOpen={activeModal === "reset-stats"}
          onClose={() => setActiveModal(null)}
          onConfirm={handleResetStats}
          testName={selectedItem?.name || ""}
        />

        <TimeInputModal
          isOpen={activeModal === "time-input"}
          onClose={() => setActiveModal(null)}
          test={testToStart}
          onConfirm={(minutes, setIndex) => {
            if (testToStart) {
              router.push(`/test/${testToStart.id}?minutes=${minutes}&set=${setIndex}`);
              setActiveModal(null);
            }
          }}
        />

        <ReviewTestModal
          isOpen={reviewTestId !== null}
          onClose={() => {
            setReviewTestId(null);
            setReviewTestTitle("");
          }}
          testId={reviewTestId || ""}
          testTitle={reviewTestTitle}
        />

        {/* Global drop zone overlay removed */}

        <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]} style={{ cursor: "grabbing", pointerEvents: "none" }}>
          {activeDragId ? (
            <div className="bg-white p-2 rounded-lg shadow-xl border-2 border-blue-500 opacity-95 max-w-xs truncate cursor-grabbing z-50 pointer-events-none">
              {(() => {
                const testId = activeDragId.startsWith("folder-test-") ? activeDragId.replace("folder-test-", "") : activeDragId;
                const test = tests.find((t) => t.id === testId);
                if (test)
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{test.title}</span>
                    </div>
                  );

                const folderId = activeDragId.startsWith("folder-drag-") ? activeDragId.replace("folder-drag-", "") : null;
                const folder = enrichedFolders.find((f) => f.id === folderId);
                if (folder)
                  return (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" className="text-blue-400">
                        <path d="M216,72H131.31L104,44.69A15.88,15.88,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.41,15.41,0,0,0,39.39,216h177.5A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l16,16H40Z"></path>
                      </svg>
                      <span className="text-sm font-medium text-gray-700">{folder.name}</span>
                    </div>
                  );

                return null;
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
