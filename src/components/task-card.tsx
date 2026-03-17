"use client";

import { Task, User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assignTaskToMe, resolveTask } from "@/lib/actions/tasks";
import { toast } from "sonner";
import { UserCheck, Check, Calendar } from "lucide-react";

type TaskWithRelations = Task & {
  assignee: Pick<User, "id" | "name" | "email" | "image"> | null;
  creator: Pick<User, "id" | "name" | "email" | "image"> | null;
};

const typeBadgeVariant: Record<string, "medical" | "household" | "errand" | "note"> = {
  Medical: "medical",
  Household: "household",
  Errand: "errand",
  Note: "note",
};

export function TaskCard({
  task,
  showActions = true,
}: {
  task: TaskWithRelations;
  showActions?: boolean;
}) {
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

  return (
    <Card className="mb-3">
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
        <Badge variant={typeBadgeVariant[task.type] ?? "note"} className="ml-2 shrink-0">
          {task.type}
        </Badge>
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
              <UserCheck className="h-3 w-3" />
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
  );
}
