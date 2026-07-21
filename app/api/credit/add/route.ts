import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for the backend `credit/add` cloud function.
 *
 * The `x-cron-secret` is a server-only secret and must never reach the browser,
 * so the client calls this route and we attach the secret here before
 * forwarding to `${NEXT_PUBLIC_BACKEND_URL}/credit/add`.
 */
export async function POST(req: NextRequest) {
  try {
    const { userIds, amount } = await req.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a number greater than 0" },
        { status: 400 },
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[POST /api/credit/add] CRON_SECRET is not set");
      return NextResponse.json(
        { error: "Server is not configured to add credits" },
        { status: 500 },
      );
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/credit/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
      body: JSON.stringify({ userIds, amount }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message ?? data?.error ?? `Backend error ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json(data ?? { ok: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[POST /api/credit/add]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
