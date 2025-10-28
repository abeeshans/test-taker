// Global floating card menu (appended to document.body) to avoid stacking/context clipping
let _globalCardMenuEl = null;
let _globalCardMenuDismissHandler = null;

function hideGlobalCardMenu() {
  try {
    if (_globalCardMenuEl && _globalCardMenuEl.parentNode) _globalCardMenuEl.parentNode.removeChild(_globalCardMenuEl);
  } catch (e) {}
  _globalCardMenuEl = null;
  if (_globalCardMenuDismissHandler) {
    document.removeEventListener("pointerdown", _globalCardMenuDismissHandler, true);
    window.removeEventListener("resize", _globalCardMenuDismissHandler, true);
    _globalCardMenuDismissHandler = null;
  }
}

function showGlobalCardMenu(menuButton) {
  try {
    hideGlobalCardMenu();
    const card = menuButton.closest("[data-testid],[data-folder-id]");
    const testId = card ? card.dataset.testid || null : null;
    const folderId = card ? card.dataset.folderId || null : null;

    // Build menu items (mirror the existing per-card menu)
    const items = [
      { action: "rename", label: "Rename", icon: "ph ph-pencil" },
      { action: "reset", label: "Reset", icon: "ph ph-arrow-counter-clockwise" },
      { action: "delete", label: "Delete", icon: "ph ph-trash", danger: true },
    ];

    const menu = document.createElement("div");
    menu.className = "card-menu-dropdown global absolute bg-white border rounded shadow";
    menu.setAttribute("role", "menu");
    menu.style.minWidth = "140px";
    menu.style.maxWidth = "200px"; // cap width tighter so it stays compact
    menu.style.boxSizing = "border-box";
    menu.style.padding = "4px 0";
    menu.style.fontSize = "14px";
    menu.style.zIndex = "999999";

    items.forEach((it) => {
      const a = document.createElement("button");
      a.type = "button";
      a.className = "card-menu-item";
      a.style.display = "flex";
      a.style.alignItems = "center";
      a.style.gap = "8px";
      a.style.width = "100%"; // ensure each item fits the menu width
      a.style.justifyContent = "flex-start";
      a.style.padding = "8px 10px"; // comfortable touch/click area
      a.style.textAlign = "left";
      if (it.danger) a.style.color = "#b91c1c";
      // icon
      const icon = document.createElement("i");
      icon.className = it.icon;
      icon.setAttribute("aria-hidden", "true");
      a.appendChild(icon);
      const span = document.createElement("span");
      span.textContent = it.label;
      // ensure long labels truncate instead of forcing the menu wider
      span.style.flex = "1";
      span.style.overflow = "hidden";
      span.style.textOverflow = "ellipsis";
      span.style.whiteSpace = "nowrap";
      span.style.textAlign = "left";
      a.appendChild(span);
      a.addEventListener("click", (ev) => {
        ev.stopPropagation();
        hideGlobalCardMenu();
        // Resolve target id to pass to handler
        const targetId = testId || folderId || null;
        handleDashboardAction(it.action, targetId);
      });
      menu.appendChild(a);
    });

    document.body.appendChild(menu);
    _globalCardMenuEl = menu;

    // Position the menu: prefer right-aligned to the button
    const rect = menuButton.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    // compute left so menu's right aligns with button's right
    let left = rect.right - menuRect.width;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    if (left < 8) left = 8;
    // top below the button with small margin
    let top = rect.bottom + 8;
    if (top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 8;
    if (top < 8) top = 8;
    menu.style.left = Math.round(left) + "px";
    menu.style.top = Math.round(top) + "px";

    // Dismiss when clicking outside or resizing/scrolling
    _globalCardMenuDismissHandler = function (ev) {
      // If click is inside the menu or the button, keep it
      if (!menu.contains(ev.target) && !menuButton.contains(ev.target)) hideGlobalCardMenu();
    };
    document.addEventListener("pointerdown", _globalCardMenuDismissHandler, true);
    window.addEventListener("resize", _globalCardMenuDismissHandler, true);
  } catch (e) {
    console.warn("showGlobalCardMenu failed:", e);
    hideGlobalCardMenu();
  }
}

/* stylelint-disable */
/* eslint-disable */
// === STATE MANAGEMENT ===
let testMetadata = {}; // { id: { customName, isStarred, attempts: [] } }
let inMemoryTestContent = {}; // { id: content } - Not persisted to localStorage
let dashboardLayout = {
  folders: [], // { id, name }
  testsInFolders: {}, // { folderId: [testId1, testId2] }
  ungroupedTests: [], // [testId1, testId2]
};

let currentTest = {
  flatQuestions: [], // All questions in a flat array
  userAnswers: [], // Array of user answers
  wasEverFlagged: [], // Array of booleans to track if a question was ever flagged
  isFlagged: [], // Array of booleans
  strikethroughs: [], // Array of Set()
  totalTime: 0,
  timeLeft: 0,
  awayClicks: 0,
  currentQ: 0,
  timerInterval: null,
  isPaused: false,
  isReviewMode: false,
  testToStartId: null, // Temp holder for which test to start
};
// Which folder is currently being viewed in the dashboard (null => root view)
let currentFolderId = null;
// Currently selected card id in the dashboard. Format: "test:<testId>" or "folder:<folderId>"
let selectedCardId = null;
// Temporary holder for creating nested folders via the Create Folder modal
let folderCreateParentId = null;
// Pointer-tracking: last folder id seen under the pointer during drag operations.
// undefined => unknown/not-tracking yet, null => explicitly over root, string => folder id
let lastDragOverFolderId = undefined;
// Element currently outlined as the visual drop target
let _lastDropHighlightEl = null;
// Track which folder summaries are expanded (showing full list)
const expandedFolderSummaries = new Set();

function setDropHighlight(el) {
  try {
    if (_lastDropHighlightEl === el) return;
    clearDropHighlight();
    if (!el) return;
    el.classList.add("drop-target-highlight");
    _lastDropHighlightEl = el;
  } catch (e) {
    /* ignore */
  }
}

function clearDropHighlight() {
  try {
    if (_lastDropHighlightEl) {
      _lastDropHighlightEl.classList.remove("drop-target-highlight");
      _lastDropHighlightEl = null;
    }
  } catch (e) {
    /* ignore */
  }
}
const METADATA_STORAGE_KEY = "customTestAppMetadata";
const LAYOUT_STORAGE_KEY = "customTestDashboardLayout";
const EXPANDED_SUMMARIES_KEY = "expandedFolderSummaries";

// Ensure we only auto-load initial files once per session
let initialLoadDone = false;
// (Toasts removed)
// Keep the last load info for display in the Help modal
let lastLoadInfo = null; // { source, successFiles: [], errorFiles: [], timestamp }

// === DOM ELEMENTS ===
const app = document.getElementById("app");
const screens = {
  dashboard: document.getElementById("dashboard-screen"),
  test: document.getElementById("test-screen"),
  results: document.getElementById("results-screen"),
};
const modals = {
  nav: document.getElementById("nav-modal"),
  pause: document.getElementById("pause-overlay"),
  time: document.getElementById("time-modal"),
  alert: document.getElementById("alert-modal"),
  dashboardHelp: document.getElementById("dashboard-help-modal"),
  testStats: document.getElementById("test-stats-modal"),
  createFolder: document.getElementById("create-folder-modal"),
  rename: document.getElementById("rename-modal"),
  reset: document.getElementById("reset-modal"),
  delete: document.getElementById("delete-modal"),
  confirm: document.getElementById("confirm-modal"),
};

// Common test-screen elements (queried once for performance). These correspond to
// IDs defined in index.html. Declaring them here avoids runtime ReferenceErrors
// later in test flows (startTest, renderQuestion, timers, etc.). Using
// getElementById returns null if the element is missing; callers should guard
// where appropriate but most flows expect these to exist in a normal app run.
const testTitleHeaderEl = document.getElementById("test-title-header");
const progressBarEl = document.getElementById("progress-bar");
const timerEl = document.getElementById("timer");
const awayClicksCounterEl = document.getElementById("away-clicks-counter");
const awayClicksCounterContainerEl = document.getElementById("away-clicks-counter-container");
const reviewDashboardBtn = document.getElementById("review-dashboard-btn");
const finishBtnHeader = document.getElementById("finish-btn-header");
const pauseBtn = document.getElementById("pause-btn");
const pauseBtnText = document.getElementById("pause-btn-text");
const flagBtn = document.getElementById("flag-btn");
const questionCounterEl = document.getElementById("question-counter");
const passageContainerEl = document.getElementById("passage-container");
const questionNumberEl = document.getElementById("question-number");
const questionTextEl = document.getElementById("question-text");
const optionsContainerEl = document.getElementById("options-container");
const navGridEl = document.getElementById("nav-grid");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const resultsScoreEl = document.getElementById("results-score");
const resultsPercentageEl = document.getElementById("results-percentage");
const resultsAwayClicksEl = document.getElementById("results-away-clicks");

// Helper: persist/restore expanded folder summaries so Show more state survives reload
function saveExpandedFolderSummaries() {
  try {
    const arr = Array.from(expandedFolderSummaries.values());
    localStorage.setItem(EXPANDED_SUMMARIES_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("Failed to save expandedFolderSummaries:", e);
  }
}

function loadExpandedFolderSummaries() {
  try {
    const raw = localStorage.getItem(EXPANDED_SUMMARIES_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      arr.forEach((id) => {
        if (id) expandedFolderSummaries.add(id);
      });
    }
  } catch (e) {
    console.warn("Failed to load expandedFolderSummaries:", e);
  }
}

// Sanity check for important test UI elements to provide clearer warnings
function checkTestUiElements() {
  try {
    const required = [
      { el: testTitleHeaderEl, id: "test-title-header" },
      { el: progressBarEl, id: "progress-bar" },
      { el: timerEl, id: "timer" },
      { el: awayClicksCounterEl, id: "away-clicks-counter" },
      { el: passageContainerEl, id: "passage-container" },
      { el: questionNumberEl, id: "question-number" },
      { el: questionTextEl, id: "question-text" },
      { el: optionsContainerEl, id: "options-container" },
    ];
    const missing = required.filter((r) => !r.el).map((r) => r.id);
    if (missing.length > 0) {
      console.warn("Some test UI elements were not found in the DOM:", missing.join(", "), "— test flows may behave unexpectedly.");
    }
  } catch (e) {
    /* ignore */
  }
}

// Context for modals that act on a specific test
let modalActionContext = null; // { action: 'rename'|'reset'|'delete', testId }

// Transient callback for the generic confirm modal
let confirmModalCallback = null;

// Small helper to escape text for use in title attributes / HTML attributes
function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

async function init() {
  // Load persisted state
  loadMetadata();
  loadLayout();
  // Restore persisted expanded folder summaries
  loadExpandedFolderSummaries();

  // Remove any auto-created test folder from previous automated tests
  try {
    const AUTO_NAME = "__AUTO_FOLDER__";
    const autoFolders = (dashboardLayout.folders || []).filter((f) => f && f.name === AUTO_NAME).map((f) => f.id);
    if (autoFolders.length > 0) {
      autoFolders.forEach((fid) => {
        // move any tests inside to ungrouped
        const tests = dashboardLayout.testsInFolders[fid] || [];
        dashboardLayout.ungroupedTests.push(...tests);
        delete dashboardLayout.testsInFolders[fid];
      });
      // remove folders by name
      dashboardLayout.folders = (dashboardLayout.folders || []).filter((f) => !(f && f.name === AUTO_NAME));
      saveLayout();
      console.log("Removed auto folders:", autoFolders);
    }
  } catch (err) {
    console.warn("Error cleaning auto folder:", err);
  }

  // The old folder input is gone, but we can repurpose the button if needed.
  // For now, let's make the "Load from Folder" button also trigger a file input.
  const folderInput = document.createElement("input");
  folderInput.type = "file";
  folderInput.webkitdirectory = true;
  folderInput.directory = true;
  folderInput.multiple = true;
  folderInput.className = "hidden";
  folderInput.addEventListener("change", handleFolderSelect);
  document.body.appendChild(folderInput);
  const changeFolderBtn = document.getElementById("change-folder-btn");
  if (changeFolderBtn) changeFolderBtn.addEventListener("click", () => folderInput.click());
  const addFilesInput = document.getElementById("add-files-input");
  if (addFilesInput) addFilesInput.addEventListener("change", handleAddFiles);

  // Add optimized event listeners
  addEventListeners();

  // Sanity-check important test UI elements to avoid runtime ReferenceErrors
  checkTestUiElements();

  // Ensure create-folder button clicks are handled even if delegation fails
  // (some environments or DOM changes can prevent delegated listeners from firing)
  const __createFolderBtn = document.getElementById("create-folder-btn");
  if (__createFolderBtn) {
    __createFolderBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      createFolder();
    });
  }

  // Wire create-folder modal buttons
  const cancelCreateBtn = document.getElementById("cancel-create-folder-btn");
  const confirmCreateBtn = document.getElementById("confirm-create-folder-btn");
  const createInput = document.getElementById("create-folder-input");
  if (cancelCreateBtn)
    cancelCreateBtn.addEventListener("click", () => {
      if (createInput) createInput.value = "";
      // Clear any validation error when cancelling and remove error state class
      const err = document.getElementById("create-folder-error");
      if (err) err.remove();
      if (createInput) createInput.removeAttribute("aria-invalid");
      const modalEl = document.getElementById("create-folder-modal");
      if (modalEl) modalEl.classList.remove("has-create-error");
      // Clear temporary parent context
      folderCreateParentId = null;
      hideModal("createFolder");
    });
  if (confirmCreateBtn)
    confirmCreateBtn.addEventListener("click", () => {
      // call the confirmation handler
      const id = createFolderConfirm();
      // For programmatic clarity, log the created id
      console.log("createFolderConfirm createdId:", id);
    });
  // Allow Enter to submit the create-folder modal without relying on native alert()
  if (createInput) {
    createInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        const id = createFolderConfirm();
        console.log("createFolderConfirm (enter) createdId:", id);
      }
    });
  }

  // Wire rename/reset/delete modal buttons
  const renameCancel = document.getElementById("rename-cancel-btn");
  const renameConfirm = document.getElementById("rename-confirm-btn");
  const renameInput = document.getElementById("rename-input");
  if (renameCancel)
    renameCancel.addEventListener("click", () => {
      if (renameInput) renameInput.value = "";
      hideModal("rename");
      modalActionContext = null;
    });
  if (renameConfirm)
    renameConfirm.addEventListener("click", () => {
      const newName = renameInput ? renameInput.value : null;
      if (modalActionContext) {
        if (modalActionContext.action === "rename") {
          const id = modalActionContext.testId;
          if (newName && newName.trim() !== "") {
            testMetadata[id].customName = newName.trim();
            saveMetadata();
            renderDashboard();
            hideModal("rename");
            modalActionContext = null;
          } else {
            customAlert("Invalid Name", "Please enter a valid name.");
          }
        } else if (modalActionContext.action === "rename-folder") {
          const fid = modalActionContext.folderId;
          const folder = dashboardLayout.folders.find((f) => f.id === fid);
          if (folder) {
            if (newName && newName.trim() !== "") {
              folder.name = newName.trim();
              saveLayout();
              renderDashboard();
              hideModal("rename");
              modalActionContext = null;
            } else {
              customAlert("Invalid Name", "Please enter a valid folder name.");
            }
          } else {
            customAlert("Error", "Folder not found.");
            modalActionContext = null;
            hideModal("rename");
          }
        }
      }
    });

  const resetCancel = document.getElementById("reset-cancel-btn");
  const resetConfirm = document.getElementById("reset-confirm-btn");
  if (resetCancel)
    resetCancel.addEventListener("click", () => {
      hideModal("reset");
      modalActionContext = null;
    });
  if (resetConfirm)
    resetConfirm.addEventListener("click", () => {
      if (modalActionContext && modalActionContext.action === "reset") {
        const id = modalActionContext.testId;
        if (testMetadata[id]) {
          testMetadata[id].attempts = [];
          saveMetadata();
          renderDashboard();
        }
        hideModal("reset");
        modalActionContext = null;
      }
    });

  const deleteCancel = document.getElementById("delete-cancel-btn");
  const deleteConfirm = document.getElementById("delete-confirm-btn");
  if (deleteCancel)
    deleteCancel.addEventListener("click", () => {
      hideModal("delete");
      modalActionContext = null;
    });
  if (deleteConfirm)
    deleteConfirm.addEventListener("click", () => {
      if (modalActionContext && modalActionContext.action === "delete") {
        const id = modalActionContext.testId;
        // perform deletion similar to previous logic
        delete testMetadata[id];
        delete inMemoryTestContent[id];
        dashboardLayout.ungroupedTests = dashboardLayout.ungroupedTests.filter((tid) => tid !== id);
        for (const folderId in dashboardLayout.testsInFolders) {
          dashboardLayout.testsInFolders[folderId] = dashboardLayout.testsInFolders[folderId].filter((tid) => tid !== id);
        }
        saveMetadata();
        saveLayout();
        renderDashboard();
        hideModal("delete");
        modalActionContext = null;
      }
    });

  // Wire generic confirm modal buttons
  const confirmCancel = document.getElementById("confirm-modal-cancel");
  const confirmConfirm = document.getElementById("confirm-modal-confirm");
  if (confirmCancel)
    confirmCancel.addEventListener("click", () => {
      confirmModalCallback = null;
      hideModal("confirm");
    });
  if (confirmConfirm)
    confirmConfirm.addEventListener("click", () => {
      try {
        if (typeof confirmModalCallback === "function") {
          // call the registered callback
          confirmModalCallback();
        }
      } catch (e) {
        console.error("Error in confirm callback:", e);
      }
      confirmModalCallback = null;
      hideModal("confirm");
    });

  // Allow pressing Enter in the time modal to start the test
  const timeInputEl = document.getElementById("time-input-modal");
  if (timeInputEl) {
    timeInputEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        confirmStartTest();
      }
    });
  }

  // Attempt to auto-load local files
  const hasLocalFiles = await loadLocalFiles();

  // Always render the dashboard to show data from localStorage or newly loaded files.
  renderDashboard();
  showScreen("dashboard");
}

/**
 * Attempts to load test files listed in a local manifest.json.
 * Returns true if successful, false otherwise.
 */
async function loadLocalFiles() {
  // Only run the initial auto-load once per renderer session
  if (initialLoadDone) {
    console.log("loadLocalFiles: initial load already completed, skipping.");
    return Object.keys(inMemoryTestContent).length > 0;
  }
  initialLoadDone = true;

  // Use the secure API exposed by preload.js to ask the main process for the files
  try {
    const fileObjects = await window.electronAPI.loadInitialTests();
    if (fileObjects && fileObjects.length > 0) {
      const result = await processFiles(fileObjects);
      console.log(`Auto-loaded ${result.processedCount} test file(s) from json/; ${result.errorFiles.length} parse errors.`);
      // Save last load info for the Help modal
      lastLoadInfo = {
        source: "auto",
        successFiles: result.successFiles || [],
        errorFiles: result.errorFiles || [],
        timestamp: new Date().toISOString(),
      };
      // No toasts on auto-load; details are available in the Help modal via lastLoadInfo
      return true;
    }
    console.log("Auto-load found no initial test files in json/.");
    return false;
  } catch (error) {
    console.error("Error loading initial files via IPC:", error);
    return false;
  }
}

