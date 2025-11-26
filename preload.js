const { contextBridge, ipcRenderer } = require("electron");

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Invokes the 'load-initial-tests' channel in the main process
   * and returns a promise that resolves with the test data.
   */
  loadInitialTests: () => ipcRenderer.invoke("load-initial-tests"),
  // Inform renderer whether the app is packaged (production build)
  isPackaged: (() => {
    try {
      // ELECTRON_IS_PACKAGED is set to '1' when packaged; fallback to app.isPackaged if available
      if (process && process.env && process.env.ELECTRON_IS_PACKAGED === "1") return true;
      const { app } = require("electron");
      return !!(app && app.isPackaged);
    } catch (e) {
      return false;
    }
  })(),
});
