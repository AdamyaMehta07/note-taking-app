import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

async function logAttempt(shareLinkId: string, success: boolean, reason: string, req: NextRequest) {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await prisma.accessLog.create({
    data: { shareLinkId, success, reason, ipAddress },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const providedPassword: string | undefined = body?.password;

  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { note: true },
  });

  if (!link) {
    return NextResponse.json({ error: "This link is invalid." }, { status: 404 });
  }

  if (link.revoked) {
    await logAttempt(link.id, false, "REVOKED", req);
    return NextResponse.json({ error: "This link has been revoked by its owner." }, { status: 410 });
  }

  if (link.shareType === "ONE_TIME" && link.used) {
    await logAttempt(link.id, false, "ALREADY_USED", req);
    return NextResponse.json({ error: "This one-time link has already been used." }, { status: 410 });
  }

  if (link.shareType === "TIME_BASED" && link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    await logAttempt(link.id, false, "EXPIRED", req);
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  // Password check happens BEFORE we touch the used/viewCount columns. A
  // wrong password must never consume a one-time link or count as a view -
  // it should be as if the request never happened.
  if (link.accessType === "PASSWORD") {
    if (!providedPassword) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }
    const isCorrect = await verifyPassword(providedPassword, link.passwordHash ?? "");
    if (!isCorrect) {
      await logAttempt(link.id, false, "WRONG_PASSWORD", req);
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
  }

  // --- THE RACE-CONDITION-SAFE PART ---
  // Two people could reach this exact line at the same instant for the same
  // one-time link (e.g. they both had the link open and both clicked at once).
  // We do NOT do "read used, check in JS, then write" - that has a gap between
  // the check and the write where a second request could sneak through.
  //
  // Instead we issue ONE atomic UPDATE whose WHERE clause re-checks the same
  // conditions at the database level, and increments the view count in the
  // same statement:
  //
  //   UPDATE ShareLink SET viewCount = viewCount + 1, used = true (if one-time)
  //   WHERE id = ? AND revoked = false AND (used = false OR shareType != ONE_TIME) AND (not expired)
  //
  // PostgreSQL takes a row lock for the first request that reaches this
  // UPDATE. The second concurrent request has to wait for that lock, and by
  // the time it gets to run, the row's `used` column is already true - so
  // its WHERE clause no longer matches and it updates 0 rows. We can then
  // tell the two requests apart by checking how many rows each one updated.
  const now = new Date();
  const result = await prisma.shareLink.updateMany({
    where: {
      id: link.id,
      revoked: false,
      ...(link.shareType === "ONE_TIME" ? { used: false } : {}),
      ...(link.shareType === "TIME_BASED" ? { expiresAt: { gt: now } } : {}),
    },
    data: {
      viewCount: { increment: 1 },
      ...(link.shareType === "ONE_TIME" ? { used: true } : {}),
    },
  });

  if (result.count === 0) {
    // We lost the race (or it was revoked/expired in the split second since
    // our read above). Whoever got here first already won - this request
    // gets a clean "no longer available" instead of double-counting.
    await logAttempt(link.id, false, "RACE_LOST_OR_EXPIRED", req);
    return NextResponse.json(
      { error: "This link is no longer available." },
      { status: 410 }
    );
  }

  await logAttempt(
    link.id,
    true,
    link.accessType === "PASSWORD" ? "PASSWORD_OK" : "PUBLIC_VIEW",
    req
  );

  return NextResponse.json({
    title: link.note.title,
    content: link.note.content,
  });
}
