import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { createShareToken, createAccessKey } from "@/lib/tokens";

const createNoteSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    content: z.string().min(1, "Content is required"),
    shareType: z.enum(["ONE_TIME", "TIME_BASED"]),
    accessType: z.enum(["PUBLIC", "PASSWORD"]),
    // Required only when shareType is TIME_BASED - validated below since
    // zod's base schema can't easily express "required if sibling field is X".
    expiresAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => data.shareType !== "TIME_BASED" || !!data.expiresAt,
    { message: "expiresAt is required for time-based links", path: ["expiresAt"] }
  )
  .refine(
    (data) =>
      data.shareType !== "TIME_BASED" ||
      !data.expiresAt ||
      new Date(data.expiresAt).getTime() > Date.now(),
    { message: "expiresAt must be in the future", path: ["expiresAt"] }
  );

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, content, shareType, accessType, expiresAt } = parsed.data;

  // Only generate a plaintext access key for PASSWORD-protected links. We
  // return this plaintext key ONCE in this response - after this, only its
  // bcrypt hash is stored, so nobody (including us, including the database
  // owner) can recover the original key later. This mirrors how services
  // like GitHub show a personal access token exactly once at creation.
  let plainAccessKey: string | null = null;
  let passwordHash: string | null = null;
  if (accessType === "PASSWORD") {
    plainAccessKey = createAccessKey();
    passwordHash = await hashPassword(plainAccessKey);
  }

  const note = await prisma.note.create({
    data: {
      title,
      content,
      ownerId: session.userId,
      shareLink: {
        create: {
          token: createShareToken(),
          shareType,
          accessType,
          passwordHash,
          expiresAt: shareType === "TIME_BASED" && expiresAt ? new Date(expiresAt) : null,
        },
      },
    },
    include: { shareLink: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    note: { id: note.id, title: note.title },
    shareLink: {
      url: `${appUrl}/share/${note.shareLink!.token}`,
      accessType,
      shareType,
      // Only present once, only for password-protected links. The frontend
      // must show this to the user immediately and warn it won't be shown again.
      accessKey: plainAccessKey,
    },
  });
}
