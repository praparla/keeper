"use client";

import { useState, useEffect } from "react";
import { Task, User, TaskType, TaskStatus } from "@prisma/client";
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
import { updateTask, deleteTask } from "@/lib/actions/tasks";
import { toast } from "sonner";

type TaskWithRelations = Task & {
  assignee: Pick<User, "id" | "name" | "email" | "image"> | null;
  creator: Pick<User, "id" | "name" | "email" | "image"> | null;
};

function formatDateForInput(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
}: {
  task: TaskWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [type, setType] = useState<TaskType>(task.type);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [submitting, setSubmitting] = useState(false);

  // Sync state when a different task is opened
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setType(task.type);
    setStatus(task.status);
    setDueDate(formatDateForInput(task.dueDate));
  }, [task.id, task.title, task.description, task.type, task.status, task.dueDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || "",
        type,
        status,
        dueDate: dueDate || null,
      });
      toast.success("Task updated!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;

    setSubmitting(true);
    try {
      await deleteTask(task.id);
      toast.success("Task deleted");
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update or remove this task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="InProgress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-dueDate">Due Date</Label>
            <Input
              id="edit-dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Notes</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              Delete
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
