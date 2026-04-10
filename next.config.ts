import type { NextConfig } from "next";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const turbopackProjectRoot = path.dirname(fileURLToPath(import.meta.url));

// #region agent log
(() => {
  const cwd = process.cwd();
  const inst = path.join(turbopackProjectRoot, "src", "instrumentation.ts");
  const nextDir = path.join(cwd, ".next");
  let instrumentationJsSnippet = "";
  try {
    const p = path.join(nextDir, "dev", "server", "instrumentation.js");
    if (fs.existsSync(p)) {
      instrumentationJsSnippet = fs.readFileSync(p, "utf8").slice(0, 400);
    }
  } catch {
    instrumentationJsSnippet = "read_error";
  }
  fetch("http://127.0.0.1:7266/ingest/6a427adc-5f5b-45b5-b3d1-f343e48d9d61", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "df6d55",
    },
    body: JSON.stringify({
      sessionId: "df6d55",
      runId: "pre-fix",
      hypothesisId: "H1-H5",
      location: "next.config.ts:boot",
      message: "Next config evaluated: cwd, instrumentation file, .next hook snippet",
      data: {
        cwd,
        turbopackProjectRoot,
        instrumentationAbs: inst,
        instrumentationExists: fs.existsSync(inst),
        nextDirExists: fs.existsSync(nextDir),
        argv1: process.argv[1],
        instrumentationJsSnippet,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
})();
// #endregion

const nextConfig: NextConfig = {
  turbopack: {
    root: turbopackProjectRoot,
  },
  experimental: {
    serverActions: {
      // Default is 1 MB; coral uploads allow 6 MB binary, and vision uses base64 (~4/3 larger).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
