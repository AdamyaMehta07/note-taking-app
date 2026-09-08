"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = still loading

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setEmail(data.user?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="border-b border-neutral-200 bg-black text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold">
          Note<span className="text-orange-500">Share</span>
        </Link>

        <nav className="flex items-center gap-3">
          {email === undefined ? null : email ? (
            <>
              <span className="hidden text-sm text-neutral-300 sm:inline">{email}</span>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  // A plain <Link> here would do nothing if we're already on
                  // /notes/new (Next.js skips navigating to the current
                  // route). A hard navigation always works, from any page.
                  window.location.href = "/notes/new";
                }}
              >
                New Note
              </Button>
              <Button variant="outline" size="sm" className="bg-transparent text-white hover:bg-neutral-800" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm" className="bg-transparent text-white hover:bg-neutral-800">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="accent" size="sm">
                  Register
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
