"use client";

import { useEffect, useState, use as usePromise } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type NoteData = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  shareLink: {
    url: string;
    shareType: "ONE_TIME" | "TIME_BASED";
    accessType: "PUBLIC" | "PASSWORD";
    used: boolean;
    revoked: boolean;
    expiresAt: string | null;
    viewCount: number;
  } | null;
};

function linkStatus(link: NoteData["shareLink"]) {
  if (!link) return { label: "No link", variant: "outline" as const };
  if (link.revoked) return { label: "Revoked", variant: "destructive" as const };
  if (link.shareType === "ONE_TIME" && link.used) {
    return { label: "Used (expired)", variant: "secondary" as const };
  }
  if (link.shareType === "TIME_BASED" && link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { label: "Expired", variant: "secondary" as const };
  }
  return { label: "Active", variant: "success" as const };
}

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [note, setNote] = useState<NoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch(`/api/notes/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load note");
      return;
    }
    setNote(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRevoke() {
    if (!confirm("Revoke this share link? Anyone with the link will lose access immediately.")) {
      return;
    }
    setRevoking(true);
    await fetch(`/api/notes/${id}/revoke`, { method: "POST" });
    setRevoking(false);
    load(); // refresh status after revoking
  }

  function copyLink() {
    if (!note?.shareLink) return;
    navigator.clipboard.writeText(note.shareLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return <p className="mx-auto max-w-lg px-4 py-12 text-red-600">{error}</p>;
  }

  if (!note) {
    return <p className="mx-auto max-w-lg px-4 py-12 text-neutral-500">Loading...</p>;
  }

  const status = linkStatus(note.shareLink);
  const canRevoke = note.shareLink && !note.shareLink.revoked && status.label !== "Used (expired)" && status.label !== "Expired";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{note.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="whitespace-pre-wrap text-neutral-700">{note.content}</p>

          {note.shareLink && (
            <div className="flex flex-col gap-3 rounded-md border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Badge variant="outline">
                  {note.shareLink.shareType === "ONE_TIME" ? "One-time" : "Time-based"}
                </Badge>
                <Badge variant="outline">
                  {note.shareLink.accessType === "PUBLIC" ? "Public" : "Password protected"}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-neutral-100 px-2 py-1 text-xs">
                  {note.shareLink.url}
                </code>
                <Button size="sm" variant="outline" onClick={copyLink}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              <p className="text-sm text-neutral-600">
                👁 <strong>{note.shareLink.viewCount}</strong> successful view
                {note.shareLink.viewCount === 1 ? "" : "s"}
              </p>

              {note.shareLink.expiresAt && (
                <p className="text-xs text-neutral-500">
                  Expires: {new Date(note.shareLink.expiresAt).toLocaleString()}
                </p>
              )}

              {canRevoke && (
                <Button variant="destructive" size="sm" onClick={handleRevoke} disabled={revoking}>
                  {revoking ? "Revoking..." : "Revoke Link"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
