"use client";

import { useState } from "react";
import { Plus, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { TaskType } from "@prisma/client";
import { cn } from "@/lib/utils";

export interface RecipientChip {
  id: string;
  label: string;
}

export function QuickAddFab({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  recipients = [],
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  recipients?: RecipientChip[];
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("Note");
  const [dueDate, setDueDate] = useState("");
  const [recipientId, setRecipientId] = useState<string>("");
  const [priority, setPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setType("Note");
    setDueDate("");
    setRecipientId("");
    setPriority(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        dueDate: dueDate || undefined,
        recipientId: recipientId || null,
        priority,
      });
      toast.success("Task added!");
      reset();
      setOpen(false);
    } catch {
      toast.error("Failed to add task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Add task"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add</DialogTitle>
            <DialogDescription>
              Only title is required. Keep it fast.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-accent-urgent">*</span>
              </Label>
              <Input
                id="title"
                placeholder="What needs doing?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Parent chip — one extra tap, never required (§6.3). */}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipients.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRecipientId((cur) => (cur === r.id ? "" : r.id))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      recipientId === r.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Note">Note</SelectItem>
                    <SelectItem value="Medical">Medical</SelectItem>
                    <SelectItem value="Household">Household</SelectItem>
                    <SelectItem value="Errand">Errand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                type="button"
                onClick={() => setPriority((p) => !p)}
                aria-pressed={priority}
                className={cn(
                  "mt-6 flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  priority ? "border-accent-urgent text-accent-urgent" : "border-border text-muted-foreground",
                )}
              >
                <Flag className="h-4 w-4" strokeWidth={1.5} /> Urgent
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                placeholder="Any extra details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Adding..." : "Add Task"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
