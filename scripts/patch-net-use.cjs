/**
 * Windows sandbox workaround for Vite.
 *
 * Vite calls `exec("net use")` once to detect mapped network drives. In a
 * restricted process this child-process spawn can fail with EPERM and break
 * config loading / builds. `net use` is only used to build a drive map, so an
 * empty result falls back to Vite's own `fs.realpathSync.native` path.
 *
 * Loaded explicitly via `node --require ./scripts/patch-net-use.cjs ...`.
 */
const childProcess = require('node:child_process')

const originalExec = childProcess.exec

childProcess.exec = function patchedExec(command, options, callback) {
  if (typeof command === 'string' && /^\s*net\s+use\s*$/i.test(command)) {
    const done = typeof options === 'function' ? options : callback
    if (typeof done === 'function') {
      process.nextTick(() => done(null, '', ''))
    }
    return { on() {}, kill() {}, stdout: null, stderr: null }
  }
  return originalExec.apply(this, arguments)
}
