// #region agent log
const AGENT_DEBUG_ENDPOINT =
  "http://127.0.0.1:7372/ingest/8407dbed-5e8e-4bc5-9ee7-94c44eed562d";

export function agentDebugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
) {
  fetch(AGENT_DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "868310",
    },
    body: JSON.stringify({
      sessionId: "868310",
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
      runId,
    }),
  }).catch(() => {});
}
// #endregion