/**
 * Shows a custom, non-blocking alert modal.
 */
function customAlert(title, message) {
  document.getElementById("alert-title").textContent = title;
  document.getElementById("alert-message").innerHTML = message; // Use innerHTML for rich content
  showModal("alert");
}

/**
 * Show the generic confirm modal with a title, message and a callback to run when user confirms.
 * @param {string} title
 * @param {string} message
 * @param {Function} onConfirm
 */
function showConfirmModal(title, message, onConfirm) {
  try {
    const titleEl = document.getElementById("confirm-modal-title");
    const msgEl = document.getElementById("confirm-modal-message");
    if (titleEl) titleEl.textContent = title || "Please Confirm";
    if (msgEl) msgEl.textContent = message || "Are you sure?";
    confirmModalCallback = onConfirm;
    showModal("confirm");
  } catch (err) {
    console.warn("showConfirmModal failed:", err);
    // Fallback to window.confirm if something goes wrong
    try {
      if (window.confirm(message)) {
        if (typeof onConfirm === "function") onConfirm();
      }
    } catch (e) {
      /* ignore */
    }
  }
}

/**
 * Shows the help information modal.
 */
function showHelp() {
  const helpTitle = "Test Interface Guide";
  const helpMessage = `
                <ul class="text-left list-none space-y-3 prose-sm">
                    <li><i class="ph ph-arrows-left-right text-lg mr-2 text-blue-500"></i> Use <strong>Arrow Keys</strong> or on-screen buttons to navigate.</li>
                    <li><i class="ph ph-list-numbers text-lg mr-2 text-blue-500"></i> Press <strong>1-4</strong> to select an answer.</li>
                    <li><i class="ph ph-flag text-lg mr-2 text-blue-500"></i> Press <strong>F</strong> to flag a question for review.</li>
                    <li><i class="ph ph-pause text-lg mr-2 text-blue-500"></i> Press <strong>P</strong> to pause or resume the test.</li>
                    <li><i class="ph ph-strikethrough text-lg mr-2 text-blue-500"></i> Click the <strong>[S]</strong> button to strikethrough an option.</li>
                    <li><i class="ph ph-navigation-arrow text-lg mr-2 text-blue-500"></i> Use the <strong>Navigation</strong> button for a question overview.</li>
  `;
  customAlert(helpTitle, helpMessage.trim());
}

function populateDashboardHelp() {
  try {
    const container = document.getElementById("load-summary");
    if (!container) return;
    const ts = new Date(lastLoadInfo.timestamp).toLocaleString();
    const successCount = (lastLoadInfo.successFiles || []).length;
    const errorCount = (lastLoadInfo.errorFiles || []).length;

    // Small animated SVG for the header (subtle pulse) to add polish without external deps
    // Lottie animation removed — keep header compact without external animation.
    const lottieContainer = ``;

    // Render header in a single line: include lottie container to the left of the title
    let html = `
      <div class="load-summary-header">
        <div class="left"> ${lottieContainer}<span class="font-semibold">Last load (${ts})</span> <span class="text-sm text-gray-600 ml-3">Source: <span class="font-medium">${lastLoadInfo.source}</span></span> </div>
        <div class="right"> <div class="text-sm mr-3">Loaded: <span class="font-medium">${successCount}</span></div> <button id="load-summary-toggle" class="load-summary-toggle" aria-label="Minimize load summary"><i class="ph ph-caret-down"></i></button></div>
      </div>
      <div class="load-summary-body">
    `;

    if (successCount > 0) {
      html += `<div class="mb-2"><details><summary class="cursor-pointer">Loaded files (${successCount})</summary><ul class="list-disc ml-5 mt-2">`;
      lastLoadInfo.successFiles.forEach((f) => {
        html += `<li>${f}</li>`;
      });
      html += `</ul></details></div>`;
    }

    if (errorCount > 0) {
      html += `<div class="mb-2 text-red-700 font-semibold">Failed to parse: ${errorCount} file(s)</div>`;
      html += `<div><details class="bg-red-50 p-2 rounded"><summary class="cursor-pointer">Show parse errors</summary><ul class="list-disc ml-5 mt-2 text-red-700">`;
      lastLoadInfo.errorFiles.forEach((f) => {
        html += `<li>${f}</li>`;
      });
      html += `</ul></details></div>`;
    }

    html += `</div>`; // close body

    container.innerHTML = html;
    container.classList.remove("hidden");
    // Apply minimized state from localStorage
    const minimized = localStorage.getItem("loadSummaryMinimized") === "1";
    if (minimized) container.classList.add("minimized");
    attachLoadSummaryToggle();
    // (Lottie animation removed) no additional async assets loaded here.
  } catch (err) {
    console.warn("populateDashboardHelp failed:", err);
  }
}

/**
 * Populate the Test Statistics modal with a list of known tests and their stats.
 */
