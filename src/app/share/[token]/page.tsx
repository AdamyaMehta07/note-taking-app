"use client";

import { useEffect, useState, use as usePromise } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Status = "LOADING" | "NEEDS_PASSWORD" | "REVEALED" | "ERROR";

const STATUS_MESSAGES: Record<string, string> = {
  NOT_FOUND: "This share link doesn't exist. Double-check the URL.",
  REVOKED: "This link has been revoked by its owner and is no longer available.",
  ALREADY_USED: "This one-time link has already been used and cannot be viewed again.",
  EXPIRED: "This link has expired.",
};

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = usePromise(params);

  const [status, setStatus] = useState<Status>("LOADING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<{ title: string; content: string } | null>(null);

  // Step 1: check the link's status without consuming it. This is safe to
  // run on every page load/refresh because the GET route never writes to
  // the database (see api/share/[token]/route.ts).
  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "VALID") {
          if (data.accessType === "PASSWORD") {
            setStatus("NEEDS_PASSWORD");
          } else {
            // Public link - go ahead and consume/reveal it immediately.
            reveal();
          }
        } else {
          setErrorMessage(STATUS_MESSAGES[data.status] ?? "This link is not available.");
          setStatus("ERROR");
        }
      })
      .catch(() => {
        setErrorMessage("Something went wrong checking this link.");
        setStatus("ERROR");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Step 2: the actual view/unlock action - this is the one that counts as
  // a view and consumes a one-time link (see api/share/[token]/view/route.ts).
  async function reveal(pw?: string) {
    setSubmitting(true);
    setErrorMessage(null);

    const res = await fetch(`/api/share/${token}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pw ? { password: pw } : {}),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      // Wrong password: stay on the password form so the user can retry.
      // Anything else (revoked/expired/already-used) becomes a final error.
      if (res.status === 401) {
        setErrorMessage(data.error ?? "Incorrect password.");
        setStatus("NEEDS_PASSWORD");
        return;
      }
      setErrorMessage(data.error ?? "This link is not available.");
      setStatus("ERROR");
      return;
    }

    setNote({ title: data.title, content: data.content });
    setStatus("REVEALED");
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    reveal(password);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col justify-center px-4 py-16">
      {status === "LOADING" && <p className="text-center text-neutral-500">Checking link...</p>}

      {status === "ERROR" && (
        <Card>
          <CardHeader>
            <CardTitle>Link unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {status === "NEEDS_PASSWORD" && (
        <Card>
          <CardHeader>
            <CardTitle>Password required</CardTitle>
            <CardDescription>This note is protected. Enter the access key to view it.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Access key</Label>
                <Input
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
              <Button type="submit" variant="accent" disabled={submitting}>
                {submitting ? "Checking..." : "Unlock"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {status === "REVEALED" && note && (
        <Card>
          <CardHeader>
            <CardTitle>{note.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-neutral-700">{note.content}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
