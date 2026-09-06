import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const note = await prisma.note.findUnique({
    where: { id },
    include: { shareLink: true },
  });

  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  // Ownership check: even a logged-in user shouldn't see someone else's note
  // just by guessing/incrementing an id.
  if (note.ownerId !== session.userId) {
    return NextResponse.json({ error: "Not authorized to view this note" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = note.shareLink;

  return NextResponse.json({
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    shareLink: link
      ? {
          url: `${appUrl}/share/${link.token}`,
          shareType: link.shareType,
          accessType: link.accessType,
          used: link.used,
          revoked: link.revoked,
          expiresAt: link.expiresAt,
          viewCount: link.viewCount,
          // passwordHash is intentionally never sent to the client.
        }
      : null,
  });
}