function populateTestStats() {
  try {
    const container = document.getElementById("test-stats-list");
    const calendarContainer = document.getElementById("test-stats-calendar");
    if (!container) return;
    // Read search & sort controls
    const searchInput = document.getElementById("test-stats-search");
    const sortSelect = document.getElementById("test-stats-sort");
    const search = searchInput
      ? String(searchInput.value || "")
          .trim()
          .toLowerCase()
      : "";
    const sortKey = sortSelect ? sortSelect.value : "name";

    const tests = Object.keys(testMetadata || {});

    // Build an array of stats objects to support sorting and filtering
    const rows = tests.map((tid) => {
      const meta = testMetadata[tid] || {};
      const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
      const attemptsCount = attempts.length;
      const avgPercent = attemptsCount > 0 ? attempts.reduce((s, a) => s + (a.percentage || 0), 0) / attemptsCount : null;
      const bestPercent = attemptsCount > 0 ? attempts.reduce((m, a) => Math.max(m, a.percentage || 0), 0) : null;
      const avgAway = attemptsCount > 0 ? Math.round((attempts.reduce((s, a) => s + (a.awayClicks || 0), 0) / attemptsCount) * 10) / 10 : null;
      // Support optional duration fields if present in attempts
      const avgTime = attemptsCount > 0 ? attempts.reduce((s, a) => s + (a.duration || a.timeTaken || 0), 0) / attemptsCount : null;
      // Determine last attempt timestamp (metadata-level field preferred)
      const lastAttemptTs = meta.lastAttemptDate || (attemptsCount > 0 ? attempts[attemptsCount - 1].timestamp : null) || null;
      return {
        id: tid,
        name: meta.customName || tid.replace(/\.json$/, ""),
        attemptsCount,
        avgPercent,
        bestPercent,
        avgAway,
        avgTime,
        lastAttemptTs,
      };
    });

    // Filter by search
    const filtered = rows.filter((r) => {
      if (!search) return true;
      return r.name.toLowerCase().includes(search) || r.id.toLowerCase().includes(search);
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortKey) {
        case "attempts":
          return (b.attemptsCount || 0) - (a.attemptsCount || 0);
        case "avgPercent":
          return (b.avgPercent || 0) - (a.avgPercent || 0);
        case "bestPercent":
          return (b.bestPercent || 0) - (a.bestPercent || 0);
        case "avgAway":
          return (b.avgAway || 0) - (a.avgAway || 0);
        case "avgTime":
          return (b.avgTime || 0) - (a.avgTime || 0);
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="p-4 text-sm text-gray-600">No tests found. Add some <strong>.json</strong> test files to see statistics.</div>`;
      // Wire simple handlers so live search updates work
      if (searchInput) searchInput.oninput = populateTestStats;
      if (sortSelect) sortSelect.onchange = populateTestStats;
      return;
    }

    let html = `<div class="p-1">`;
    html += `<table class="w-full text-left border-collapse"><thead><tr>`;
    html += `<th>Test</th>`;
    html += `<th class="stats-value">Last</th>`;
    html += `<th class="stats-value">Attempts</th>`;
    html += `<th class="stats-value">Avg %</th>`;
    html += `<th class="stats-value">Best %</th>`;
    html += `<th class="stats-value">Avg Time</th>`;
    html += `</tr></thead><tbody>`;

    // Render each test row with an optional per-set selector and a detail area
    filtered.forEach((r) => {
      const name = escapeHtml(r.name);
      const idEsc = escapeHtml(r.id);
      const attemptsCount = r.attemptsCount || 0;
      const avgPct = r.avgPercent == null ? "-" : Math.round(r.avgPercent * 10) / 10 + " %";
      const bestPct = r.bestPercent == null ? "-" : r.bestPercent + " %";
      const avgTime = r.avgTime == null || r.avgTime === 0 ? "-" : formatTime(Math.round(r.avgTime));
      const lastAttempt = r.lastAttemptTs ? new Date(r.lastAttemptTs).toLocaleDateString() : "-";

      // Detect sets for this test so we can render a selector
      const rawContent = inMemoryTestContent[r.id];
      let setsCount = 0;
      let setTitles = [];
      try {
        if (Array.isArray(rawContent)) {
          const isArrayOfArrays = rawContent.length > 0 && rawContent.every((it) => Array.isArray(it));
          const isArrayOfSetObjects = rawContent.length > 0 && rawContent.every((it) => it && Array.isArray(it.questions));
          if (isArrayOfArrays || isArrayOfSetObjects) {
            setsCount = rawContent.length;
            setTitles = rawContent.map((s, idx) => (s && s.title ? s.title : String.fromCharCode(65 + idx)));
          }
        } else if (rawContent && Array.isArray(rawContent.sets)) {
          setsCount = rawContent.sets.length;
          setTitles = rawContent.sets.map((s, idx) => (s && s.title ? s.title : String.fromCharCode(65 + idx)));
        }
      } catch (e) {
        setsCount = 0;
        setTitles = [];
      }

      const safeId = (r.id || "").replace(/[^a-z0-9-_:.]/gi, "_");

      // Build a collapsible row: main summary row + hidden per-set details row
      const toggleId = `test-stats-toggle-${safeId}`;
      const setsRowId = `test-stats-sets-${safeId}`;
      // Summary cell shows a caret to toggle sets (we always reserve space for alignment)
      // Use an inline SVG caret for crisper visuals and allow CSS animation on the SVG
      const caretSvg = `<svg class="test-stats-caret" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5l8 7-8 7V5z" fill="currentColor"/></svg>`;
      const caretHtml = `<button id="${toggleId}" class="test-stats-toggle" aria-expanded="false" ${setsCount > 1 ? "" : "disabled"}>${caretSvg}</button>`;
      html += `<tr class="test-stats-main-row"><td class="py-3"><div style="display:flex;align-items:center;gap:8px;">${caretHtml}<div><div class="font-medium text-gray-800">${name}</div><div class="text-xs text-gray-500">${idEsc}</div></div></div></td>`;
      html += `<td class="py-3 stats-value">${lastAttempt}</td>`;
      html += `<td class="py-3 stats-value">${attemptsCount}</td>`;
      html += `<td class="py-3 stats-value">${avgPct}</td>`;
      html += `<td class="py-3 stats-value">${bestPct}</td>`;
      html += `<td class="py-3 stats-value">${avgTime}</td>`;
      html += `</tr>`;
      // Insert one table row per set (hidden by default). Each set row mirrors the main columns
      if (setsCount > 0) {
        // compute per-set stats from existing attempts
        const metaForSets = testMetadata[r.id] || {};
        const allAttemptsForTest = Array.isArray(metaForSets.attempts) ? metaForSets.attempts : [];
        for (let i = 0; i < setsCount; i++) {
          const setLabel = escapeHtml(setTitles[i] || `Set ${i + 1}`);
          const setRowId = `test-stats-set-${safeId}-${i}`;
          const attemptsForSet = allAttemptsForTest.filter((a) => typeof a.setIndex !== "undefined" && a.setIndex === i);
          const countSet = attemptsForSet.length;
          const avgSet = countSet > 0 ? Math.round((attemptsForSet.reduce((s, a) => s + (a.percentage || 0), 0) / countSet) * 10) / 10 : null;
          const bestSet =
            countSet > 0
              ? Math.max(...attemptsForSet.map((a) => (typeof a.percentage === "number" ? a.percentage : -Infinity)).filter((n) => isFinite(n)))
              : null;
          const avgTimeSet = countSet > 0 ? Math.round(attemptsForSet.reduce((s, a) => s + (a.duration || a.timeTaken || 0), 0) / countSet) : null;
          const lastTs =
            countSet > 0
              ? attemptsForSet.reduce((m, a) => (a.timestamp && a.timestamp > m ? a.timestamp : m), attemptsForSet[0] ? attemptsForSet[0].timestamp : null)
              : null;
          const lastAttemptSet = lastTs ? new Date(lastTs).toLocaleDateString() : "-";
          const avgSetText = avgSet == null ? "-" : avgSet + "%";
          const bestSetText = bestSet == null ? "-" : bestSet + "%";
          const avgTimeSetText = avgTimeSet == null || avgTimeSet === 0 ? "-" : formatTime(avgTimeSet);
          html += `<tr id="${setRowId}" class="test-stats-set-row hidden" data-parent="${safeId}">`;
          // Indent set titles so they appear tabbed under the main test title. Remove bracket prefix per request.
          // Use a larger indent (72px) so sets are visibly tabbed under the main row which reserves 48px for caret.
          html += `<td class="py-2" style="padding-left:72px"><div class="text-sm text-gray-700">${setLabel}</div></td>`;
          html += `<td class="py-2 stats-value">${lastAttemptSet}</td>`;
          html += `<td class="py-2 stats-value">${countSet}</td>`;
          html += `<td class="py-2 stats-value">${escapeHtml(avgSetText)}</td>`;
          html += `<td class="py-2 stats-value">${escapeHtml(bestSetText)}</td>`;
          html += `<td class="py-2 stats-value">${escapeHtml(avgTimeSetText)}</td>`;
          html += `</tr>`;
        }
      }
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    // Wire live search/sort handlers (overwrite previous) so controls update the table
    if (searchInput) searchInput.oninput = populateTestStats;
    if (sortSelect) sortSelect.onchange = populateTestStats;

    // Attach handlers to toggle per-test set rows
    try {
      filtered.forEach((r) => {
        const safeId = (r.id || "").replace(/[^a-z0-9-_:.]/gi, "_");
        const toggleBtn = document.getElementById(`test-stats-toggle-${safeId}`);
        const setRows = Array.from(document.querySelectorAll(`#test-stats-list tr.test-stats-set-row[data-parent="${safeId}"]`));

        if (toggleBtn) {
          toggleBtn.addEventListener("click", () => {
            // Determine current state and flip. Keep the inline SVG intact
            // (do not replace button text/content) to avoid layout shifts
            // which caused misalignment of the title column.
            const currentlyExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
            const newState = !currentlyExpanded;
            setRows.forEach((row) => {
              row.classList.toggle("hidden", !newState);
            });
            toggleBtn.setAttribute("aria-expanded", String(newState));
            // Toggle a class used by CSS to rotate/scale the SVG caret
            toggleBtn.classList.toggle("expanded", newState);
          });
        }
      });
    } catch (e) {
      /* ignore per-test wiring errors */
    }

    // Also render the calendar view data if calendar container exists
    try {
      if (calendarContainer) {
        // Show/hide year controls depending on active tab (List vs Calendar).
        const yearControlsEl = document.getElementById("test-stats-year-controls");
        const calElForTab = document.getElementById("test-stats-calendar");
        if (yearControlsEl) {
          if (!calElForTab || calElForTab.classList.contains("hidden")) yearControlsEl.classList.add("hidden");
          else yearControlsEl.classList.remove("hidden");
        }
        // Build a map of date (YYYY-MM-DD) -> array of entries { testId, name, percentage }
        const dateMap = {};
        Object.keys(testMetadata || {}).forEach((tid) => {
          const meta = testMetadata[tid] || {};
          const attempts = Array.isArray(meta.attempts) ? meta.attempts : [];
          attempts.forEach((a) => {
            if (!a || !a.timestamp) return;
            const d = new Date(a.timestamp);
            if (isNaN(d.getTime())) return;
            const key = d.toISOString().slice(0, 10);
            if (!dateMap[key]) dateMap[key] = [];
            // Preserve set metadata if present on attempts (newer attempts will have this)
            const setIndex = typeof a.setIndex !== "undefined" && a.setIndex !== null ? a.setIndex : null;
            const setLabel = a.setLabel || (setIndex !== null ? String.fromCharCode(65 + Number(setIndex)) : null);
            dateMap[key].push({
              testId: tid,
              name: meta.customName || tid,
              percentage: a.percentage,
              time: a.duration || a.timeTaken || null,
              setIndex,
              setLabel,
            });
          });
        });

        // Determine selected year via new year label (or fall back to select if present)
        const now = new Date();
        const currentYear = now.getFullYear();
        let selectedYear = currentYear;
        const yearLabel = document.getElementById("test-stats-year-label");
        const yearSelect = document.getElementById("test-stats-year-select");
        if (yearLabel) {
          const ds = yearLabel.dataset && yearLabel.dataset.year ? parseInt(yearLabel.dataset.year, 10) : NaN;
          selectedYear = !isNaN(ds) ? ds : currentYear;
          // ensure the label shows a year
          yearLabel.textContent = String(selectedYear);
        } else if (yearSelect) {
          // Backwards-compat: populate a small range around the current year if empty
          if (yearSelect.options.length === 0) {
            for (let y = currentYear + 1; y >= currentYear - 3; y--) {
              const opt = document.createElement("option");
              opt.value = String(y);
              opt.textContent = String(y);
              if (y === currentYear) opt.selected = true;
              yearSelect.appendChild(opt);
            }
          }
          selectedYear = parseInt(yearSelect.value, 10) || currentYear;
          yearSelect.onchange = populateTestStats;
        }

        // Helper to format a day's tooltip content (HTML)
        function buildDayTooltipHtml(dateKey, entries) {
          let html = `<div class="cal-tooltip-date">${new Date(dateKey).toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}</div>`;
          if (!entries || entries.length === 0) {
            html += `<div class="cal-tooltip-empty text-sm text-gray-500">No tests completed</div>`;
            return html;
          }
          html += `<ul class="cal-tooltip-list">`;
          entries.forEach((e) => {
            const score = typeof e.percentage === "number" ? `${e.percentage}%` : "-";
            const setPart = e.setLabel ? ` <span class="cal-tooltip-set">[${escapeHtml(String(e.setLabel))}]</span>` : "";
            html += `<li class="cal-tooltip-item"><span class="cal-tooltip-name">${escapeHtml(
              e.name
            )}${setPart}</span><span class="cal-tooltip-score">${escapeHtml(score)}</span></li>`;
          });
          html += `</ul>`;
          return html;
        }

        // Build the calendar: 12 months in a responsive grid, each month shows week rows (Sun-Sat)
        const months = [];
        for (let m = 0; m < 12; m++) {
          const firstOfMonth = new Date(selectedYear, m, 1);
          const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
          const monthName = firstOfMonth.toLocaleString(undefined, { month: "short" });
          // Determine the weekday index (0=Sun..6=Sat) of the first day
          const startWeekday = firstOfMonth.getDay();
          // Build a 6x7 grid (6 weeks) to cover any month layout
          const cells = [];
          // Fill leading empty cells
          for (let i = 0; i < startWeekday; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(selectedYear, m, d));
          // Fill trailing empty cells to make length a multiple of 7
          while (cells.length % 7 !== 0) cells.push(null);
          months.push({ monthIndex: m, name: monthName, cells });
        }

        // Render HTML: compact month blocks showing only month title and a dot per day
        let calHtml = `<div class="stats-calendar-grid grid grid-cols-4 gap-3 p-2">`;
        months.forEach((month) => {
          calHtml += `<div class="month-block text-xs">
        <div class="font-medium mb-1 text-sm">${month.name} ${selectedYear}</div>
              <div class="calendar-month">
                <div class="weeks">`;
          // render rows of 7 but hide numbers/weekday headers — only dots are visible
          for (let r = 0; r < month.cells.length / 7; r++) {
            calHtml += `<div class="week-row">`;
            for (let c = 0; c < 7; c++) {
              const cell = month.cells[r * 7 + c];
              if (!cell) {
                // Empty padding cell: keep structure for alignment but render no dot (blank)
                calHtml += `<div class="day-cell empty" aria-hidden="true"></div>`;
                continue;
              }
              const key = cell.toISOString().slice(0, 10);
              const entries = dateMap[key] || [];
              const hasEntries = entries.length > 0;
              const dayNumber = cell.getDate();
              const dataEntries = encodeURIComponent(JSON.stringify(entries));
              // Keep an informative aria-label even though numbers are visually hidden
              const ariaLabel = hasEntries
                ? `${dayNumber} ${month.name} ${selectedYear}, ${entries.length} test(s)`
                : `${dayNumber} ${month.name} ${selectedYear}`;
              calHtml += `<div class="day-cell${
                hasEntries ? " has-entries" : " no-entries"
              }" tabindex="0" data-date="${key}" data-entries="${dataEntries}" aria-label="${escapeHtml(ariaLabel)}">`;
              // Render only the dot visually
              calHtml += `<div class="day-dot${hasEntries ? "" : " day-dot-empty"}" aria-hidden="true"></div>`;
              calHtml += `</div>`;
            }
            calHtml += `</div>`; // end week-row
          }
          calHtml += `</div></div></div>`;
        });
        calHtml += `</div>`;
        calendarContainer.innerHTML = calHtml;

        // Create or reuse a tooltip element for calendar day hover/focus
        let calTooltip = document.getElementById("cal-tooltip");
        if (!calTooltip) {
          calTooltip = document.createElement("div");
          calTooltip.id = "cal-tooltip";
          calTooltip.className = "cal-tooltip hidden";
          document.body.appendChild(calTooltip);
        }

        // Show/hide handlers using delegation
        let tooltipTimeout = null;
        function showCalTooltip(target) {
          if (!target) return;
          const dateKey = target.dataset.date;
          // If the day-cell has no data-date (empty padding cell or invalid), do not show tooltip
          if (!dateKey) return;
          const entriesRaw = target.dataset.entries || "";
          let entries = [];
          try {
            entries = entriesRaw ? JSON.parse(decodeURIComponent(entriesRaw)) : [];
          } catch (e) {
            entries = [];
          }
          calTooltip.innerHTML = buildDayTooltipHtml(dateKey, entries);
          calTooltip.style.opacity = "0";
          calTooltip.classList.remove("hidden");
          // position tooltip above the target if space, else below
          const rect = target.getBoundingClientRect();
          const ttRect = calTooltip.getBoundingClientRect();
          const margin = 8;
          let left = rect.left + rect.width / 2 - ttRect.width / 2;
          left = Math.max(8, Math.min(left, window.innerWidth - ttRect.width - 8));
          let top = rect.top - ttRect.height - margin;
          if (top < 8) top = rect.bottom + margin;
          calTooltip.style.left = Math.round(left) + "px";
          calTooltip.style.top = Math.round(top) + "px";
          requestAnimationFrame(() => {
            calTooltip.style.opacity = "1";
            calTooltip.style.transform = "translateY(0)";
          });
        }

        function hideCalTooltip() {
          if (!calTooltip) return;
          calTooltip.style.opacity = "0";
          calTooltip.style.transform = "translateY(6px)";
          // hide after transition
          if (tooltipTimeout) clearTimeout(tooltipTimeout);
          tooltipTimeout = setTimeout(() => calTooltip.classList.add("hidden"), 180);
        }

        calendarContainer.addEventListener("pointerover", (ev) => {
          const el = ev.target.closest && ev.target.closest(".day-cell");
          if (el) {
            if (tooltipTimeout) clearTimeout(tooltipTimeout);
            showCalTooltip(el);
          }
        });
        calendarContainer.addEventListener("pointerout", (ev) => {
          const el = ev.target.closest && ev.target.closest(".day-cell");
          if (el) {
            hideCalTooltip();
          }
        });
        // keyboard accessibility: show tooltip on focus
        calendarContainer.addEventListener("focusin", (ev) => {
          const el = ev.target.closest && ev.target.closest(".day-cell");
          if (el) showCalTooltip(el);
        });
        calendarContainer.addEventListener("focusout", (ev) => {
          const el = ev.target.closest && ev.target.closest(".day-cell");
          if (el) hideCalTooltip();
        });

        // Wire prev/next year buttons to update the year label (or select as fallback)
        try {
          const yearLabelEl = document.getElementById("test-stats-year-label");
          const yearSelectEl = document.getElementById("test-stats-year-select");
          const prevBtn = document.getElementById("test-stats-year-prev");
          const nextBtn = document.getElementById("test-stats-year-next");
          function setYear(y) {
            if (yearLabelEl) {
              yearLabelEl.dataset.year = String(y);
              yearLabelEl.textContent = String(y);
            } else if (yearSelectEl) {
              const s = String(y);
              const exists = Array.from(yearSelectEl.options).some((o) => o.value === s);
              if (!exists) {
                const opt = document.createElement("option");
                opt.value = s;
                opt.textContent = s;
                yearSelectEl.appendChild(opt);
              }
              yearSelectEl.value = s;
            }
            // trigger re-render
            populateTestStats();
          }
          if (prevBtn)
            prevBtn.onclick = () => {
              const cur = yearLabelEl
                ? parseInt(yearLabelEl.dataset.year, 10) || currentYear
                : yearSelectEl
                ? parseInt(yearSelectEl.value, 10) || currentYear
                : currentYear;
              setYear(cur - 1);
            };
          if (nextBtn)
            nextBtn.onclick = () => {
              const cur = yearLabelEl
                ? parseInt(yearLabelEl.dataset.year, 10) || currentYear
                : yearSelectEl
                ? parseInt(yearSelectEl.value, 10) || currentYear
                : currentYear;
              setYear(cur + 1);
            };
        } catch (e) {
          /* ignore prev/next wiring errors */
        }
      }
    } catch (e) {
      console.warn("Failed to render test stats calendar:", e);
    }
  } catch (e) {
    console.warn("populateTestStats failed:", e);
  }
}

/* Lottie animation support removed — no dynamic load here. */

/**
 * Attach click handler to the load summary toggle button (if present).
 */
function attachLoadSummaryToggle() {
  try {
    const btn = document.getElementById("load-summary-toggle");
    const container = document.getElementById("load-summary");
    if (!btn || !container) return;
    btn.removeEventListener("click", toggleLoadSummaryMinimized);
    btn.addEventListener("click", toggleLoadSummaryMinimized);
    // Use an icon-only button with a tooltip. Update icon based on state.
    const isMin = container.classList.contains("minimized");
    const iconHtml = isMin ? '<i class="ph ph-caret-up"></i>' : '<i class="ph ph-caret-down"></i>';
    btn.innerHTML = iconHtml;
    btn.title = isMin ? "Expand load summary" : "Minimize load summary";
    btn.setAttribute("aria-label", btn.title);
    // Ensure Phosphor icons render for the newly inserted icon
    try {
      embedPhosphorIcons();
    } catch (e) {
      /* ignore */
    }
  } catch (err) {
    console.warn("attachLoadSummaryToggle failed:", err);
  }
}

/**
 * Toggle the minimized state of the load summary and persist preference.
 */
function toggleLoadSummaryMinimized() {
  try {
    const container = document.getElementById("load-summary");
    const btn = document.getElementById("load-summary-toggle");
    if (!container || !btn) return;
    const isMin = container.classList.toggle("minimized");
    const iconHtml = isMin ? '<i class="ph ph-caret-up"></i>' : '<i class="ph ph-caret-down"></i>';
    btn.innerHTML = iconHtml;
    btn.title = isMin ? "Expand load summary" : "Minimize load summary";
    btn.setAttribute("aria-label", btn.title);
    // re-render icons
    try {
      embedPhosphorIcons();
    } catch (e) {
      /* ignore */
    }
    localStorage.setItem("loadSummaryMinimized", isMin ? "1" : "0");
  } catch (err) {
    console.warn("toggleLoadSummaryMinimized failed:", err);
  }
}

/**
 * Adds event listeners using event delegation for optimized performance.
 */
function addEventListeners() {
  screens.dashboard.addEventListener("click", (e) => {
    const target = e.target;

    // Apply a transient click feedback to cards and summary items.
    try {
      (function applyClickFeedback(t) {
        const card = t.closest(".test-card, .folder-card");
        if (card) {
          card.classList.add("card-clicked");
          setTimeout(() => card.classList.remove("card-clicked"), 180);
        }
        const summary = t.closest(".folder-summary-line");
        if (summary) {
          summary.classList.add("clicked");
          setTimeout(() => summary.classList.remove("clicked"), 180);
        }
      })(target);
    } catch (err) {
      /* ignore click feedback errors */
    }

    // Persistent selection: single click selects the card (but does not open folders)
    try {
      const selCard = target.closest("[data-select-id]");
      if (selCard) {
        const sid = selCard.dataset.selectId;
        setSelectedCard(sid);
      } else {
        // If clicking a folder summary line, select the underlying item
        const sum = target.closest(".folder-summary-line");
        if (sum) {
          if (sum.dataset.testid) setSelectedCard("test:" + sum.dataset.testid);
          else if (sum.dataset.folderId) setSelectedCard("folder:" + sum.dataset.folderId);
        } else {
          // Clicked somewhere else in the dashboard (not a selectable item).
          // If the click wasn't inside the breadcrumb/navigation line, clear selection.
          const inBreadcrumb = !!target.closest(".breadcrumb");
          if (!inBreadcrumb) setSelectedCard(null);
        }
      }
    } catch (e) {
      /* ignore */
    }

    // --- Buttons ---
    if (target.closest("#create-folder-btn")) {
      createFolder();
    } else if (target.closest("#add-files-btn")) {
      document.getElementById("add-files-input").click();
    } else if (target.closest("#dashboard-help-btn")) {
      // Populate load summary before opening the dashboard help modal
      populateDashboardHelp();
      showModal("dashboardHelp");
    }

    const dashboardAction = target.closest("[data-action]"); // This can be on a card or a folder
    if (dashboardAction) {
      // --- Dashboard Card Actions (Delegated) ---
      e.preventDefault(); // Stop any native button behavior
      const action = dashboardAction.dataset.action;
      // Resolve an id robustly: prefer an explicit data-testid on the element or an enclosing data-testid,
      // then fall back to data-folder-id (for folder wrappers) to support folder actions.
      let targetId = null;
      try {
        targetId =
          dashboardAction.dataset.testid ||
          (dashboardAction.closest("[data-testid]") && dashboardAction.closest("[data-testid]").dataset.testid) ||
          dashboardAction.dataset.folderId ||
          (dashboardAction.closest("[data-folder-id]") && dashboardAction.closest("[data-folder-id]").dataset.folderId) ||
          null;
      } catch (err) {
        targetId = null;
      }
      handleDashboardAction(action, targetId);
    } else if (target.closest(".card-menu-button")) {
      // --- Dropdown Menu Toggle ---
      const menuButton = target.closest(".card-menu-button");
      // Use the global body-appended dropdown so it isn't clipped by card stacking contexts
      try {
        showGlobalCardMenu(menuButton);
      } catch (e) {
        // Fallback to the per-card dropdown if something goes wrong
        const dropdown = menuButton.closest(".card-menu-container").querySelector(".card-menu-dropdown");
        document.querySelectorAll(".card-menu-dropdown").forEach((d) => {
          if (d !== dropdown) d.classList.add("hidden");
        });
        if (dropdown) dropdown.classList.toggle("hidden");
      }
    }
  });

  // Double-click handling for dashboard: start tests or open folders
  screens.dashboard.addEventListener("dblclick", (e) => {
    // Only active in dashboard view
    if (screens.dashboard.classList.contains("hidden")) return;
    const target = e.target;

    // Prefer summary-line wrapper which may be inside folder cards
    const summaryEl = target.closest(".folder-summary-line");
    if (summaryEl) {
      if (summaryEl.dataset.testid) {
        handleDashboardAction("start", summaryEl.dataset.testid);
        return;
      }
      if (summaryEl.dataset.folderId) {
        handleDashboardAction("open-folder", summaryEl.dataset.folderId);
        return;
      }
    }

    // Double-click a test card or any element annotated with data-testid => start
    const testEl = target.closest("[data-testid]");
    if (testEl && testEl.dataset.testid) {
      handleDashboardAction("start", testEl.dataset.testid);
      return;
    }

    // Double-click a folder card or breadcrumb link => open
    const folderEl = target.closest("[data-folder-id]");
    if (folderEl && folderEl.dataset.folderId !== undefined) {
      const fid = folderEl.dataset.folderId || null;
      if (fid) {
        handleDashboardAction("open-folder", fid);
      } else {
        // empty means root
        currentFolderId = null;
        renderDashboard();
      }
      return;
    }
  });

  // Main app listener for delegated clicks
  app.addEventListener("click", (e) => {
    const target = e.target;

    // --- Buttons ---
    // Close global dropdown if clicking outside of any card menu container or the global menu
    if (!target.closest(".card-menu-container")) {
      // Hide per-card dropdowns (legacy) and body-appended menu
      document.querySelectorAll(".card-menu-dropdown").forEach((d) => d.classList.add("hidden"));
      hideGlobalCardMenu();
    }

    if (target.closest("#review-btn")) {
      startReviewMode();
    } else if (target.closest("#dashboard-btn")) {
      showScreen("dashboard");
    } else if (target.closest("#dashboard-title-btn")) {
      // Clicking the dashboard title returns to root view
      currentFolderId = null;
      renderDashboard();
      showScreen("dashboard");
    } else if (target.closest("#test-stats-btn")) {
      // Populate and show Test Statistics modal
      populateTestStats();
      showModal("testStats");
    } else if (target.closest("#close-test-stats-btn")) {
      hideModal("testStats");
    } else if (target.closest("#test-stats-tab-list")) {
      // Switch to List tab
      const listBtn = document.getElementById("test-stats-tab-list");
      const calBtn = document.getElementById("test-stats-tab-calendar");
      const listEl = document.getElementById("test-stats-list");
      const calEl = document.getElementById("test-stats-calendar");
      if (listBtn) listBtn.setAttribute("aria-selected", "true");
      if (calBtn) calBtn.setAttribute("aria-selected", "false");
      if (listEl) listEl.classList.remove("hidden");
      if (calEl) calEl.classList.add("hidden");
      // Hide year controls when in List view and show main controls (search/sort)
      try {
        const yc = document.getElementById("test-stats-year-controls");
        if (yc) yc.classList.add("hidden");
      } catch (e) {}
      try {
        const ctrl = document.getElementById("test-stats-controls");
        if (ctrl) ctrl.classList.remove("hidden");
      } catch (e) {}
    } else if (target.closest("#test-stats-tab-calendar")) {
      // Switch to Calendar tab and ensure calendar is rendered
      const listBtn = document.getElementById("test-stats-tab-list");
      const calBtn = document.getElementById("test-stats-tab-calendar");
      const listEl = document.getElementById("test-stats-list");
      const calEl = document.getElementById("test-stats-calendar");
      if (listBtn) listBtn.setAttribute("aria-selected", "false");
      if (calBtn) calBtn.setAttribute("aria-selected", "true");
      if (listEl) listEl.classList.add("hidden");
      if (calEl) calEl.classList.remove("hidden");
      // Show year controls when Calendar tab is active and hide main controls (search/sort)
      try {
        const yc = document.getElementById("test-stats-year-controls");
        if (yc) yc.classList.remove("hidden");
      } catch (e) {}
      try {
        const ctrl = document.getElementById("test-stats-controls");
        if (ctrl) ctrl.classList.add("hidden");
      } catch (e) {}
      // Rebuild calendar view so hover titles reflect latest data
      populateTestStats();
    } else if (target.closest("#prev-btn")) {
      navigateQuestion(-1);
    } else if (target.closest("#close-dashboard-help-btn")) {
      hideModal("dashboardHelp");
    } else if (target.closest("#next-btn")) {
      navigateQuestion(1);
    } else if (target.closest("#nav-btn")) {
      renderNavModal();
      showModal("nav");
    } else if (target.closest("#close-nav-modal-btn")) {
      hideModal("nav");
    } else if (target.closest("#flag-btn")) {
      toggleFlag();
    } else if (target.closest("#pause-btn") || target.closest("#resume-overlay-btn")) {
      togglePause();
    } else if (target.closest("#cancel-time-btn")) {
      hideModal("time");
    } else if (target.closest("#start-test-confirm-btn")) {
      confirmStartTest();
    } else if (target.closest("#alert-ok-btn")) {
      hideModal("alert");
    } else if (target.closest("#help-btn")) {
      showHelp();
    } else if (target.closest("[data-folder-id]")) {
      // Only treat clicks on data-folder-id as navigation when the click
      // originates from breadcrumb links or the Back button. Folder cards
      // themselves should NOT open on single click (only on double-click).
      const el = target.closest("[data-folder-id]");
      const clickedInBreadcrumb = !!target.closest(".breadcrumb") || !!el.closest(".breadcrumb");
      const clickedLeaveBtn = !!target.closest("#leave-folder-btn") || el.id === "leave-folder-btn";
      if (clickedInBreadcrumb || clickedLeaveBtn) {
        const fid = el.dataset.folderId;
        currentFolderId = fid && fid !== "" ? fid : null;
        renderDashboard();
      } else {
        // Click was on a folder card or other non-navigation element; ignore single click
      }
    } else if (target.closest("#leave-folder-btn")) {
      // Back button: respect its data-folder-id to go only one level up
      const el = target.closest("#leave-folder-btn");
      const fid = el ? el.dataset.folderId : null;
      currentFolderId = fid && fid !== "" ? fid : null;
      renderDashboard();
    } else if (target.closest("#abandon-test-btn")) {
      showConfirmModal("Abandon Test", "Are you sure you want to abandon this test? Your progress will not be saved.", () => {
        stopTimer();
        hideModal("pause");
        showScreen("dashboard");
      });
    } else if (target.matches("#finish-btn-header") || target.closest("#finish-btn-header")) {
      showConfirmModal("Finish Test", "Are you sure you want to finish the test?", finishTest);
    } else if (target.closest("#review-dashboard-btn")) {
      showScreen("dashboard");
    }

    // --- Nav Modal Grid (Delegated) ---
    const navItem = target.closest("[data-nav-index]");
    if (navItem) {
      const index = parseInt(navItem.dataset.navIndex, 10);
      goToQuestion(index);
      hideModal("nav");
    }

    // --- Option Selection (Delegated) ---
    const optionLabel = target.closest(".option-label");
    if (optionLabel && !currentTest.isReviewMode) {
      const input = optionLabel.querySelector('input[type="radio"]');
      if (input) {
        currentTest.userAnswers[currentTest.currentQ] = parseInt(input.value, 10);
        input.checked = true;
        renderQuestion(); // Re-render to update UI, but only if needed
      }
    }

    // --- Strikethrough (Delegated) ---
    const strikeBtn = target.closest(".strike-btn");
    if (strikeBtn && !currentTest.isReviewMode) {
      const optionIndex = parseInt(strikeBtn.dataset.optionIndex, 10);
      toggleStrikethrough(optionIndex);
    }
  });

  // --- Other Listeners ---
  document.getElementById("search-bar").addEventListener("input", (e) => {
    // Re-render the dashboard with the search filter
    renderDashboard(e.target.value);
  });
  document.addEventListener("keydown", handleKeyDown);
  // Dashboard keyboard navigation (arrow keys and Enter to act on selected card)
  document.addEventListener("keydown", handleDashboardNavKey);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  // Delegate dragstart so summary inline handlers aren't the only source of drag events
  document.addEventListener("dragstart", (e) => {
    try {
      // Prefer summary-line wrapper (these have explicit data attributes)
      const summaryEl = e.target.closest(".folder-summary-line");
      if (summaryEl) {
        if (summaryEl.dataset.testid) {
          e.dataTransfer.setData("text/plain", summaryEl.dataset.testid);
          e.dataTransfer.setData("application/x-item-type", "test");
          e.dataTransfer.effectAllowed = "move";
          return;
        }
        if (summaryEl.dataset.folderId) {
          e.dataTransfer.setData("text/plain", summaryEl.dataset.folderId);
          e.dataTransfer.setData("application/x-item-type", "folder");
          e.dataTransfer.effectAllowed = "move";
          return;
        }
      }

      const el = e.target.closest("[data-testid],[data-folder-id]");
      if (!el) return;
      if (el.dataset.testid) {
        e.dataTransfer.setData("text/plain", el.dataset.testid);
        e.dataTransfer.setData("application/x-item-type", "test");
        e.dataTransfer.effectAllowed = "move";
      } else if (el.dataset.folderId) {
        e.dataTransfer.setData("text/plain", el.dataset.folderId);
        e.dataTransfer.setData("application/x-item-type", "folder");
        e.dataTransfer.effectAllowed = "move";
      }
    } catch (err) {
      /* ignore dragstart delegate errors */
    }
  });

  // Pointer-tracking: remember the last folder element under the pointer while dragging.
  // This is more robust for ambiguous drops onto the breadcrumb/back area.
  document.addEventListener("dragover", (e) => {
    try {
      // Prefer elementFromPoint as it's closest to the visual pointer position
      let hitElement = null;
      if (typeof e.clientX === "number" && typeof e.clientY === "number") {
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const closest = under && under.closest ? under.closest("[data-folder-id]") : null;
        // Only accept a closest element that is not the main grid container.
        if (closest && closest.id !== "test-list") {
          hitElement = closest;
          // Normalize empty string -> null (represents root)
          lastDragOverFolderId = typeof hitElement.dataset.folderId !== "undefined" ? hitElement.dataset.folderId || null : undefined;
        } else {
          // Don't fall back to the grid's dataset: leave lastDragOverFolderId undefined
          lastDragOverFolderId = undefined;
          hitElement = null;
        }
      } else {
        lastDragOverFolderId = undefined;
        hitElement = null;
      }
      // Update visual highlight to show the resolved element
      setDropHighlight(hitElement);
    } catch (err) {
      lastDragOverFolderId = undefined;
    }
  });

  // Clear the pointer-tracking state when a drag ends
  document.addEventListener("dragend", () => {
    lastDragOverFolderId = undefined;
    clearDropHighlight();
  });

  // --- Global tooltip manager for action buttons (prevents clipping by card decorations)
  // Use a single tooltip element appended to document.body and position it near the target.
  let _globalTooltipEl = null;
  let _globalTooltipTimeout = null;

  function createGlobalTooltip() {
    if (_globalTooltipEl) return _globalTooltipEl;
    const d = document.createElement("div");
    d.className = "global-action-tooltip";
    d.style.position = "fixed";
    d.style.pointerEvents = "none";
    d.style.padding = "6px 10px";
    d.style.background = "rgba(15,23,42,0.98)";
    d.style.color = "#fff";
    d.style.borderRadius = "6px";
    d.style.fontSize = "13px";
    d.style.lineHeight = "1.2";
    d.style.maxWidth = "260px";
    d.style.boxShadow = "0 10px 36px rgba(2,6,23,0.18)";
    d.style.zIndex = 999999;
    d.style.transition = "opacity 160ms ease, transform 160ms ease";
    d.style.opacity = "0";
    d.style.transform = "translateY(4px)";
    document.body.appendChild(d);
    _globalTooltipEl = d;
    return d;
  }

  function showGlobalTooltipFor(target) {
    try {
      if (!target) return;
      const text = target.getAttribute("data-tooltip");
      if (!text) return;
      const el = createGlobalTooltip();
      el.textContent = text;
      // measure then position
      el.style.opacity = "0";
      el.style.transform = "translateY(4px)";
      // small debounce so quick pointer moves don't flash tooltip
      if (_globalTooltipTimeout) clearTimeout(_globalTooltipTimeout);
      _globalTooltipTimeout = setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const margin = 8;
        // Ensure the tooltip is positioned offscreen first so we can measure its natural size
        el.style.left = "-9999px";
        el.style.top = "-9999px";
        el.style.opacity = "0";
        el.style.transform = "translateY(4px)";
        const tooltipRect = el.getBoundingClientRect();
        // Calculate horizontal center (clamped to viewport with 8px padding)
        const left = Math.min(Math.max(rect.left + rect.width / 2 - tooltipRect.width / 2, 8), Math.max(8, window.innerWidth - tooltipRect.width - 8));
        // Prefer placing above the target to match UX preference; fall back to below if not enough space
        let top = rect.top - tooltipRect.height - margin;
        if (top < 8) {
          top = rect.bottom + margin;
        }
        // Apply final position
        el.style.left = Math.round(left) + "px";
        el.style.top = Math.round(top) + "px";
        // show
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      }, 80);
    } catch (e) {
      /* ignore */
    }
  }

  function hideGlobalTooltip() {
    try {
      if (_globalTooltipTimeout) {
        clearTimeout(_globalTooltipTimeout);
        _globalTooltipTimeout = null;
      }
      if (!_globalTooltipEl) return;
      _globalTooltipEl.style.opacity = "0";
      _globalTooltipEl.style.transform = "translateY(4px)";
    } catch (e) {
      /* ignore */
    }
  }

  // Pointer delegation for showing/hiding the tooltip
  document.addEventListener("pointerover", (ev) => {
    try {
      const btn = ev.target.closest && ev.target.closest(".folder-open-hint, .folder-card-actions > button[data-tooltip]");
      if (btn) showGlobalTooltipFor(btn);
    } catch (e) {}
  });
  document.addEventListener("pointerout", (ev) => {
    try {
      const btn = ev.target.closest && ev.target.closest(".folder-open-hint, .folder-card-actions > button[data-tooltip]");
      if (btn) hideGlobalTooltip();
    } catch (e) {}
  });
  // Keyboard accessibility: show tooltip on focus and hide on blur
  document.addEventListener("focusin", (ev) => {
    try {
      const btn = ev.target.closest && ev.target.closest(".folder-open-hint, .folder-card-actions > button[data-tooltip]");
      if (btn) showGlobalTooltipFor(btn);
    } catch (e) {}
  });
  document.addEventListener("focusout", (ev) => {
    try {
      const btn = ev.target.closest && ev.target.closest(".folder-open-hint, .folder-card-actions > button[data-tooltip]");
      if (btn) hideGlobalTooltip();
    } catch (e) {}
  });

  // --- Test Stats filter popover wiring ---
  try {
    const filterToggle = document.getElementById("test-stats-filter-toggle");
    const filterPopover = document.getElementById("test-stats-filter-popover");
    const hiddenSort = document.getElementById("test-stats-sort");
    if (filterToggle && filterPopover && hiddenSort) {
      // Toggle popover visibility
      filterToggle.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const isOpen = !filterPopover.classList.contains("hidden");
        if (isOpen) {
          filterPopover.classList.add("hidden");
          filterToggle.setAttribute("aria-expanded", "false");
        } else {
          // reflect current selection from hidden select
          const cur = hiddenSort.value || (hiddenSort.options[0] && hiddenSort.options[0].value);
          filterPopover.querySelectorAll(".filter-option").forEach((o) => o.classList.remove("selected"));
          const matched = filterPopover.querySelector('.filter-option[data-value="' + cur + '"]');
          if (matched) matched.classList.add("selected");
          filterPopover.classList.remove("hidden");
          filterToggle.setAttribute("aria-expanded", "true");
        }
      });

      // Click on an option sets the hidden select and triggers populate
      Array.from(filterPopover.querySelectorAll(".filter-option")).forEach((opt) => {
        opt.addEventListener("click", (e) => {
          const v = opt.dataset && opt.dataset.value ? opt.dataset.value : null;
          if (!v) return;
          // Mark selected visually
          filterPopover.querySelectorAll(".filter-option").forEach((o) => o.classList.remove("selected"));
          opt.classList.add("selected");
          // Set hidden select and trigger change
          hiddenSort.value = v;
          try {
            hiddenSort.dispatchEvent(new Event("change", { bubbles: true }));
          } catch (e) {
            populateTestStats();
          }
          filterPopover.classList.add("hidden");
          filterToggle.setAttribute("aria-expanded", "false");
        });
      });

      // Close the popover when clicking outside
      document.addEventListener("click", (ev) => {
        try {
          if (!filterPopover.classList.contains("hidden")) {
            const isInside = ev.target.closest && (ev.target.closest("#test-stats-filter-popover") || ev.target.closest("#test-stats-filter-toggle"));
            if (!isInside) {
              filterPopover.classList.add("hidden");
              filterToggle.setAttribute("aria-expanded", "false");
            }
          }
        } catch (e) {}
      });
    }
  } catch (e) {
    /* ignore filter wiring errors */
  }
}
/**
 * Handles keyboard shortcuts for navigation during a test.
 */
