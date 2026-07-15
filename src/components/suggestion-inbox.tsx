"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Sprout, Check, SlidersHorizontal, Clock, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatAlmanacDate } from "@/lib/constants";
import {
  acceptSuggestion, snoozeSuggestion, dismissSuggestion, refreshSuggestions,
} from "@/lib/actions/suggestion";

export interface SuggestionDTO {
  id: string;
  title: string;
  reason: string;
  recipientName: string | null;
  windowStart: string;
  windowEnd: string | null;
}

export interface MemberOption {
  id: string;
  name: string | null;
}

const DISMISS_OPTIONS = [
  { reason: "NOT_APPLICABLE" as const, label: "Not applicable", hint: "They don't have this — stop suggesting it" },
  { reason: "SELF_HANDLED" as const, label: "They handle it", hint: "Already covered — just this one" },
  { reason: "NOT_NOW" as const, label: "Not now", hint: "Skip this time; ask again next cycle" },
];

export function SuggestionInbox({
  suggestions,
  members,
  limit = 5,
  showRefresh = true,
}: {
  suggestions: SuggestionDTO[];
  members: MemberOption[];
  limit?: number;
  showRefresh?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<SuggestionDTO | null>(null);
  const [dismissing, setDismissing] = useState<SuggestionDTO | null>(null);

  const visible = suggestions.slice(0, limit);
  const overflow = suggestions.length - visible.length;

  async function act(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function refresh() {
    setBusy("refresh");
    try {
      const counts = await refreshSuggestions();
      toast.success(counts.created ? `${counts.created} new suggestion${counts.created === 1 ? "" : "s"}` : "Up to date");
      router.refresh();
    } catch {
      toast.error("Couldn't refresh");
    } finally {
      setBusy(null);
    }
  }

  if (suggestions.length === 0) {
    return showRefresh ? (
      <div className="mb-6 flex items-center justify-between rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        <span>No suggestions right now — Keeper is watching the calendar.</span>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={busy === "refresh"}>
          <RefreshCw className={cn("h-3.5 w-3.5", busy === "refresh" && "animate-spin")} />
        </Button>
      </div>
    ) : null;
  }

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Sprout className="h-4 w-4 text-accent-suggest" strokeWidth={1.5} />
          Keeper suggests
          <span className="rounded-full bg-accent-suggest/20 px-2 py-0.5 text-xs font-medium text-accent-suggest-foreground">
            {suggestions.length}
          </span>
        </h2>
        {showRefresh && (
          <Button size="sm" variant="ghost" onClick={refresh} disabled={busy === "refresh"} aria-label="Refresh suggestions">
            <RefreshCw className={cn("h-3.5 w-3.5", busy === "refresh" && "animate-spin")} />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.id} className="rounded-lg border border-accent-suggest/40 bg-accent-suggest/[0.06] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {s.title}
                  {s.recipientName && <span className="text-muted-foreground"> · {s.recipientName}</span>}
                </p>
                <p className="almanac-line mt-0.5 text-sm">{s.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatAlmanacDate(s.windowStart)}
                  {s.windowEnd && ` – ${formatAlmanacDate(s.windowEnd)}`}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={busy === s.id}
                onClick={() => act(s.id, () => acceptSuggestion(s.id), "Added to your tasks")}>
                <Check className="mr-1 h-3.5 w-3.5" /> Accept
              </Button>
              <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => setAdjusting(s)}>
                <SlidersHorizontal className="mr-1 h-3.5 w-3.5" /> Adjust
              </Button>
              <Button size="sm" variant="ghost" disabled={busy === s.id}
                onClick={() => act(s.id, () => snoozeSuggestion(s.id), "Snoozed for 2 weeks")}>
                <Clock className="mr-1 h-3.5 w-3.5" /> Snooze
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={busy === s.id}
                onClick={() => setDismissing(s)}>
                <X className="mr-1 h-3.5 w-3.5" /> Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>

      {overflow > 0 && (
        <Link href="/suggestions" className="mt-2 inline-block text-sm text-primary underline-offset-2 hover:underline">
          {overflow} more suggestion{overflow === 1 ? "" : "s"} + season preview →
        </Link>
      )}

      {adjusting && (
        <AdjustDialog
          suggestion={adjusting}
          members={members}
          onClose={() => setAdjusting(null)}
          onDone={() => { setAdjusting(null); router.refresh(); }}
        />
      )}
      {dismissing && (
        <Dialog open onOpenChange={(o) => !o && setDismissing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dismiss “{dismissing.title}”?</DialogTitle>
              <DialogDescription>Tell Keeper why, so it learns.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {DISMISS_OPTIONS.map((o) => (
                <button
                  key={o.reason}
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    const id = dismissing.id;
                    setDismissing(null);
                    act(id, () => dismissSuggestion(id, o.reason), "Got it — Keeper learned from that");
                  }}
                >
                  <p className="font-medium">{o.label}</p>
                  <p className="text-sm text-muted-foreground">{o.hint}</p>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function AdjustDialog({
  suggestion, members, onClose, onDone,
}: {
  suggestion: SuggestionDTO;
  members: MemberOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await acceptSuggestion(suggestion.id, {
        dueDate: (fd.get("dueDate") as string) || null,
        assigneeId: (fd.get("assigneeId") as string) || null,
      });
      toast.success("Added to your tasks");
      onDone();
    } catch {
      toast.error("Couldn't accept");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust before accepting</DialogTitle>
          <DialogDescription className="almanac-line not-italic">{suggestion.reason}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due date</Label>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={suggestion.windowStart.slice(0, 10)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assigneeId">Assign to</Label>
            <select
              id="assigneeId"
              name="assigneeId"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? "Member"}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Accept task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
