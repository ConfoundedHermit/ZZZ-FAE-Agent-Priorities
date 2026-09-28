import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function dumpBrowserDom(browser, args, { timeout = 30000 } = {}) {
  const execution = execFileAsync(browser, args, {
    timeout,
    maxBuffer: 1024 * 1024,
  });
  let output;
  try {
    output = await execution;
  } catch (error) {
    const reason = error.killed
      ? `timed out or was terminated (timeout: ${timeout} ms)`
      : `failed (code: ${error.code ?? "none"}, signal: ${error.signal ?? "none"})`;
    throw new Error(
      `Browser ${reason}: ${browser}\n` +
      `stderr:\n${error.stderr || "(empty)"}\nstdout:\n${error.stdout || "(empty)"}`,
      { cause: error },
    );
  }

  // A browser can handle the timeout signal and exit successfully without a DOM.
  if (execution.child.killed) {
    throw new Error(
      `Browser timed out after ${timeout} ms: ${browser}\nstderr:\n${output.stderr || "(empty)"}`,
    );
  }
  if (!output.stdout.trim()) {
    throw new Error(
      `Browser returned no DOM output: ${browser}\nstderr:\n${output.stderr || "(empty)"}`,
    );
  }
  return output;
}