function handleKeyDown(e) {
  // Only act if the test screen is visible and no modals are open
  if (screens.test.classList.contains("hidden") || !Object.values(modals).every((m) => m.classList.contains("hidden"))) {
    return;
  }

  // Avoid triggering when user is typing in an input field
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault(); // Prevent browser default action (like scrolling)
    navigateQuestion(-1);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    navigateQuestion(1);
  } else if (["1", "2", "3", "4"].includes(e.key)) {
    e.preventDefault();
    const optionIndex = parseInt(e.key, 10) - 1;
    selectOption(optionIndex);
  } else if (e.key.toLowerCase() === "f") {
    e.preventDefault();
    toggleFlag();
  } else if (e.key.toLowerCase() === "p") {
    e.preventDefault();
    togglePause();
  }
}

/**
 * Handle keyboard navigation inside the dashboard: arrow keys move selection; Enter activates.
 */
function handleDashboardNavKey(e) {
  try {
    if (screens.dashboard.classList.contains("hidden")) return;
    // Don't handle when modals are open or user is typing
    if (!Object.values(modals).every((m) => m.classList.contains("hidden"))) return;
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA" || (document.activeElement && document.activeElement.isContentEditable)) return;

    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"];
    if (!keys.includes(e.key)) return;

    // If focus is inside the breadcrumb/navigation line, let Left/Right move among crumbs
    const activeEl = document.activeElement;
    // If nothing important is focused (body/dashboard), allow arrow keys to jump into the breadcrumb
    const breadcrumbRoot = document.querySelector(".breadcrumb");
    if (breadcrumbRoot && (activeEl === document.body || activeEl === screens.dashboard || !activeEl)) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const linksRoot = Array.from(breadcrumbRoot.querySelectorAll("a[data-folder-id]"));
        if (linksRoot.length > 0) {
          const target = e.key === "ArrowLeft" ? linksRoot[linksRoot.length - 1] : linksRoot[0];
          try {
            target.focus();
          } catch (err) {}
          const fid = target.dataset.folderId || "";
          const selId = "folder:" + fid;
          if (document.querySelector('#test-list [data-select-id="' + selId + '"]')) {
            setSelectedCard(selId);
          }
          e.preventDefault();
          return;
        }
      }
    }
    const breadcrumbContainer = activeEl && activeEl.closest ? activeEl.closest(".breadcrumb") : null;
    if (breadcrumbContainer) {
      const links = Array.from(breadcrumbContainer.querySelectorAll("a[data-folder-id]"));
      if (links.length > 0) {
        const idx = links.indexOf(activeEl);
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          let next = idx;
          if (idx === -1) next = 0;
          else if (e.key === "ArrowLeft") next = Math.max(0, idx - 1);
          else if (e.key === "ArrowRight") next = Math.min(links.length - 1, idx + 1);
          const nextLink = links[next];
          if (nextLink) {
            try {
              nextLink.focus();
            } catch (err) {}
            // Also set selection to the folder if a corresponding selectable card exists
            const fid = nextLink.dataset.folderId || "";
            const selId = "folder:" + fid;
            if (document.querySelector('#test-list [data-select-id="' + selId + '"]')) {
              setSelectedCard(selId);
            }
          }
          e.preventDefault();
          return;
        }
        if (e.key === "Enter") {
          const fid = activeEl.dataset.folderId || "";
          currentFolderId = fid === "" ? null : fid;
          renderDashboard();
          e.preventDefault();
          return;
        }
        // Allow ArrowDown from breadcrumb to move focus back to selected card or first selectable
        if (e.key === "ArrowDown") {
          const selectables = Array.from(document.querySelectorAll("#test-list [data-select-id]"));
          if (selectables.length > 0) {
            // Prefer focusing the previously selected card if present
            const selIndex = selectables.findIndex((el) => el.dataset.selectId === selectedCardId);
            const target = selIndex >= 0 ? selectables[selIndex] : selectables[0];
            try {
              target.focus();
            } catch (err) {}
            // Also set selection visually
            if (target && target.dataset && target.dataset.selectId) setSelectedCard(target.dataset.selectId);
          }
          e.preventDefault();
          return;
        }
      }
    }

    // If a card is selected, allow ArrowUp to move focus into the breadcrumb/navigation line
    if (selectedCardId && e.key === "ArrowUp") {
      const breadcrumbRoot = document.querySelector(".breadcrumb");
      if (breadcrumbRoot) {
        const links = Array.from(breadcrumbRoot.querySelectorAll("a[data-folder-id]"));
        if (links.length > 0) {
          const target = links[links.length - 1];
          try {
            target.focus();
          } catch (err) {}
          // Clear card selection when moving up to the breadcrumb so the outline is not duplicated
          setSelectedCard(null);
          e.preventDefault();
          return;
        }
      }
    }

    const selectables = Array.from(document.querySelectorAll("#test-list [data-select-id]"));
    if (selectables.length === 0) return;

    const currentIndex = selectables.findIndex((el) => el.dataset.selectId === selectedCardId);
    let nextIndex = currentIndex;

    if (e.key === "Enter") {
      // Activate the selected card
      if (currentIndex >= 0) {
        const el = selectables[currentIndex];
        const sid = el.dataset.selectId;
        if (sid && sid.startsWith("test:")) {
          const testId = sid.substring(5);
          handleDashboardAction("start", testId);
        } else if (sid && sid.startsWith("folder:")) {
          const fid = sid.substring(7);
          // Open folder
          currentFolderId = fid || null;
          renderDashboard();
        }
      }
      e.preventDefault();
      return;
    }

    if (currentIndex === -1) {
      // No selection yet: pick first
      nextIndex = 0;
    } else {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") nextIndex = Math.min(selectables.length - 1, currentIndex + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
    }

    if (nextIndex !== currentIndex) {
      const sid = selectables[nextIndex].dataset.selectId;
      setSelectedCard(sid);
      // focus element for accessibility
      try {
        selectables[nextIndex].focus();
      } catch (e) {}
      e.preventDefault();
    }
  } catch (err) {
    /* ignore */
  }
}

/**
 * Set the selected card by its selectId (format 'test:<id>' or 'folder:<id>').
 */
function setSelectedCard(selectId) {
  try {
    // Clear previous selection if any
    const prev = document.querySelector('#test-list [data-select-id="' + (selectedCardId || "") + '"]');
    if (prev) {
      prev.classList.remove("card-selected");
      prev.setAttribute("tabindex", "-1");
      prev.removeAttribute("aria-selected");
    }

    // If selectId is falsy, clear selection and return
    if (!selectId) {
      selectedCardId = null;
      return;
    }

    // If already selected, no-op
    if (selectedCardId && selectedCardId === selectId) return;

    selectedCardId = selectId;
    const el = document.querySelector('#test-list [data-select-id="' + selectId + '"]');
    if (el) {
      el.classList.add("card-selected");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-selected", "true");
      try {
        el.focus();
      } catch (e) {}
    }
  } catch (e) {
    /* ignore */
  }
}

/**
 * Selects a specific option for the current question.
 */
function selectOption(optionIndex) {
  if (currentTest.isReviewMode || optionIndex >= currentTest.flatQuestions[currentTest.currentQ].options.length) return;
  currentTest.userAnswers[currentTest.currentQ] = optionIndex;
  renderQuestion();
}

/**
 * Handles the selection of a test folder.
 * Reads all files, filters for .json, and parses them.
 */
async function handleFolderSelect(e) {
  const files = e.target.files;
  if (files.length === 0) return;

  const filePromises = Array.from(files)
    .filter((file) => file.name.endsWith(".json"))
    .map(async (file) => ({
      name: file.name,
      content: await file.text(),
    }));

  const parsedFiles = await Promise.all(filePromises);
  const result = await processFiles(parsedFiles, true); // true to clear existing tests

  // Save last load info for the Help modal
  lastLoadInfo = {
    source: "folder",
    successFiles: result.successFiles || [],
    errorFiles: result.errorFiles || [],
    timestamp: new Date().toISOString(),
  };

  renderDashboard();
  document.getElementById("search-bar").value = ""; // Clear search on new folder load
  showScreen("dashboard");
  // No toasts on manual folder load; details are available in the Help modal via lastLoadInfo
}

