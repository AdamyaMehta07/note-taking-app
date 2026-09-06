import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const note = await prisma.note.findUnique({
    where: { id },
    include: { shareLink: true },
  });

  if (!note || !note.shareLink) {
    return NextResponse.json({ error: "Note or share link not found" }, { status: 404 });
  }

  if (note.ownerId !== session.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.shareLink.update({
    where: { id: note.shareLink.id },
    data: { revoked: true },
  });

  return NextResponse.json({ success: true });
}
