/**
 * Nightly sweep entry point (§13). Triggered by pg_cron / a scheduled request.
 * Guarded by CRON_SECRET — never a user-facing route. Notifications land in M3;
 * for now this materializes suggestions + refill tasks across all circles.
 */
import { NextResponse } from "next/server";
import { sweepAll } from "@/lib/jobs/sweep";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed — no secret set means no cron access
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse("Unauthorized", { status: 401 });
  try {
    const counts = await sweepAll();
    return NextResponse.json({ ok: true, ...counts });
  } catch (error) {
    console.error("[cron/sweep] failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "sweep failed" },
      { status: 500 },
    );
  }
}
