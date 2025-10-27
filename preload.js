const { contextBridge, ipcRenderer } = require("electron");

// Expose a secure API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Invokes the 'load-initial-tests' channel in the main process
   * and returns a promise that resolves with the test data.
   */
  loadInitialTests: () => ipcRenderer.invoke("load-initial-tests"),
});