/**
 * Handles adding more files without clearing existing ones.
 */
async function handleAddFiles(e) {
  const files = e.target.files;
  if (files.length === 0) return;

  const filePromises = Array.from(files)
    .filter((file) => file.name.endsWith(".json"))
    .map(async (file) => ({
      name: file.name,
      content: await file.text(),
    }));

  const parsedFiles = await Promise.all(filePromises);
  const result = await processFiles(parsedFiles, false); // false to append

  // Save last load info for the Help modal
  lastLoadInfo = {
    source: "add",
    successFiles: result.successFiles || [],
    errorFiles: result.errorFiles || [],
    timestamp: new Date().toISOString(),
  };

  // Re-render with the current search filter preserved
  renderDashboard();
  // No toasts on Add Files; details are available in the Help modal via lastLoadInfo
}

/**
 * Processes an array of file objects {name, content}.
 * @param {Array} files - Array of file objects.
 * @param {boolean} clearExisting - If true, clears allTests before processing.
 */
async function processFiles(files, clearExisting = false) {
  if (clearExisting) testMetadata = {};
  const errorFiles = [];
  let successCount = 0;

  const successFiles = [];
  const processingPromises = files.map(async (file) => {
    try {
      const testData = JSON.parse(file.content);
      const testId = file.name;
      if (!testMetadata[testId]) {
        testMetadata[testId] = { customName: testId.replace(".json", ""), isStarred: false, attempts: [] };
        // If it's a new test, add it to the ungrouped list
        if (!dashboardLayout.ungroupedTests.includes(testId)) {
          dashboardLayout.ungroupedTests.push(testId);
        }
      }
      // Store test content in a separate, non-persistent object
      inMemoryTestContent[testId] = testData;
      successCount++;
      successFiles.push(file.name);
    } catch (err) {
      console.warn(`Failed to process file ${file.name}:`, err.message);
      errorFiles.push(file.name);
    }
  });

  await Promise.all(processingPromises);
  saveMetadata();
  saveLayout();

  return { processedCount: successCount, errorFiles, successFiles };
}

/**
 * Handles all actions from the test dashboard (start, rename, star).
 */
function handleDashboardAction(action, testId) {
  switch (action) {
    case "start":
      currentTest.testToStartId = testId;
      try {
        prepareStartModal(testId);
      } catch (e) {
        /* ignore */
      }
      showModal("time");
      const timeInp = document.getElementById("time-input-modal");
      if (timeInp) timeInp.focus();
      break;
    case "rename":
      // Open rename modal
      modalActionContext = { action: "rename", testId };
      const renameInputEl = document.getElementById("rename-input");
      if (renameInputEl) {
        renameInputEl.value = testMetadata[testId] ? testMetadata[testId].customName : "";
      }
      showModal("rename");
      break;
    case "star":
      testMetadata[testId].isStarred = !testMetadata[testId].isStarred;
      saveMetadata();
      renderDashboard();
      break;
    case "reset":
      // Open reset confirmation modal
      modalActionContext = { action: "reset", testId };
      const resetMsg = document.getElementById("reset-modal-message");
      if (resetMsg) resetMsg.textContent = `Are you sure you want to reset all stats for "${testMetadata[testId].customName}"? This cannot be undone.`;
      showModal("reset");
      break;
    case "delete-folder":
      const folderId = testId; // In this case, testId is the folderId
      const folder = dashboardLayout.folders.find((f) => f.id === folderId);
      if (folder) {
        showConfirmModal("Delete Folder", `Are you sure you want to delete the folder "${folder.name}"? The tests inside will become ungrouped.`, () => {
          deleteFolder(folderId);
          saveLayout();
          renderDashboard();
        });
      }
      break;
    case "rename-folder":
      // Open rename modal for a folder
      modalActionContext = { action: "rename-folder", folderId: testId };
      const renameInputEl2 = document.getElementById("rename-input");
      const folderToRename = dashboardLayout.folders.find((f) => f.id === testId);
      if (renameInputEl2 && folderToRename) {
        renameInputEl2.value = folderToRename.name;
      }
      showModal("rename");
      break;
    case "open-folder":
      // testId here represents folder id
      if (dashboardLayout.folders.find((f) => f.id === testId)) {
        currentFolderId = testId;
        renderDashboard();
      }
      break;
    case "toggle-summary":
      // Toggle the Show more / Show less state for a folder summary
      try {
        const fid = testId || null;
        if (!fid) break;
        if (expandedFolderSummaries.has(fid)) expandedFolderSummaries.delete(fid);
        else expandedFolderSummaries.add(fid);
        // Persist the user's expanded/collapsed preference and re-render
        saveExpandedFolderSummaries();
        renderDashboard();
      } catch (e) {
        /* ignore */
      }
      break;
    case "delete":
      // Open delete confirmation modal
      modalActionContext = { action: "delete", testId };
      const deleteMsg = document.getElementById("delete-modal-message");
      if (deleteMsg)
        deleteMsg.textContent = `Are you sure you want to permanently delete "${testMetadata[testId].customName}"? This will remove the test and all its stats.`;
      showModal("delete");
      break;
  }
}

/**
 * Confirms the time and starts the test.
 */
function confirmStartTest() {
  const timeInput = document.getElementById("time-input-modal");
  const minutes = parseInt(timeInput.value, 10);

  if (isNaN(minutes) || minutes <= 0) {
    customAlert("Invalid Time", "Please enter a valid number of minutes.");
    return;
  }

  const testId = currentTest.testToStartId;
  if (testId) {
    // determine selected set index if provided in the modal
    let setIndex = 0;
    try {
      const sel = document.getElementById("time-modal-set-select");
      if (sel && sel.value) setIndex = parseInt(sel.value, 10) || 0;
    } catch (e) {
      setIndex = 0;
    }

    // startTest now returns true on success, false on failure
    if (startTest(testId, minutes * 60, setIndex)) {
      hideModal("time"); // Only hide if test started successfully
      timeInput.value = ""; // Clear input
      currentTest.testToStartId = null;
    }
  }
}

/**
 * Prepares the Start Test modal. If the selected test file contains multiple sets,
 * populate the set picker so the user can choose which set to run.
 */
function prepareStartModal(testId) {
  const wrapper = document.getElementById("time-modal-set-select-wrapper");
  const select = document.getElementById("time-modal-set-select");
  if (!wrapper || !select) return;

  // Clear previous options
  select.innerHTML = "";

  const raw = inMemoryTestContent[testId];
  if (!raw) {
    wrapper.classList.add("hidden");
    return;
  }

  // Determine shape and populate options accordingly
  try {
    if (Array.isArray(raw) && raw.length > 0 && raw.every((it) => Array.isArray(it) || (it && Array.isArray(it.questions)))) {
      // array of sets; each set may be either an array or an object with a `questions` array
      raw.forEach((set, idx) => {
        let cnt = 0;
        if (Array.isArray(set)) cnt = set.length;
        else if (set && Array.isArray(set.questions)) cnt = set.questions.length;
        const opt = document.createElement("option");
        opt.value = String(idx);
        const title = set && set.title ? set.title : `Set ${idx + 1}`;
        opt.textContent = `${title} — ${cnt} question${cnt === 1 ? "" : "s"}`;
        select.appendChild(opt);
      });
      wrapper.classList.remove("hidden");
      select.selectedIndex = 0;
      return;
    }
    if (raw && Array.isArray(raw.sets) && raw.sets.length > 0) {
      raw.sets.forEach((set, idx) => {
        let cnt = 0;
        if (Array.isArray(set)) cnt = set.length;
        else if (set && Array.isArray(set.questions)) cnt = set.questions.length;
        const opt = document.createElement("option");
        opt.value = String(idx);
        const title = set && set.title ? set.title : `Set ${idx + 1}`;
        opt.textContent = `${title} — ${cnt} question${cnt === 1 ? "" : "s"}`;
        select.appendChild(opt);
      });
      wrapper.classList.remove("hidden");
      select.selectedIndex = 0;
      return;
    }
  } catch (e) {
    console.warn("prepareStartModal failed to inspect test content:", e);
  }

  // Default: hide picker for single-set/plain tests
  wrapper.classList.add("hidden");
}

/**
 * Prepares and starts a test.
 * Returns true on success, false on failure.
 */
function startTest(testId, totalTimeInSeconds, setIndex = 0) {
  // Get the test content from our reliable in-memory object,
  // which is populated at startup. Normalize supported shapes so
  // the rest of the function can assume an array of question objects.
  const rawTestData = inMemoryTestContent[testId];

  if (!rawTestData) {
    customAlert("Test Error", `Could not find test data for ${testId}. The file might be empty or failed to load.`);
    return false;
  }

  // Normalize: support three shapes
  // 1) Plain array of question objects: [ {question,...}, ... ]
  // 2) Array of sets: [ [q,q..], [q,q..] ] -> pick first set
  // 3) Object with sets: { sets: [ [...], [...] ] } -> pick first set
  let questionsArray = null;
  // Track which set (if any) was chosen so we can record it with attempts
  let chosenSetIndex = null;
  let chosenSetLabel = null;
  try {
    if (Array.isArray(rawTestData)) {
      // Could be: plain array of questions, array-of-arrays, or array-of-set-objects
      const isArrayOfArrays = rawTestData.length > 0 && rawTestData.every((it) => Array.isArray(it));
      const isArrayOfSetObjects = rawTestData.length > 0 && rawTestData.every((it) => it && Array.isArray(it.questions));
      if (isArrayOfArrays) {
        // Use the selected set index (clamped)
        const idx = Math.max(0, Math.min(rawTestData.length - 1, Number(setIndex) || 0));
        questionsArray = rawTestData[idx];
        chosenSetIndex = idx;
        chosenSetLabel = String.fromCharCode(65 + idx);
      } else if (isArrayOfSetObjects) {
        const idx = Math.max(0, Math.min(rawTestData.length - 1, Number(setIndex) || 0));
        questionsArray = rawTestData[idx].questions;
        chosenSetIndex = idx;
        chosenSetLabel = rawTestData[idx] && rawTestData[idx].title ? rawTestData[idx].title : String.fromCharCode(65 + idx);
      } else {
        // Assume it's a plain array of question objects
        questionsArray = rawTestData;
      }
    } else if (rawTestData && Array.isArray(rawTestData.sets)) {
      const idx = Math.max(0, Math.min(rawTestData.sets.length - 1, Number(setIndex) || 0));
      const chosen = rawTestData.sets[idx];
      if (Array.isArray(chosen)) questionsArray = chosen;
      else if (chosen && Array.isArray(chosen.questions)) questionsArray = chosen.questions;
      else questionsArray = null;
      chosenSetIndex = idx;
      chosenSetLabel = chosen && chosen.title ? chosen.title : String.fromCharCode(65 + idx);
    }
  } catch (e) {
    questionsArray = null;
  }

  if (!Array.isArray(questionsArray)) {
    customAlert("Test Error", `Test file "${testId}" is not in a supported format. Expected an array of questions or an array/object containing sets.`);
    return false;
  }

  // Flatten the questions
  const flatQuestions = [];
  questionsArray.forEach((q, index) => {
    // Validate question structure from your JSON format
    if (q && q.question && Array.isArray(q.options) && q.correctAnswer != null) {
      // Find the 0-based index of the correct answer
      const correctOptLetter = q.correctAnswer.trim().split(".")[0]; // "B" from "B. 7"
      const answerIndex = correctOptLetter.charCodeAt(0) - "A".charCodeAt(0);

      // Find the option text without the "A. " prefix
      const correctOptionText = q.options.find((opt) => opt.startsWith(correctOptLetter + "."));

      // Re-map options to not have the "A. " prefix
      const cleanedOptions = q.options.map((opt) => opt.substring(opt.indexOf(" ") + 1));

      flatQuestions.push({
        question: q.question,
        options: cleanedOptions,
        answer: answerIndex, // Use the calculated index
        passage: q.passage,
        // Use the question's own index as the passage index to ensure it re-renders
        passageIndex: index,
        questionIndexInPassage: 0,
      });
    } else {
      console.warn(`Skipping malformed question in ${testId}. Question data:`, q);
    }
  });

  // Check if any questions were actually loaded
  if (flatQuestions.length === 0) {
    customAlert("Test Error", `Test file "${testId}" contains no valid questions. Please check the file format.`);
    return false; // Abort starting the test
  }

  currentTest = {
    flatQuestions, // This now correctly sets the flatQuestions
    userAnswers: new Array(flatQuestions.length).fill(null),
    isFlagged: new Array(flatQuestions.length).fill(false),
    wasEverFlagged: new Array(flatQuestions.length).fill(false),
    strikethroughs: new Array(flatQuestions.length).fill(null).map(() => new Set()),
    totalTime: totalTimeInSeconds,
    timeLeft: totalTimeInSeconds,
    awayClicks: 0,
    currentQ: 0,
    timerInterval: null,
    isPaused: false,
    isReviewMode: false,
    testId: testId, // Store which test is being taken
    setIndex: typeof chosenSetIndex !== "undefined" ? chosenSetIndex : null,
    setLabel: chosenSetLabel || null,
  };

  testTitleHeaderEl.textContent = testMetadata[testId].customName;
  awayClicksCounterEl.textContent = "0";
  awayClicksCounterContainerEl.classList.remove("hidden");

  goToQuestion(0);
  startTimer();
  showScreen("test");
  return true; // Success
}

/**
 * Starts the review mode after a test is complete.
 */
function startReviewMode() {
  currentTest.isReviewMode = true;
  currentTest.currentQ = 0;
  stopTimer();
  timerEl.textContent = "Review Mode";
  progressBarEl.style.width = "100%";
  progressBarEl.classList.add("bg-green-600");
  pauseBtn.classList.add("hidden");
  reviewDashboardBtn.classList.remove("hidden");
  finishBtnHeader.classList.add("hidden");
  awayClicksCounterContainerEl.classList.add("hidden");

  flagBtn.disabled = true;
  flagBtn.classList.add("opacity-50");

  goToQuestion(0);
  showScreen("test");
}

/**
 * Navigates to a specific question.
 */
function goToQuestion(index) {
  if (index < 0 || index >= currentTest.flatQuestions.length) return;
  currentTest.currentQ = index;
  renderQuestion();
  updateNavButtons();
  updateProgressBar();
}

/**
 * Moves to the next or previous question.
 */
function navigateQuestion(direction) {
  const newQ = currentTest.currentQ + direction;
  goToQuestion(newQ);
}

/**
 * Renders the current question, passage, and options.
 */
function renderQuestion() {
  const q = currentTest.flatQuestions[currentTest.currentQ];
  if (!q) return;

  // --- Update Passage ---
  // Only update passage if it's a new one
  const currentPassage = passageContainerEl.dataset.passageIndex;
  if (currentPassage !== q.passageIndex.toString()) {
    passageContainerEl.innerHTML = `<div class="prose prose-lg max-w-none">${formatText(q.passage)}</div>`;
    passageContainerEl.dataset.passageIndex = q.passageIndex;
    passageContainerEl.scrollTop = 0; // Scroll to top of new passage
  }

  // --- Update Question ---
  questionNumberEl.textContent = `Question ${currentTest.currentQ + 1}`;
  questionTextEl.innerHTML = formatText(q.question);

  // --- Update Options ---
  const strikes = currentTest.strikethroughs[currentTest.currentQ];
  let optionsHtml = "";
  q.options.forEach((option, index) => {
    const isChecked = currentTest.userAnswers[currentTest.currentQ] === index;
    const isStruck = strikes.has(index);
    const id = `q${currentTest.currentQ}-opt${index}`;

    let reviewLabel = "";
    if (currentTest.isReviewMode) {
      const isCorrect = q.answer === index;
      const isUserChoice = currentTest.userAnswers[currentTest.currentQ] === index;
      const isUnanswered = currentTest.userAnswers[currentTest.currentQ] === null;

      if (isCorrect) {
        reviewLabel = `<span class="review-label review-correct">✔ Correct Answer</span>`;
        if (isUnanswered) {
          reviewLabel = `<span class="review-label review-unanswered">• Unanswered</span>`;
        }
      } else if (isUserChoice) {
        reviewLabel = `<span class="review-label review-incorrect">✖ Your Answer</span>`;
      }
    }

    optionsHtml += `
          <label for="${id}" class="option-label flex items-start p-4 bg-white border border-gray-300 rounded-md cursor-pointer hover:border-blue-500 has-[:checked]:bg-blue-50 has-[:checked]:border-blue-600 ${
      isStruck ? "bg-gray-100" : ""
    }">
            <input type="radio" name="option" id="${id}" value="${index}" class="custom-radio mt-1" ${isChecked ? "checked" : ""} ${
      currentTest.isReviewMode ? "disabled" : ""
    }>
            <div class="flex-1">
              <span class="text-lg ${isStruck ? "strikethrough" : "text-gray-800"}">${formatText(option)}</span>
              ${reviewLabel}
            </div>
            ${
              !currentTest.isReviewMode
                ? `
              <button class="strike-btn text-gray-400 hover:text-red-600 ml-4 p-1" data-option-index="${index}" title="Strikethrough">
                [S]
              </button>
            `
                : ""
            }
          </label>
        `;
  });
  optionsContainerEl.innerHTML = optionsHtml;

  // --- Update Flag Button ---
  if (currentTest.isFlagged[currentTest.currentQ]) {
    flagBtn.classList.add("bg-yellow-300", "border-yellow-500");
    flagBtn.querySelector("span").textContent = "Flagged";
    flagBtn.querySelector("i").classList.replace("ph-flag", "ph-flag-fill");
  } else {
    flagBtn.classList.remove("bg-yellow-300", "border-yellow-500");
    flagBtn.querySelector("span").textContent = "Flag for Review";
    flagBtn.querySelector("i").classList.replace("ph-flag-fill", "ph-flag");
  }

  // --- Update Question Counter ---
  questionCounterEl.textContent = `${currentTest.currentQ + 1} / ${currentTest.flatQuestions.length}`;
}

/**
 * Renders the navigation modal grid.
 */
