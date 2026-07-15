"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInvite } from "@/lib/actions/circle";

export function FamilyInvite() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const { url } = await createInvite();
      setUrl(url);
      // Prefer the native share sheet on mobile (§7.2: invite in 3 taps).
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "Join our Keeper circle", url });
        } catch {
          /* user dismissed the share sheet — link is still shown below */
        }
      }
    } catch {
      toast.error("Couldn't create an invite link");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Invite someone</h2>
      <div className="rounded-lg border p-3">
        <p className="mb-3 text-sm text-muted-foreground">
          Share a one-time link so a sibling can join this circle. Links expire in 7 days.
        </p>
        {!url ? (
          <Button onClick={generate} disabled={loading}>
            <UserPlus className="mr-1 h-4 w-4" /> {loading ? "Creating…" : "Create invite link"}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              className="min-w-0 flex-1 rounded-md border bg-muted px-2 py-1.5 font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button size="icon" variant="outline" onClick={copy} aria-label="Copy link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
