import type { Instrumentation } from "next";

export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    return;
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, req, ctx) => {
  void err;
  void req;
  void ctx;
};