function renderNavModal() {
  const legendTest = document.getElementById("nav-legend-test");
  const legendReview = document.getElementById("nav-legend-review");

  if (currentTest.isReviewMode) {
    legendTest.classList.add("hidden");
    legendReview.classList.remove("hidden");
  } else {
    legendTest.classList.remove("hidden");
    legendReview.classList.add("hidden");
  }

  let gridHtml = "";
  for (let i = 0; i < currentTest.flatQuestions.length; i++) {
    let content;
    if (currentTest.isReviewMode) {
      const q = currentTest.flatQuestions[i];
      const userAnswer = currentTest.userAnswers[i];
      const wasFlagged = currentTest.wasEverFlagged[i];
      let icon = "";

      if (userAnswer === null) {
        icon = '<i class="ph-fill ph-minus-circle text-yellow-600 text-2xl"></i>';
      } else if (userAnswer === q.answer) {
        icon = '<i class="ph-fill ph-check-circle text-green-600 text-2xl"></i>';
      } else {
        icon = '<i class="ph-fill ph-x-circle text-red-600 text-2xl"></i>';
      }
      content = `<div class="relative">${icon}${wasFlagged ? '<i class="ph-fill ph-flag text-blue-600 text-xs absolute -top-1 -right-1"></i>' : ""}</div>`;
    } else {
      let stateClass = "bg-gray-300"; // Unanswered
      if (currentTest.userAnswers[i] !== null) stateClass = "bg-green-500"; // Answered
      if (currentTest.isFlagged[i]) stateClass = "bg-yellow-300"; // Flagged
      if (currentTest.currentQ === i) stateClass = "bg-blue-600 text-white"; // Current
      content = `<div class="h-10 w-10 flex items-center justify-center font-medium rounded-full ${stateClass} hover:opacity-80">${i + 1}</div>`;
    }

    gridHtml += `
          <button data-nav-index="${i}" class="flex items-center justify-center">
            ${content}
          </button>
        `;
  }
  navGridEl.innerHTML = gridHtml;
}
/**
 * Updates the enabled/disabled state of nav buttons.
 */
function updateNavButtons() {
  prevBtn.disabled = currentTest.currentQ === 0;
  if (currentTest.currentQ === currentTest.flatQuestions.length - 1) {
    nextBtn.innerHTML = 'Finish <i class="ph ph-check-circle text-lg ml-1"></i>';
    nextBtn.classList.replace("bg-blue-600", "bg-green-600");
    nextBtn.classList.replace("hover:bg-blue-700", "hover:bg-green-700");
  } else {
    nextBtn.innerHTML = 'Next <i class="ph ph-arrow-right text-lg ml-1"></i>';
    nextBtn.classList.replace("bg-green-600", "bg-blue-600");
    nextBtn.classList.replace("hover:bg-green-700", "hover:bg-blue-700");
    nextBtn.disabled = false;
  }

  // Finish button in review mode
  if (currentTest.isReviewMode && currentTest.currentQ === currentTest.flatQuestions.length - 1) {
    nextBtn.innerHTML = 'Back to Results <i class="ph ph-chart-bar text-lg ml-1"></i>';
    nextBtn.onclick = () => showScreen("results");
  } else if (currentTest.isReviewMode) {
    nextBtn.onclick = null; // Use default delegated listener
  } else {
    // Handle finish button in test mode
    if (currentTest.currentQ === currentTest.flatQuestions.length - 1) {
      nextBtn.onclick = finishTest; // Assign special click handler
    } else {
      nextBtn.onclick = null; // Clear handler, will use delegated listener
    }
  }
}

/**
 * Updates the top progress bar.
 */
function updateProgressBar() {
  const answeredCount = currentTest.userAnswers.filter((a) => a !== null).length;
  const percent = currentTest.flatQuestions.length > 0 ? (answeredCount / currentTest.flatQuestions.length) * 100 : 0;
  progressBarEl.style.width = `${percent}%`;
}

/**
 * Toggles the "flag" state for the current question.
 */
function toggleFlag() {
  if (currentTest.isReviewMode) return;
  currentTest.isFlagged[currentTest.currentQ] = !currentTest.isFlagged[currentTest.currentQ];
  if (currentTest.isFlagged[currentTest.currentQ]) currentTest.wasEverFlagged[currentTest.currentQ] = true;
  renderQuestion();
}

/**
 * Toggles the strikethrough state for a given option.
 */
function toggleStrikethrough(optionIndex) {
  const strikes = currentTest.strikethroughs[currentTest.currentQ];
  if (strikes.has(optionIndex)) {
    strikes.delete(optionIndex);
  } else {
    strikes.add(optionIndex);
  }
  renderQuestion(); // Re-render to show strike
}

/**
 * Pauses or resumes the test.
 */
function togglePause() {
  if (currentTest.isReviewMode) return;

  // Only toggle the paused state and show/hide the overlay. Do NOT change
  // the visual state of the header pause button (#pause-btn) here — the
  // header control should remain visually consistent with the test view.
  currentTest.isPaused = !currentTest.isPaused;
  if (currentTest.isPaused) {
    stopTimer();
    // Show the pause overlay; do not mutate header button text/classes/icon
    showModal("pause");
  } else {
    startTimer();
    // Hide the pause overlay; keep header button visuals unchanged
    hideModal("pause");
  }
}

/**
 * Starts the countdown timer.
 */
function startTimer() {
  if (currentTest.timerInterval) clearInterval(currentTest.timerInterval);
  currentTest.timerInterval = setInterval(() => {
    if (currentTest.isPaused) return;

    currentTest.timeLeft--;
    timerEl.textContent = formatTime(currentTest.timeLeft);

    if (currentTest.timeLeft <= 0) {
      finishTest();
    }
  }, 1000);
}

/**
 * Stops the countdown timer.
 */
function stopTimer() {
  clearInterval(currentTest.timerInterval);
  currentTest.timerInterval = null;
}

/**
 * Finishes the test, calculates score, and shows results.
 */
function finishTest() {
  stopTimer();
  let score = 0;
  currentTest.flatQuestions.forEach((q, index) => {
    if (q.answer === currentTest.userAnswers[index]) {
      score++;
    }
  });

  const total = currentTest.flatQuestions.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // Save the attempt
  const attempt = {
    score: score,
    total: total,
    percentage: percentage,
    awayClicks: currentTest.awayClicks,
    // Record elapsed time for this attempt (seconds). Prefer explicit duration if available.
    duration: Math.max(0, (currentTest.totalTime || 0) - (currentTest.timeLeft || 0)),
    timestamp: new Date().toISOString(),
  };

  // Ensure metadata for this test exists before trying to push
  if (!testMetadata[currentTest.testId]) {
    testMetadata[currentTest.testId] = {
      customName: currentTest.testId.replace(".json", ""),
      isStarred: false,
      attempts: [],
    };
  }
  if (!testMetadata[currentTest.testId].attempts) {
    testMetadata[currentTest.testId].attempts = [];
  }

  // Include set information if this attempt was taken from a specific set
  try {
    if (typeof currentTest.setIndex !== "undefined" && currentTest.setIndex !== null) {
      attempt.setIndex = currentTest.setIndex;
      attempt.setLabel = currentTest.setLabel || (Number.isFinite(currentTest.setIndex) ? String.fromCharCode(65 + Number(currentTest.setIndex)) : null);
    }
  } catch (e) {
    /* ignore */
  }

  testMetadata[currentTest.testId].attempts.push(attempt);
  // Update a convenient lastAttemptDate field on the test metadata for quick access
  try {
    testMetadata[currentTest.testId].lastAttemptDate = attempt.timestamp;
  } catch (e) {
    /* ignore */
  }
  saveMetadata();

  // Display results
  resultsScoreEl.textContent = `${score} / ${total}`;
  resultsPercentageEl.textContent = `${percentage}%`;
  resultsAwayClicksEl.textContent = currentTest.awayClicks;

  // Update dashboard
  renderDashboard();
  showScreen("results");

  // Reset test-specific UI
  progressBarEl.style.width = "0%";
  progressBarEl.classList.remove("bg-green-600");
  pauseBtn.classList.remove("hidden");
  finishBtnHeader.classList.remove("hidden");
  reviewDashboardBtn.classList.add("hidden");
  flagBtn.disabled = false;
  flagBtn.classList.remove("opacity-50");
  nextBtn.onclick = null; // clear special finish handler
}

/**
 * Handles browser window losing focus.
 */
function handleVisibilityChange() {
  if (document.visibilityState === "hidden" && !currentTest.isPaused && currentTest.timerInterval) {
    currentTest.awayClicks++;
    awayClicksCounterEl.textContent = currentTest.awayClicks;
  }
}

// === DASHBOARD & METADATA ===

/**
 * Loads metadata from localStorage.
 */
function loadMetadata() {
  const stored = localStorage.getItem(METADATA_STORAGE_KEY);
  if (stored) {
    testMetadata = JSON.parse(stored);
  }
}

/**
 * Loads dashboard layout from localStorage.
 */
function loadLayout() {
  const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (stored) {
    const parsedLayout = JSON.parse(stored);
    // Ensure all properties exist to avoid errors with older saved data
    dashboardLayout = {
      folders: parsedLayout.folders || [],
      testsInFolders: parsedLayout.testsInFolders || {},
      ungroupedTests: parsedLayout.ungroupedTests || [],
    };
  }
}

/**
 * Saves dashboard layout to localStorage.
 */
function saveLayout() {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(dashboardLayout));
  } catch (error) {
    console.error("Failed to save layout to localStorage:", error);
  }
}
/**
 * Saves metadata to localStorage.
 */
function saveMetadata() {
  try {
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(testMetadata));
  } catch (error) {
    console.error("Failed to save metadata to localStorage:", error);
  }
}

/**
 * Compute simple statistics for a folder: totalAttempts, avgPercentage and testsWithAttempts
 */
function computeFolderStats(folderId) {
  const testIds = dashboardLayout.testsInFolders[folderId] || [];
  let totalAttempts = 0;
  let sumPercentages = 0;
  let testsWithAttempts = 0;

  testIds.forEach((tid) => {
    const meta = testMetadata[tid];
    if (!meta || !meta.attempts || meta.attempts.length === 0) return;
    testsWithAttempts++;
    meta.attempts.forEach((att) => {
      totalAttempts++;
      sumPercentages += att.percentage || 0;
    });
  });

  const avgPercentage = totalAttempts > 0 ? Math.round(sumPercentages / totalAttempts) : NaN;
  return { totalAttempts, avgPercentage, testsWithAttempts };
}

/**
 * Renders the dashboard with test cards.
 */
