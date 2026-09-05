import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export const SESSION_COOKIE_NAME = "session_token";

export type SessionPayload = {
  userId: string;
  email: string;
};

// Called on successful login/register. Produces a signed token that goes
// into an httpOnly cookie - the browser can't read it via JS, only send it.
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

// Called on every request to a protected route to check who's logged in.
// Returns null instead of throwing if the token is missing/expired/tampered,
// so callers can just check `if (!session)` and redirect.
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

// Convenience helper for Server Components and route handlers: reads the
// session cookie for the current request and verifies it in one call.
export async function getCurrentSession(): Promise<SessionPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
