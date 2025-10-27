const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;

// Enable live reload for Electron-packager.
// This will watch for changes in the renderer process files and reload the window.
try {
  require("electron-reloader")(module);
} catch (_) {}

// --- IPC HANDLER FOR LOADING TESTS ---
// This function runs in the main process and has access to the file system.
ipcMain.handle("load-initial-tests", async () => {
  try {
    const jsonPath = path.join(__dirname, "json");
    const manifestPath = path.join(jsonPath, "manifest.json");

    // Check if manifest exists before trying to read it
    try {
      await fs.access(manifestPath);
    } catch {
      // If there's no manifest, attempt to read all .json files in the json directory
      console.log("manifest.json not found, scanning json/ folder for .json files...");
      try {
        const entries = await fs.readdir(jsonPath, { withFileTypes: true });
        const jsonFiles = entries
          .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".json"))
          .map((e) => e.name)
          // exclude a manifest if present with different case
          .filter((name) => name.toLowerCase() !== "manifest.json");

        if (jsonFiles.length === 0) {
          return [];
        }

        const fileReadPromises = jsonFiles.map(async (filename) => {
          const filePath = path.join(jsonPath, filename);
          const content = await fs.readFile(filePath, "utf-8");
          return { name: filename, content };
        });

        const fileObjects = await Promise.all(fileReadPromises);
        return fileObjects;
      } catch (dirErr) {
        console.error("Failed to read json directory:", dirErr);
        return [];
      }
    }
    const manifestContent = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    const fileReadPromises = manifest.map(async (filename) => {
      const filePath = path.join(jsonPath, filename);
      const content = await fs.readFile(filePath, "utf-8");
      return { name: filename, content: content };
    });

    const fileObjects = await Promise.all(fileReadPromises);
    return fileObjects; // Send the successfully read files to the renderer
  } catch (error) {
    console.error("Failed to load initial tests from main process:", error);
    return []; // Return an empty array on failure
  }
});

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false, // It's a good security practice
      contextIsolation: true, // It's a good security practice
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");
  // No automatic test hooks in production main process — keep main minimal.

  // Open the DevTools in a detached window to help debug renderer issues during development.
  try {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } catch (e) {
    console.warn("Could not open DevTools automatically:", e);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
