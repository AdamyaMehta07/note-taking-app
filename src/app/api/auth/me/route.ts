import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: { email: session.email } });
}
