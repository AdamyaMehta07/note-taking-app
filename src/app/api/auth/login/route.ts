import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message whether the email doesn't exist or the password is
  // wrong - this stops an attacker from using the login form to figure out
  // which emails have accounts on the site (user enumeration).
  const invalidMsg = { error: "Invalid email or password" };

  if (!user) {
    return NextResponse.json(invalidMsg, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return NextResponse.json(invalidMsg, { status: 401 });
  }

  const token = await createSessionToken({ userId: user.id, email: user.email });

  const res = NextResponse.json({ id: user.id, name: user.name, email: user.email });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
