import { NextResponse } from "next/server";

const serverStartedAt = Date.now();
const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET() {
  const uptimeSec = Math.floor((Date.now() - serverStartedAt) / 1000);

  return NextResponse.json(
    {
      ok: true,
      service: "reefx-web",
      probe: "liveness",
      uptimeSec,
      timestamp: new Date().toISOString(),
    },
    { headers: noStoreHeaders },
  );
}
