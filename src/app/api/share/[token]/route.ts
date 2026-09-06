import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const link = await prisma.shareLink.findUnique({ where: { token } });

  if (!link) {
    return NextResponse.json({ status: "NOT_FOUND" }, { status: 404 });
  }

  if (link.revoked) {
    return NextResponse.json({ status: "REVOKED", accessType: link.accessType });
  }

  if (link.shareType === "ONE_TIME" && link.used) {
    return NextResponse.json({ status: "ALREADY_USED", accessType: link.accessType });
  }

  if (link.shareType === "TIME_BASED" && link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ status: "EXPIRED", accessType: link.accessType });
  }

  return NextResponse.json({
    status: "VALID",
    accessType: link.accessType,
    shareType: link.shareType,
  });
}
