"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ShareType = "ONE_TIME" | "TIME_BASED";
type AccessType = "PUBLIC" | "PASSWORD";

type CreatedResult = {
  note: { id: string; title: string };
  shareLink: {
    url: string;
    accessType: AccessType;
    shareType: ShareType;
    accessKey: string | null;
  };
};

// Native select, styled to match the rest of the shadcn-style inputs -
// keeps this file self-contained instead of pulling in a full Radix Select.
function SimpleSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
    >
      {children}
    </select>
  );
}

export default function NewNotePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shareType, setShareType] = useState<ShareType>("ONE_TIME");
  const [accessType, setAccessType] = useState<AccessType>("PUBLIC");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreatedResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const body: Record<string, unknown> = { title, content, shareType, accessType };
    if (shareType === "TIME_BASED") {
      if (!expiresAt) {
        setError("Pick an expiry date/time for a time-based link.");
        setLoading(false);
        return;
      }
      body.expiresAt = new Date(expiresAt).toISOString();
    }

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    setResult(data);
  }

  function startNewNote() {
    // We don't navigate here on purpose. We're already on /notes/new, and
    // Next.js treats a Link to the current route as a no-op - nothing would
    // happen if we used <Link href="/notes/new">. Resetting state locally
    // works regardless of what route we're on.
    setResult(null);
    setTitle("");
    setContent("");
    setShareType("ONE_TIME");
    setAccessType("PUBLIC");
    setExpiresAt("");
    setError(null);
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.shareLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // After a successful create, show the link/key instead of the form -
  // the access key only exists in this response, ever, so this is the
  // one and only chance to show it to the user.
  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Note created 🎉</CardTitle>
            <CardDescription>Here is your share link.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{result.shareLink.shareType === "ONE_TIME" ? "One-time" : "Time-based"}</Badge>
              <Badge variant="secondary">
                {result.shareLink.accessType === "PUBLIC" ? "Public" : "Password protected"}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Share link</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.shareLink.url} />
                <Button type="button" variant="outline" onClick={copyLink}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {result.shareLink.accessKey && (
              <div className="flex flex-col gap-1.5 rounded-md border border-orange-300 bg-orange-50 p-3">
                <Label>Access key</Label>
                <p className="font-mono text-lg font-semibold tracking-wider">
                  {result.shareLink.accessKey}
                </p>
                <p className="text-xs text-neutral-600">
                  ⚠️ This is shown only once. Save it now - whoever opens the
                  link will need it to view the note.
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Link href={`/notes/${result.note.id}`} className="flex-1">
                <Button className="w-full" variant="accent">
                  View Note Details
                </Button>
              </Link>
              <Button className="flex-1" variant="outline" onClick={startNewNote}>
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create a new note</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Share type</Label>
              <SimpleSelect value={shareType} onChange={(v) => setShareType(v as ShareType)}>
                <option value="ONE_TIME">One-time access (expires after first view)</option>
                <option value="TIME_BASED">Time-based (expires at a chosen date/time)</option>
              </SimpleSelect>
            </div>

            {shareType === "TIME_BASED" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expiresAt">Expiry date/time</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label>Access type</Label>
              <SimpleSelect value={accessType} onChange={(v) => setAccessType(v as AccessType)}>
                <option value="PUBLIC">Public (no password needed)</option>
                <option value="PASSWORD">Password protected (auto-generated key)</option>
              </SimpleSelect>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" variant="accent" disabled={loading}>
              {loading ? "Creating..." : "Create Note & Generate Link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
