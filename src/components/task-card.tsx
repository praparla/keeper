"use client";

import { useState, useRef, useCallback } from "react";
import { Task, User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { assignTaskToMe, resolveTask } from "@/lib/actions/tasks";
import { MemberAvatar } from "@/components/member-avatar";
import { toast } from "sonner";
import { UserCheck, Check, Calendar, Pencil } from "lucide-react";

type TaskWithRelations = Task & {
  assignee: Pick<User, "id" | "name" | "email" | "image" | "color"> | null;
  creator: Pick<User, "id" | "name" | "email" | "image" | "color"> | null;
};

const typeBadgeVariant: Record<string, "medical" | "household" | "errand" | "note"> = {
  Medical: "medical",
  Household: "household",
  Errand: "errand",
  Note: "note",
};

const SWIPE_THRESHOLD = 80;

export function TaskCard({
  task,
  showActions = true,
}: {
  task: TaskWithRelations;
  showActions?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef(false);
  const acting = useRef(false);

  const canSwipe = showActions && task.status !== "Resolved";
  const swipeAction = !task.assigneeId ? "assign" : "resolve";

  async function handleAssign() {
    const updated = await assignTaskToMe(task.id);
    toast.success(
      `${(updated.assignee as { name: string | null })?.name ?? "You"} is on it!`
    );
  }

  async function handleResolve() {
    await resolveTask(task.id);
    toast.success("Task resolved!");
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canSwipe) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = false;
    setSwiping(true);
  }, [canSwipe]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Lock direction on first significant movement
    if (!locked.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      locked.current = true;
      // If more vertical than horizontal, abort swipe
      if (Math.abs(dy) > Math.abs(dx)) {
        setSwiping(false);
        setSwipeX(0);
        return;
      }
    }

    // Only allow right swipe (positive dx), clamp to max 120px
    const clamped = Math.max(0, Math.min(dx, 120));
    setSwipeX(clamped);
  }, [swiping]);

  const onTouchEnd = useCallback(async () => {
    if (!swiping) return;
    if (swipeX >= SWIPE_THRESHOLD && !acting.current) {
      acting.current = true;
      try {
        if (swipeAction === "assign") {
          await handleAssign();
        } else {
          await handleResolve();
        }
      } finally {
        acting.current = false;
      }
    }
    setSwipeX(0);
    setSwiping(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swiping, swipeX, swipeAction]);

  const swipeProgress = Math.min(swipeX / SWIPE_THRESHOLD, 1);

  return (
    <>
      <div className="relative mb-3 overflow-hidden rounded-lg">
        {/* Swipe background indicator */}
        {canSwipe && swipeX > 0 && (
          <div
            className="absolute inset-0 flex items-center pl-4 rounded-lg"
            style={{
              backgroundColor: swipeAction === "resolve"
                ? `oklch(0.8 0.15 155 / ${swipeProgress * 0.8})`
                : `oklch(0.8 0.1 195 / ${swipeProgress * 0.8})`,
            }}
          >
            {swipeAction === "resolve" ? (
              <Check className="h-5 w-5 text-white" style={{ opacity: swipeProgress }} />
            ) : (
              <UserCheck className="h-5 w-5 text-white" style={{ opacity: swipeProgress }} />
            )}
            <span
              className="ml-2 text-xs font-medium text-white"
              style={{ opacity: swipeProgress }}
            >
              {swipeAction === "resolve" ? "Resolve" : "Assign to Me"}
            </span>
          </div>
        )}

        <Card
          className="relative transition-none mb-0"
          style={{
            transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
            transition: swiping ? "none" : "transform 200ms ease-out",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium leading-snug">
                {task.title}
              </CardTitle>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <Badge variant={typeBadgeVariant[task.type] ?? "note"}>
                {task.type}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {task.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              {task.assignee && (
                <span className="flex items-center gap-1">
                  <MemberAvatar name={task.assignee.name} color={task.assignee.color} size="sm" />
                  {task.assignee.name ?? "Assigned"}
                </span>
              )}
            </div>

            {showActions && task.status !== "Resolved" && (
              <div className="flex gap-2 mt-3">
                {!task.assigneeId && (
                  <Button size="sm" variant="outline" onClick={handleAssign}>
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Assign to Me
                  </Button>
                )}
                {task.assigneeId && (
                  <Button size="sm" variant="outline" onClick={handleResolve}>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EditTaskDialog task={task} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
