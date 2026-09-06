import { customAlphabet } from "nanoid";

// URL-safe, long enough (21 chars) that guessing a valid token by brute force
// is computationally infeasible - this is the string that goes in /share/[token].
const tokenAlphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generateToken = customAlphabet(tokenAlphabet, 21);

export function createShareToken(): string {
  return generateToken();
}

// Access key shown to the note owner for password-protected links. Kept
// shorter (10 chars) since a human has to type or share this one - but we
// deliberately exclude visually-confusing characters (0/O, 1/l/I) so it's
// easy to read and copy correctly.
const keyAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const generateKey = customAlphabet(keyAlphabet, 10);

export function createAccessKey(): string {
  return generateKey();
}
