/**
 * The harness shell is itself Electron-based and exports
 * ELECTRON_RUN_AS_NODE=1, which makes every electron.exe launch behave like
 * plain Node. Remove it for our dev server / tests so the real Electron runtime
 * starts. Loaded via `node --require ./scripts/clean-electron-env.cjs ...`.
 */
delete process.env.ELECTRON_RUN_AS_NODE