function renderDashboard(filter = "") {
  const testListEl = document.getElementById("test-list");
  if (!testListEl) return;

  testListEl.innerHTML = ""; // Clear the list
  // Make the main grid accept drops so users can drop items into the current view (root or folder)
  try {
    testListEl.ondragover = allowDrop;
    testListEl.ondrop = drop;
    // Expose the current folder id on the grid as a data attribute ('' => root)
    testListEl.dataset.folderId = currentFolderId || "";
  } catch (e) {
    /* ignore */
  }
  const lowerCaseFilter = filter.trim().toLowerCase();

  // If viewing inside a folder, render a small header with Back button and breadcrumb
  let assembledHtml = "";
  if (currentFolderId) {
    // Build breadcrumb path from root -> current
    const pathParts = [];
    let walkId = currentFolderId;
    while (walkId) {
      const f = dashboardLayout.folders.find((ff) => ff.id === walkId);
      if (!f) break;
      pathParts.unshift({ id: f.id, name: f.name });
      walkId = f.parentId || null;
    }

    // Build clickable breadcrumb HTML (ensure it spans the full grid row)
    // Make breadcrumb links and the Back button drop targets so users can drag items to move them to a folder/root
    const currentFolderObj = dashboardLayout.folders.find((ff) => ff.id === currentFolderId) || {};
    const parentFolderId = currentFolderObj.parentId || "";
    let bcHtml = `<div class="folder-view-header col-span-full mb-4 flex items-center justify-between" ondragover="allowDrop(event)" ondrop="drop(event)" data-folder-id="${parentFolderId}"><div class="left flex items-center">`;
    bcHtml += `<button id="leave-folder-btn" data-folder-id="${parentFolderId}" ondragover="allowDrop(event)" ondrop="drop(event)" class="mr-3 px-3 py-1 bg-gray-100 border rounded">← Back</button>`;
    bcHtml += `<nav class="breadcrumb text-sm text-gray-600"><a href="#" data-folder-id="" ondragover="allowDrop(event)" ondrop="drop(event)" class="mr-2">Root</a>`;
    pathParts.forEach((p) => {
      bcHtml += `<span class="mx-1">/</span> <a href="#" data-folder-id="${p.id}" ondragover="allowDrop(event)" ondrop="drop(event)" class="ml-2 text-blue-600">${p.name}</a>`;
    });
    bcHtml += `</nav></div><div class="right text-sm text-gray-500">Folder: <strong>${pathParts[pathParts.length - 1].name}</strong></div></div>`;

    assembledHtml += bcHtml;
  }

  // Get a list of all test IDs that match the filter
  const allVisibleTestIds = Object.keys(testMetadata).filter((id) => {
    if (lowerCaseFilter === "") return true;
    return testMetadata[id].customName.toLowerCase().includes(lowerCaseFilter);
  });

  let dashboardHtml = "";
  // Determine if there are any tests to show at all, before filtering
  const totalTests = Object.keys(testMetadata).length;
  // If we're viewing a folder, compute tests in that folder first
  let folderContext = null;
  if (currentFolderId) {
    const folder = dashboardLayout.folders.find((f) => f.id === currentFolderId);
    folderContext = {
      id: currentFolderId,
      name: folder ? folder.name : "",
      testIds: dashboardLayout.testsInFolders[currentFolderId] || [],
    };
  }
  if (totalTests === 0) {
    dashboardHtml = `<p class="text-gray-500 col-span-full text-center">No tests loaded. Click "Load from Folder" or "Add More Files" to begin.</p>`;
  } else if (allVisibleTestIds.length === 0 && lowerCaseFilter !== "") {
    dashboardHtml = `<p class="text-gray-500 col-span-full text-center">No tests match your search for "${filter}".</p>`;
  }

  const renderTestCard = (testId) => {
    const meta = testMetadata[testId];
    if (!meta) return "";
    const attempts = meta.attempts || [];
    let avgScore = 0;
    if (attempts.length > 0) {
      const totalPercentage = attempts.reduce((sum, att) => sum + (att.percentage || 0), 0);
      avgScore = Math.round(totalPercentage / attempts.length);
    }

    // Determine number(s) of questions from the in-memory test content (non-persistent)
    // Support several shapes:
    // - Plain array of question objects: [ {q}, {q}, ... ]
    // - Array of arrays (sets): [ [q,q], [q,q] ]
    // - Array of set objects: [ { title, questions: [q,q] }, ... ]
    // - Object with sets: { sets: [ [...], {title,questions:[...]} ] }
    const testContent = inMemoryTestContent[testId];
    let questionCount = null; // exact count when fixed
    let questionRangeText = ""; // human-friendly text like "5–12 questions" or "10 questions"
    try {
      if (Array.isArray(testContent)) {
        // detect array-of-arrays
        const isArrayOfArrays = testContent.length > 0 && testContent.every((it) => Array.isArray(it));
        // detect array-of-set-objects (each element has a .questions array)
        const isArrayOfSetObjects = testContent.length > 0 && testContent.every((it) => it && Array.isArray(it.questions));

        if (isArrayOfArrays) {
          const counts = testContent.map((s) => (Array.isArray(s) ? s.length : 0)).filter((n) => n > 0);
          if (counts.length > 0) {
            const min = Math.min(...counts);
            const max = Math.max(...counts);
            questionRangeText = min === max ? `${min} question${min === 1 ? "" : "s"}` : `${min}–${max} questions`;
          }
        } else if (isArrayOfSetObjects) {
          const counts = testContent.map((s) => (s && Array.isArray(s.questions) ? s.questions.length : 0)).filter((n) => n > 0);
          if (counts.length > 0) {
            const min = Math.min(...counts);
            const max = Math.max(...counts);
            questionRangeText = min === max ? `${min} question${min === 1 ? "" : "s"}` : `${min}–${max} questions`;
          }
        } else {
          // Plain array of questions
          questionCount = testContent.length;
          questionRangeText = `${questionCount} question${questionCount === 1 ? "" : "s"}`;
        }
      } else if (testContent && Array.isArray(testContent.sets)) {
        const counts = testContent.sets
          .map((s) => {
            if (Array.isArray(s)) return s.length;
            if (s && Array.isArray(s.questions)) return s.questions.length;
            return 0;
          })
          .filter((n) => n > 0);
        if (counts.length > 0) {
          const min = Math.min(...counts);
          const max = Math.max(...counts);
          questionRangeText = min === max ? `${min} question${min === 1 ? "" : "s"}` : `${min}–${max} questions`;
        }
      }
    } catch (e) {
      questionRangeText = "";
    }

    // Determine how many sets this test contains (if any).
    // This mirrors the shapes handled above: array-of-arrays, array-of-set-objects, or object.with sets
    let setsCount = 0;
    try {
      if (Array.isArray(testContent)) {
        const isArrayOfArrays = testContent.length > 0 && testContent.every((it) => Array.isArray(it));
        const isArrayOfSetObjects = testContent.length > 0 && testContent.every((it) => it && Array.isArray(it.questions));
        if (isArrayOfArrays || isArrayOfSetObjects) setsCount = testContent.length;
      } else if (testContent && Array.isArray(testContent.sets)) {
        setsCount = testContent.sets.length;
      }
    } catch (e) {
      setsCount = 0;
    }

    // Compute best and last scores for richer card summary
    let bestScore = "N/A";
    let lastScore = "N/A";
    if (attempts.length > 0) {
      const percentages = attempts.map((a) => (typeof a.percentage === "number" ? a.percentage : NaN)).filter((p) => !isNaN(p));
      if (percentages.length > 0) {
        bestScore = Math.max(...percentages) + "%";
        lastScore = percentages[percentages.length - 1] + "%";
      }
    }

    // Build a nicer star button (SVG) based on starred state
    const starSvg = meta.isStarred
      ? `<svg class="star-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#f59e0b" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>`
      : `<svg class="star-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="#d1d5db" stroke-width="1.6" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>`;

    return `
      <div class="test-card bg-white rounded-lg shadow p-4" data-select-id="test:${testId}" data-testid="${testId}" tabindex="0" draggable="true" ondragstart="drag(event)">
        <div class="card-content">
          <h4 class="text-lg font-semibold text-gray-800">${meta.customName}</h4>
          <div class="text-sm text-gray-500 mt-1">
            ${attempts.length} attempt(s) • Avg ${attempts.length > 0 ? avgScore + "%" : "N/A"}
          </div>
          ${
            questionRangeText
              ? `<div class="text-sm text-gray-500 mt-1">${escapeHtml(questionRangeText)}${setsCount > 1 ? ` • ${setsCount} sets` : ""}</div>`
              : ""
          }
          <div class="text-sm text-gray-500 mt-2">
            Best: <span class="font-medium text-gray-800">${bestScore}</span>
            <span class="mx-2">•</span>
            Last: <span class="font-medium text-gray-800">${lastScore}</span>
          </div>
        </div>
        <div class="card-actions">
          <div class="left-actions">
            <button class="start-large" data-action="start" data-testid="${testId}">Start</button>
          </div>
          <div class="right-actions">
            <button class="star-btn" data-action="star" data-testid="${testId}" aria-label="Toggle star">${starSvg}</button>
            <div class="card-menu-container relative">
              <button class="card-menu-button px-2 py-1" aria-label="Open menu">⋮</button>
              <div class="card-menu-dropdown hidden absolute right-0 mt-2 bg-white border rounded shadow">
                <a href="#" class="card-menu-item" data-action="rename" data-testid="${testId}"><i class="ph ph-pencil w-5 inline-block mr-2"></i> Rename</a>
                <a href="#" class="card-menu-item" data-action="reset" data-testid="${testId}"><i class="ph ph-arrow-counter-clockwise w-5 inline-block mr-2"></i> Reset</a>
                <a href="#" class="card-menu-item text-red-600" data-action="delete" data-testid="${testId}"><i class="ph ph-trash w-5 inline-block mr-2"></i> Delete</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Render folders as folder-cards (top-level or nested depending on currentFolderId)
  // When a search filter is active at the root view, we also include any folder that
  // contains matching tests so users can see context for results.
  let foldersToShow = dashboardLayout.folders.filter((f) => (currentFolderId ? f.parentId === currentFolderId : !f.parentId));
  if (lowerCaseFilter !== "" && !currentFolderId) {
    try {
      const matchedFolderIds = new Set();
      // For every matching test, locate the folder that contains it and add the folder
      // and its ancestors so the user sees the full path/context.
      allVisibleTestIds.forEach((tid) => {
        const folderId = Object.keys(dashboardLayout.testsInFolders || {}).find((k) => (dashboardLayout.testsInFolders[k] || []).includes(tid));
        if (folderId) {
          // add this folder and ancestors
          let walk = folderId;
          while (walk) {
            matchedFolderIds.add(walk);
            const parent = (dashboardLayout.folders.find((ff) => ff.id === walk) || {}).parentId || null;
            walk = parent || null;
          }
        }
      });

      // Append any matched folders that aren't already in foldersToShow (avoid duplicates)
      const extra = dashboardLayout.folders.filter((f) => matchedFolderIds.has(f.id) && !foldersToShow.some((x) => x.id === f.id));
      if (extra.length > 0) foldersToShow = foldersToShow.concat(extra);
    } catch (e) {
      // If anything goes wrong, fall back to default folder listing
    }
  }
  foldersToShow.forEach((folder) => {
    // Compute basic stats and a short summary list (show up to 4 items)
    const testIdsInFolder = dashboardLayout.testsInFolders[folder.id] || [];
    const visibleTests = testIdsInFolder.filter((id) => allVisibleTestIds.includes(id));
    const folderStats = computeFolderStats(folder.id);
    const avgLabel = !isNaN(folderStats.avgPercentage) ? folderStats.avgPercentage + "%" : "N/A";

    // Build a short line-by-line summary: first child folders then tests (each on its own line)
    const childFolders = dashboardLayout.folders.filter((f) => f.parentId === folder.id);
    // Assemble summaryItems: include child folders first, then visible tests
    const summaryItems = [];
    childFolders.forEach((cf) => {
      const testsInChild = dashboardLayout.testsInFolders[cf.id] || [];
      const subfolders = dashboardLayout.folders.filter((ff) => ff.parentId === cf.id) || [];
      summaryItems.push({ type: "folder", id: cf.id, name: cf.name, testCount: testsInChild.length, folderCount: subfolders.length });
    });
    visibleTests.forEach((tid) => {
      const m = testMetadata[tid];
      const attempts = (m && m.attempts) || [];
      let avg = "N/A";
      if (attempts.length > 0) {
        const tot = attempts.reduce((s, a) => s + (a.percentage || 0), 0);
        avg = Math.round(tot / attempts.length) + "%";
      }
      summaryItems.push({ type: "test", id: tid, name: m ? m.customName : tid, avg });
    });
    let summaryHtml = "";
    if (summaryItems.length === 0) {
      summaryHtml = `<div class="text-sm text-gray-500 italic">(empty)</div>`;
    } else {
      // If the user has expanded this folder's summary, show all items; otherwise show preview
      const PREVIEW_COUNT = 6;
      const isExpanded = expandedFolderSummaries.has(folder.id);
      const visibleItems = isExpanded ? summaryItems : summaryItems.slice(0, PREVIEW_COUNT);

      visibleItems.forEach((it) => {
        if (it.type === "folder") {
          // Folder entries: icon + truncated name + counts; make draggable so folders can be moved
          const counts = [];
          if (typeof it.testCount === "number" && it.testCount >= 0) counts.push(`${it.testCount} file${it.testCount === 1 ? "" : "s"}`);
          if (typeof it.folderCount === "number" && it.folderCount > 0) counts.push(`${it.folderCount} folder${it.folderCount === 1 ? "" : "s"}`);
          const countsText = counts.length > 0 ? counts.join(" • ") : "";
          // Render as a flex row so name and counts align vertically centered
          summaryHtml += `<div class="folder-summary-line text-sm text-gray-700" data-folder-id="${
            it.id
          }" draggable="true" ondragstart="drag(event)" title="${escapeHtml(
            it.name
          )}"><div style="display:flex;align-items:center;gap:8px;min-width:0;"><svg class="summary-folder-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex:0 0 auto"><path d="M3 7.5C3 6.67157 3.67157 6 4.5 6H9.5L11 8H19.5C20.3284 8 21 8.67157 21 9.5V17.5C21 18.3284 20.3284 19 19.5 19H4.5C3.67157 19 3 18.3284 3 17.5V7.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${
            it.name
          }</span>${
            countsText ? `<span style="flex:0 0 auto;color:#6b7280;white-space:nowrap;margin-left:6px">${escapeHtml(countsText)}</span>` : ""
          }</div></div>`;
        } else {
          // Test entries: left truncated name, right fixed avg so avg is always visible; make draggable
          summaryHtml += `<div class="folder-summary-line text-sm text-gray-700" data-testid="${
            it.id
          }" draggable="true" ondragstart="drag(event)" title="${escapeHtml(
            it.name
          )}"><div style="display:flex;align-items:center;gap:8px;"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;">${
            it.name
          }</div><div style="flex:0 0 auto;color:#6b7280;margin-left:8px;">${it.avg}</div></div></div>`;
        }
      });

      // If not expanded and there are more items, show a Show more button
      if (summaryItems.length > PREVIEW_COUNT) {
        const remaining = Math.max(0, summaryItems.length - PREVIEW_COUNT);
        if (!isExpanded) {
          summaryHtml += `<div class="mt-2"><button class="show-more-btn" data-action="toggle-summary" data-folder-id="${folder.id}" aria-expanded="false">Show ${remaining} more</button></div>`;
        } else {
          summaryHtml += `<div class="mt-2"><button class="show-more-btn" data-action="toggle-summary" data-folder-id="${folder.id}" aria-expanded="true">Show less</button></div>`;
        }
      }
    }

    const folderCard = `
      <div class="folder-card col-span-1 rounded-lg p-4" data-select-id="folder:${folder.id}" data-folder-id="${
      folder.id
    }" tabindex="0" draggable="true" ondragstart="drag(event)" ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="dragLeave(event)">
        <div class="flex justify-between items-start">
          <div>
            <div class="folder-tab mb-2"><i class="ph ph-folder text-2xl"></i></div>
            <h4 class="text-lg font-semibold text-gray-800">${folder.name}</h4>
            <div class="text-sm text-gray-500">${(dashboardLayout.testsInFolders[folder.id] || []).length} test(s) • Avg ${avgLabel}</div>
            <div class="mt-3">${summaryHtml}</div>
          </div>
          <div class="folder-card-actions" aria-hidden="false">
            <!-- Rename button sits to the left of Delete and is keyboard-accessible -->
            <button class="folder-rename-btn" data-action="rename-folder" data-testid="${folder.id}" aria-label="Rename Folder" data-tooltip="Rename folder">
              <i class="ph ph-pencil text-lg" aria-hidden="true"></i>
            </button>
            <!-- Delete button sits left of the hint and is keyboard-accessible -->
            <button class="folder-delete-btn" data-action="delete-folder" data-testid="${
              folder.id
            }" aria-label="Delete Folder" data-tooltip="Delete card and ungroup contents">
              <i class="ph ph-trash text-lg" aria-hidden="true"></i>
            </button>
            <!-- Subtle hint (non-focusable) showing info about double-click to open.
                 We use data-tooltip for a custom-styled tooltip that appears above the hint.
                 Keep tabindex -1 so it doesn't become a keyboard target. -->
            <button class="folder-open-hint" data-tooltip="Double click to open folder" aria-hidden="true" tabindex="-1">
              <svg class="folder-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"></circle>
                <path d="M12 8.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="M11.5 11.5h1v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    assembledHtml += folderCard;
  });

  // Render tests for the current view: if inside a folder, show its tests; otherwise show ungrouped tests.
  // When a search filter is active at the root, surface matching tests from anywhere so they appear
  // as result cards (while folder cards remain visible for context).
  let testsHtml = "";
  let testsInView = [];
  if (lowerCaseFilter !== "" && !currentFolderId) {
    // show matching tests from across the layout (including those inside folders)
    testsInView = Array.from(new Set(allVisibleTestIds));
  } else {
    testsInView = currentFolderId ? dashboardLayout.testsInFolders[currentFolderId] || [] : dashboardLayout.ungroupedTests;
  }

  const visibleTestsInView = (testsInView || [])
    .filter((id) => allVisibleTestIds.includes(id))
    .sort((a, b) => {
      const aMeta = testMetadata[a];
      const bMeta = testMetadata[b];
      if (!aMeta || !bMeta) return 0;
      if (aMeta.isStarred && !bMeta.isStarred) return -1;
      if (!aMeta.isStarred && bMeta.isStarred) return 1;
      return aMeta.customName.localeCompare(bMeta.customName);
    });

  visibleTestsInView.forEach((testId) => {
    testsHtml += renderTestCard(testId);
  });

  if (visibleTestsInView.length > 0) {
    assembledHtml += `<div class="col-span-full mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">${testsHtml}</div>`;
  } else if (currentFolderId) {
    // If we're inside a folder and nothing to show, provide a clear empty state for the folder
    assembledHtml += `<p class="text-gray-500 col-span-full text-center">This folder is empty. Drag tests here or use Create Folder to add content.</p>`;
  }

  // If nothing was rendered at all (no folders, no tests), show the dashboard-level message
  // If nothing was rendered (no folders/tests), show the dashboard-level message
  if (!assembledHtml || assembledHtml.trim() === "") {
    assembledHtml = dashboardHtml;
  }

  // Apply the assembled HTML in a single DOM update to avoid losing attached listeners
  testListEl.innerHTML = assembledHtml;

  // Attach robust drop handlers to breadcrumb/back elements so they always
  // perform deterministic moves even if DOM event targets are ambiguous.
  try {
    const leaveBtnEl = testListEl.querySelector("#leave-folder-btn");
    // Also attach handlers to the entire header region so the parent folder
    // accepts drops across its full width/height.
    const headerEl = testListEl.querySelector(".folder-view-header");
    if (leaveBtnEl) {
      leaveBtnEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        leaveBtnEl.classList.add("drag-over");
      });
      leaveBtnEl.addEventListener("dragleave", (e) => {
        leaveBtnEl.classList.remove("drag-over");
      });
      leaveBtnEl.addEventListener("drop", (e) => {
        leaveBtnEl.classList.remove("drag-over");
        moveDraggedItemToFolder(e, "");
      });
    }

    if (headerEl) {
      headerEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        headerEl.classList.add("drag-over");
      });
      headerEl.addEventListener("dragleave", (e) => headerEl.classList.remove("drag-over"));
      headerEl.addEventListener("drop", (e) => {
        headerEl.classList.remove("drag-over");
        // Use the header's dataset.folderId as the explicit target ('' -> root)
        const fid = typeof headerEl.dataset.folderId !== "undefined" ? headerEl.dataset.folderId : "";
        moveDraggedItemToFolder(e, fid);
      });
    }

    const rootLinkEl = testListEl.querySelector('nav.breadcrumb a[data-folder-id=""]');
    if (rootLinkEl) {
      rootLinkEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        rootLinkEl.classList.add("drag-over");
      });
      rootLinkEl.addEventListener("dragleave", (e) => {
        rootLinkEl.classList.remove("drag-over");
      });
      rootLinkEl.addEventListener("drop", (e) => {
        rootLinkEl.classList.remove("drag-over");
        moveDraggedItemToFolder(e, "");
      });
    }

    // Attach drop handlers to each breadcrumb folder link too
    const bcFolderLinks = testListEl.querySelectorAll('nav.breadcrumb a[data-folder-id]:not([data-folder-id=""])');
    bcFolderLinks.forEach((ln) => {
      const fid = ln.dataset.folderId || null;
      ln.addEventListener("dragover", (e) => {
        e.preventDefault();
        ln.classList.add("drag-over");
      });
      ln.addEventListener("dragleave", (e) => ln.classList.remove("drag-over"));
      ln.addEventListener("drop", (e) => {
        ln.classList.remove("drag-over");
        moveDraggedItemToFolder(e, fid);
      });
    });
  } catch (e) {
    /* ignore attach errors */
  }

  // After rendering, restore selection state if present
  try {
    const allSelectable = testListEl.querySelectorAll("[data-select-id]");
    // Ensure only the selected element is tabbable
    allSelectable.forEach((el) => {
      if (selectedCardId && el.dataset.selectId === selectedCardId) {
        el.setAttribute("tabindex", "0");
        el.classList.add("card-selected");
        el.setAttribute("aria-selected", "true");
        // Only focus when the dashboard is visible
        try {
          if (!screens.dashboard.classList.contains("hidden")) el.focus();
        } catch (e) {}
      } else {
        el.setAttribute("tabindex", "-1");
        el.classList.remove("card-selected");
        el.removeAttribute("aria-selected");
      }
    });
  } catch (e) {
    /* ignore */
  }

  // Manually trigger Phosphor Icons to process the newly added dynamic elements
  embedPhosphorIcons();
}

// === UTILITY FUNCTIONS ===

/**
 * Shows a screen and hides all others.
 */
function showScreen(screenId) {
  Object.values(screens).forEach((screen) => {
    if (screen.id === `${screenId}-screen`) {
      screen.classList.remove("hidden");
    } else {
      screen.classList.add("hidden");
    }
  });
}

/**
 * Shows a modal.
 */
function showModal(modalId) {
  if (modals[modalId]) {
    modals[modalId].classList.remove("hidden");
    // After showing, autofocus common targets and enable focus trap
    setTimeout(() => {
      // Autofocus common elements by modal id
      try {
        if (modalId === "time") {
          const inp = document.getElementById("time-input-modal");
          if (inp) inp.focus();
        } else if (modalId === "confirm") {
          // focus confirm button by default for quicker keyboard action
          const btn = document.getElementById("confirm-modal-confirm");
          if (btn) btn.focus();
        } else if (modalId === "createFolder") {
          const inp = document.getElementById("create-folder-input");
          if (inp) inp.focus();
        } else if (modalId === "rename") {
          const inp = document.getElementById("rename-input");
          if (inp) inp.focus();
        } else if (modalId === "delete") {
          const btn = document.getElementById("delete-confirm-btn");
          if (btn) btn.focus();
        } else if (modalId === "reset") {
          const btn = document.getElementById("reset-confirm-btn");
          if (btn) btn.focus();
        } else if (modalId === "alert") {
          const btn = document.getElementById("alert-ok-btn");
          if (btn) btn.focus();
        } else if (modalId === "dashboardHelp") {
          const closeBtn = document.getElementById("close-dashboard-help-btn");
          if (closeBtn) closeBtn.focus();
        }
      } catch (e) {
        /* ignore autofocus errors */
      }

      // Activate focus trap for this modal
      try {
        activateFocusTrap(modalId);
      } catch (e) {
        console.warn("activateFocusTrap failed:", e);
      }
    }, 10);
  }
}

/**
 * Hides a modal.
 */
function hideModal(modalId) {
  if (modals[modalId]) {
    modals[modalId].classList.add("hidden");
    try {
      releaseFocusTrap(modalId);
    } catch (e) {
      /* ignore */
    }
  }
}

// Focus trap utilities
const _activeFocusTraps = {}; // modalId -> handler
const _previouslyFocused = {}; // modalId -> previously focused element

function activateFocusTrap(modalId) {
  const modal = modals[modalId];
  if (!modal) return;

  const selector =
    'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
  const focusable = Array.from(modal.querySelectorAll(selector)).filter((el) => el.offsetParent !== null);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  // Remember previously focused element so we can restore after modal closes
  try {
    _previouslyFocused[modalId] = document.activeElement;
  } catch (e) {
    _previouslyFocused[modalId] = null;
  }

  const handler = (ev) => {
    if (ev.key === "Tab") {
      if (focusable.length === 1) {
        ev.preventDefault();
        first.focus();
        return;
      }
      if (ev.shiftKey) {
        if (document.activeElement === first) {
          ev.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          ev.preventDefault();
          first.focus();
        }
      }
    } else if (ev.key === "Escape") {
      // Allow Escape to close the modal for keyboard users
      ev.preventDefault();
      try {
        hideModal(modalId);
      } catch (e) {
        /* ignore */
      }
    }
  };

  // Store handler so we can remove later
  _activeFocusTraps[modalId] = handler;
  document.addEventListener("keydown", handler);
}

function releaseFocusTrap(modalId) {
  const handler = _activeFocusTraps[modalId];
  if (handler) {
    document.removeEventListener("keydown", handler);
    delete _activeFocusTraps[modalId];
  }
  // Restore focus to previously focused element if possible
  try {
    const prev = _previouslyFocused[modalId];
    if (prev && typeof prev.focus === "function") {
      // Only restore if the element is still in the document
      if (document.contains(prev)) prev.focus();
    }
  } catch (e) {
    /* ignore */
  }
  delete _previouslyFocused[modalId];
}

/**
 * Formats remaining seconds into HH:MM:SS.
 */
function formatTime(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Formats text, converting *bold* to <strong> and newlines to <br>.
 */
function formatText(text) {
  if (!text) return "";
  return text
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>") // Bold
    .replace(/\n/g, "<br>"); // Newlines
}

/**
 * Safely waits for the Phosphor Icons library to be ready and then
 * calls its embed function to render all icons on the page.
 * This prevents race conditions on initial load and subsequent re-renders.
 */
function embedPhosphorIcons() {
  // The 'defer' attribute on the script tags ensures 'window.phosphor' is available.
  // We add a try-catch block for robustness in case the script fails to load.
  try {
    window.phosphor.embed();
  } catch (error) {
    console.error("Phosphor Icons library not available. Icons will not be rendered.", error);
  }
}

/**
 * Shows a transient toast message in the bottom-right of the app.
 * @param {string} message - The message to show (can include simple HTML).
 * @param {number} duration - How long to show the toast in ms (default 3000).
 */
/**
 * Shows a transient toast message in the bottom-right of the app.
 * @param {string} message - The message to show (can include simple HTML).
 * @param {number} duration - How long to show the toast in ms (default 3000).
 * @param {object} opts - Optional options: { className: 'toast-error' }
 */
function showToast(message, duration = 3000, opts = {}) {
  // Toasts removed. Keep this function as a no-op for compatibility.
  return;
}

/**
 * Shows a transient on-screen debug toast for drop events.
 * Designed to help reproduce drag/drop issues without opening DevTools.
 */
function showDropDebugToast(info) {
  // Toasts disabled in production UI. Keep function as a no-op to avoid side effects.
  return;
}

// === FOLDER & DRAG/DROP LOGIC ===

// Opens the Create Folder modal for interactive use
function createFolder() {
  // If we're inside a folder, make the new folder a child of the current folder
  folderCreateParentId = currentFolderId || null;
  showModal("createFolder");
  const input = document.getElementById("create-folder-input");
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 50);
  }
}

// Confirms the create-folder modal and actually creates the folder.
// Returns created folder id or null.
function createFolderConfirm() {
  const input = document.getElementById("create-folder-input");
  const folderName = input ? (input.value || "").trim() : "";
  console.log("createFolderConfirm: folderName=", folderName);
  if (folderName.length > 0) {
    const newFolder = {
      id: `folder_${Date.now()}`,
      name: folderName.trim(),
      parentId: folderCreateParentId || null,
    };
    dashboardLayout.folders.push(newFolder);
    saveLayout();
    renderDashboard();
    if (input) input.value = "";
    // Clear any previous error state on success
    const modalEl = document.getElementById("create-folder-modal");
    if (modalEl) modalEl.classList.remove("has-create-error");
    // Reset the temporary parent holder
    folderCreateParentId = null;
    hideModal("createFolder");
    return newFolder.id;
  }
  // If invalid, keep modal open but show an inline validation message and keep focus
  // Avoid native alert() which blocks and can interfere with focus trapping.
  try {
    let err = document.getElementById("create-folder-error");
    if (!err) {
      err = document.createElement("div");
      err.id = "create-folder-error";
      err.className = "create-folder-error";
      // Build a small inline SVG icon + message for better visual affordance
      err.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <path d="M12 9v4" stroke="#b91c1c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 17h.01" stroke="#b91c1c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="9" stroke="#fecaca" stroke-width="1.2" fill="rgba(254, 242, 242, 0.6)"/>
        </svg>
        <div class="create-folder-error-text">Please enter a valid folder name.</div>
      `;
      if (input && input.parentNode) {
        // Insert after the input for visibility
        input.parentNode.insertBefore(err, input.nextSibling);
      } else if (input) {
        input.after(err);
      }
      // Mark the modal as having an error so we can adjust adjacent spacing via CSS
      const modalEl = document.getElementById("create-folder-modal");
      if (modalEl) modalEl.classList.add("has-create-error");
    } else {
      // Update text if it already exists (keeps the icon)
      const text = err.querySelector(".create-folder-error-text");
      if (text) text.textContent = "Please enter a valid folder name.";
    }
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.classList.add("input-error");
      // Move focus back to the input so keyboard users can continue typing
      setTimeout(() => {
        try {
          input.focus();
        } catch (e) {
          /* ignore */
        }
      }, 10);
    }
  } catch (e) {
    console.warn("Failed to show inline validation for create-folder:", e);
  }
  return null;
}

// Programmatic helper for tests or automation. Returns created id or null.
function createFolderProgrammatic(name) {
  if (!name || !name.trim()) return null;
  const newFolder = { id: `folder_${Date.now()}`, name: name.trim() };
  dashboardLayout.folders.push(newFolder);
  saveLayout();
  renderDashboard();
  return newFolder.id;
}

function deleteFolder(folderId) {
  // Move tests from the deleted folder to its parent (or ungrouped if no parent)
  const parentId = (dashboardLayout.folders.find((f) => f.id === folderId) || {}).parentId || null;
  const testsToMove = dashboardLayout.testsInFolders[folderId] || [];
  if (parentId) {
    if (!dashboardLayout.testsInFolders[parentId]) dashboardLayout.testsInFolders[parentId] = [];
    dashboardLayout.testsInFolders[parentId].push(...testsToMove);
  } else {
    dashboardLayout.ungroupedTests.push(...testsToMove);
  }

  // Reparent any child folders to the deleted folder's parent
  dashboardLayout.folders.forEach((f) => {
    if (f.parentId === folderId) f.parentId = parentId || null;
  });

  // Remove the folder and its test list
  dashboardLayout.folders = dashboardLayout.folders.filter((f) => f.id !== folderId);
  delete dashboardLayout.testsInFolders[folderId];
}

function allowDrop(ev) {
  ev.preventDefault();
  const dropTarget = ev.currentTarget;
  // Mark any drop target as active so we can style it (breadcrumb/back/folder cards)
  try {
    dropTarget.classList.add("drag-over");
    // Indicate move is allowed
    try {
      ev.dataTransfer.dropEffect = "move";
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    /* ignore */
  }
}

function dragLeave(ev) {
  try {
    ev.currentTarget.classList.remove("drag-over");
  } catch (e) {
    /* ignore */
  }
}

function drag(ev) {
  const el = ev.target.closest("[data-testid],[data-folder-id]");
  if (!el) return;
  if (el.dataset.testid) {
    ev.dataTransfer.setData("text/plain", el.dataset.testid);
    ev.dataTransfer.setData("application/x-item-type", "test");
  } else if (el.dataset.folderId) {
    ev.dataTransfer.setData("text/plain", el.dataset.folderId);
    ev.dataTransfer.setData("application/x-item-type", "folder");
  }
}

function drop(ev) {
  ev.preventDefault();
  // If an explicit move helper already handled this event, don't run the generic drop logic.
  if (ev && ev._movedByHelper) {
    // debug log removed
    try {
      // Clear visual state
      ev.currentTarget && ev.currentTarget.classList && ev.currentTarget.classList.remove("drag-over");
      lastDragOverFolderId = undefined;
      clearDropHighlight();
    } catch (e) {}
    return;
  }
  const dropTarget = ev.currentTarget;
  dropTarget.classList.remove("drag-over");
  // Robustly determine the folder id the user intended to drop into.
  // Some drop targets may be child elements without dataset.folderId, so
  // fall back to the closest ancestor that has data-folder-id.
  const rawId = ev.dataTransfer.getData("text/plain") || ev.dataTransfer.getData("Text") || ev.dataTransfer.getData("text");
  const itemType = ev.dataTransfer.getData("application/x-item-type") || "test";
  let targetFolderId = null;
  // If pointer-tracking found a folder during dragover, prefer that — it reflects
  // the visual element the user last hovered while dragging and avoids accidental
  // hits on underlying cards.
  if (typeof lastDragOverFolderId !== "undefined") {
    targetFolderId = lastDragOverFolderId; // may be null (root) or string (folder id)
  }
  try {
    // Prefer a directly-hit folder element (closest to the event target) over the grid's dataset.
    const fallback = ev.target && ev.target.closest ? ev.target.closest("[data-folder-id]") : null;
    if (fallback && typeof fallback.dataset.folderId !== "undefined") {
      targetFolderId = fallback.dataset.folderId || null;
    } else {
      // Accept dataset.folderId on the dropTarget (grid) as a fallback ('' => root)
      const dt = dropTarget && dropTarget.dataset && dropTarget.dataset.folderId;
      if (typeof dt !== "undefined") {
        targetFolderId = dt || null;
      } else {
        // If neither the event target nor the grid provide folder info, leave undefined for hit-test below
        targetFolderId = undefined;
      }
    }
    // As a last resort, use a hit-test at the drop coordinates to find the element directly under the pointer.
    // This helps when the DOM structure or pointer events cause ev.target to be something unexpected.
    try {
      if ((typeof targetFolderId === "undefined" || targetFolderId === null) && typeof ev.clientX === "number" && typeof ev.clientY === "number") {
        const under = document.elementFromPoint(ev.clientX, ev.clientY);
        const hit = under && under.closest ? under.closest("[data-folder-id]") : null;
        if (hit && typeof hit.dataset.folderId !== "undefined") {
          targetFolderId = hit.dataset.folderId || null;
        }
      }
    } catch (e) {
      /* ignore hit-test errors */
    }
  } catch (e) {
    console.warn("Error resolving targetFolderId on drop:", e);
    targetFolderId = null;
  }

  // Normalize id for robust comparisons (trim whitespace that may sneak in)
  const id = rawId ? String(rawId).trim() : rawId;
  // debug log removed
  if (!id) return;

  // Show an on-screen debug toast with the resolved values and current layout membership
  try {
    const inUngroupedBefore = (dashboardLayout.ungroupedTests || []).includes(id);
    const folderBefore = Object.keys(dashboardLayout.testsInFolders || {}).find((k) => (dashboardLayout.testsInFolders[k] || []).includes(id)) || null;
    // capture pointer hit element at drop time for extra diagnostics
    let pointerHit = null;
    let pointerHitClosest = null;
    try {
      if (typeof ev.clientX === "number" && typeof ev.clientY === "number") {
        pointerHit = document.elementFromPoint(ev.clientX, ev.clientY);
        pointerHitClosest = pointerHit && pointerHit.closest ? pointerHit.closest("[data-folder-id]") : null;
      }
    } catch (e) {
      pointerHit = null;
      pointerHitClosest = null;
    }
    const pointerInfo = pointerHitClosest
      ? { tag: pointerHitClosest.tagName, datasetFolderId: pointerHitClosest.dataset.folderId || null, class: pointerHitClosest.className }
      : null;

    showDropDebugToast({
      phase: "resolved",
      id,
      itemType,
      targetFolderId,
      lastDragOverFolderId,
      dropTargetDataset: dropTarget && dropTarget.dataset ? dropTarget.dataset.folderId || null : null,
      evTargetClosest:
        ev.target && ev.target.closest && ev.target.closest("[data-folder-id]") ? ev.target.closest("[data-folder-id]").dataset.folderId || null : null,
      pointerInfo,
      inUngroupedBefore,
      folderBefore,
    });
  } catch (e) {
    /* ignore */
  }

  if (itemType === "test") {
    // Helper to safely compare ids (trimmed string equality)
    const normalizeId = (s) => (s == null ? null : String(s).trim());
    const equalsId = (a, b) => normalizeId(a) === normalizeId(b);

    // Capture pre-mutation snapshot for debugging
    const pre = {
      ungrouped: [...(dashboardLayout.ungroupedTests || [])],
      testsInFolders: {},
    };
    Object.keys(dashboardLayout.testsInFolders || {}).forEach((k) => (pre.testsInFolders[k] = [...(dashboardLayout.testsInFolders[k] || [])]));

    // Remove test from any original location (use equalsId for robust matching)
    dashboardLayout.ungroupedTests = (dashboardLayout.ungroupedTests || []).filter((tid) => !equalsId(tid, id));
    for (const folderId in dashboardLayout.testsInFolders) {
      if (!Object.prototype.hasOwnProperty.call(dashboardLayout.testsInFolders, folderId)) continue;
      dashboardLayout.testsInFolders[folderId] = (dashboardLayout.testsInFolders[folderId] || []).filter((tid) => !equalsId(tid, id));
    }

    // Add to target (folder or root)
    if (targetFolderId) {
      if (!dashboardLayout.testsInFolders[targetFolderId]) dashboardLayout.testsInFolders[targetFolderId] = [];
      // Avoid duplicates (use equalsId)
      if (!dashboardLayout.testsInFolders[targetFolderId].some((tid) => equalsId(tid, id))) dashboardLayout.testsInFolders[targetFolderId].push(id);
    } else {
      if (!dashboardLayout.ungroupedTests.some((tid) => equalsId(tid, id))) dashboardLayout.ungroupedTests.push(id);
    }

    // Capture post-mutation snapshot
    const post = {
      ungrouped: [...(dashboardLayout.ungroupedTests || [])],
      testsInFolders: {},
    };
    Object.keys(dashboardLayout.testsInFolders || {}).forEach((k) => (post.testsInFolders[k] = [...(dashboardLayout.testsInFolders[k] || [])]));

    // Add detailed debug info to the resolved toast so the user can paste it
    try {
      showDropDebugToast({ phase: "mutation", id, targetFolderId, pre, post });
      // debug log removed
    } catch (e) {
      /* ignore */
    }
  } else if (itemType === "folder") {
    const folder = dashboardLayout.folders.find((f) => f.id === id);
    if (folder) {
      // Prevent making a folder a child of itself or one of its descendants
      let p = targetFolderId;
      let invalid = false;
      while (p) {
        if (p === folder.id) {
          invalid = true;
          break;
        }
        const pf = dashboardLayout.folders.find((ff) => ff.id === p);
        p = pf ? pf.parentId : null;
      }
      if (!invalid) {
        folder.parentId = targetFolderId || null;
      }
    }
  }

  // After mutation, persist and re-render; then show where the item now resides.
  saveLayout();
  renderDashboard();
  // Clear pointer-tracking state after drop and clear visual highlight
  lastDragOverFolderId = undefined;
  clearDropHighlight();
  try {
    const inUngrouped = (dashboardLayout.ungroupedTests || []).includes(id);
    const folderNow = Object.keys(dashboardLayout.testsInFolders || {}).find((k) => (dashboardLayout.testsInFolders[k] || []).includes(id)) || null;
    // Also include a snapshot of the arrays for clarity
    const snapshot = {
      ungrouped: dashboardLayout.ungroupedTests ? [...dashboardLayout.ungroupedTests] : [],
      testsInFolders: {},
    };
    Object.keys(dashboardLayout.testsInFolders || {}).forEach((k) => {
      snapshot.testsInFolders[k] = [...(dashboardLayout.testsInFolders[k] || [])];
    });
    showDropDebugToast({ phase: "final", id, itemType, targetFolderId, inUngrouped, folderNow, snapshot });
    // debug log removed
  } catch (e) {
    /* ignore */
  }
}

/**
 * Move a dragged item (test or folder) to a specific folderId and re-render.
 * This is used by dedicated drop targets like breadcrumb/back where we want a
 * deterministic target regardless of DOM event ambiguity.
 */
function moveDraggedItemToFolder(ev, explicitFolderId) {
  try {
    ev.preventDefault();
    ev.stopPropagation();
    // Mark the event so parent handlers can skip duplicate processing
    try {
      ev._movedByHelper = true;
    } catch (e) {
      /* ignore */
    }
    const rawId = ev.dataTransfer.getData("text/plain") || ev.dataTransfer.getData("Text") || ev.dataTransfer.getData("text");
    const itemType = ev.dataTransfer.getData("application/x-item-type") || "test";
    const id = rawId ? String(rawId).trim() : rawId;
    const targetFolderId = typeof explicitFolderId !== "undefined" ? (explicitFolderId === "" ? null : explicitFolderId) : null;
    if (!id) return;
    // Helper to safely compare ids (trimmed string equality)
    const normalizeId = (s) => (s == null ? null : String(s).trim());
    const equalsId = (a, b) => normalizeId(a) === normalizeId(b);

    // Capture pre-mutation snapshot for debugging
    const pre = {
      ungrouped: [...(dashboardLayout.ungroupedTests || [])],
      testsInFolders: {},
    };
    Object.keys(dashboardLayout.testsInFolders || {}).forEach((k) => (pre.testsInFolders[k] = [...(dashboardLayout.testsInFolders[k] || [])]));

    // Same mutation logic as drop(), but with robust equality and debug snapshots
    if (itemType === "test") {
      dashboardLayout.ungroupedTests = (dashboardLayout.ungroupedTests || []).filter((tid) => !equalsId(tid, id));
      for (const folderId in dashboardLayout.testsInFolders) {
        if (!Object.prototype.hasOwnProperty.call(dashboardLayout.testsInFolders, folderId)) continue;
        dashboardLayout.testsInFolders[folderId] = (dashboardLayout.testsInFolders[folderId] || []).filter((tid) => !equalsId(tid, id));
      }
      if (targetFolderId) {
        if (!dashboardLayout.testsInFolders[targetFolderId]) dashboardLayout.testsInFolders[targetFolderId] = [];
        if (!dashboardLayout.testsInFolders[targetFolderId].some((tid) => equalsId(tid, id))) dashboardLayout.testsInFolders[targetFolderId].push(id);
      } else {
        if (!dashboardLayout.ungroupedTests.some((tid) => equalsId(tid, id))) dashboardLayout.ungroupedTests.push(id);
      }
    } else if (itemType === "folder") {
      const folder = dashboardLayout.folders.find((f) => f.id === id);
      if (folder) {
        // Prevent cycles
        let p = targetFolderId;
        let invalid = false;
        while (p) {
          if (p === folder.id) {
            invalid = true;
            break;
          }
          const pf = dashboardLayout.folders.find((ff) => ff.id === p);
          p = pf ? pf.parentId : null;
        }
        if (!invalid) folder.parentId = targetFolderId || null;
      }
    }

    // Capture post-mutation snapshot
    const post = {
      ungrouped: [...(dashboardLayout.ungroupedTests || [])],
      testsInFolders: {},
    };
    Object.keys(dashboardLayout.testsInFolders || {}).forEach((k) => (post.testsInFolders[k] = [...(dashboardLayout.testsInFolders[k] || [])]));

    try {
      showDropDebugToast({ phase: "moveHelper", id, targetFolderId, pre, post });
      // debug log removed
    } catch (e) {
      /* ignore */
    }

    saveLayout();
    renderDashboard();
  } catch (e) {
    console.error("moveDraggedItemToFolder failed:", e);
  }
}

// === STARTUP ===
// Helper to render a fatal error overlay so user sees errors instead of a blank screen
function showFatalError(err) {
  try {
    const appEl = document.getElementById("app");
    if (!appEl) return;
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.75)";
    overlay.style.color = "white";
    overlay.style.zIndex = 99999;
    overlay.style.padding = "24px";
    overlay.style.overflow = "auto";
    overlay.innerHTML = `<div style="max-width:900px;margin:40px auto;background:#1f2937;padding:20px;border-radius:8px;"><h2 style="margin:0 0 12px">Application error</h2><pre style="white-space:pre-wrap;color:#fee2e2">${escapeHtml(
      String(err && err.stack ? err.stack : err)
    )}</pre><div style="margin-top:12px"><button id="reload-app-btn" style="background:#0ea5e9;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer">Reload</button></div></div>`;
    appEl.appendChild(overlay);
    const btn = document.getElementById("reload-app-btn");
    if (btn) btn.addEventListener("click", () => location.reload());
  } catch (e) {
    /* ignore */
  }
}

// Wrap the startup in an async function and show a fatal overlay on uncaught errors
(async () => {
  try {
    await init();
  } catch (err) {
    console.error("Fatal init error:", err);
    showFatalError(err);
  }
})();

// Global uncaught error handler to show errors on screen instead of leaving blank
window.addEventListener("error", (ev) => {
  try {
    showFatalError(ev.error || ev.message || "Unknown error");
  } catch (e) {}
});
window.addEventListener("unhandledrejection", (ev) => {
  try {
    showFatalError(ev.reason || "Unhandled rejection");
  } catch (e) {}
});
