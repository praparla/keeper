"use client";

import { useState } from "react";
import { Task, User } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import { QuickAddFab } from "@/components/quick-add-fab";
import { EmptyState } from "@/components/empty-state";
import { Download, Inbox, ClipboardList, CheckCircle2 } from "lucide-react";

type TaskWithRelations = Task & {
  assignee: Pick<User, "id" | "name" | "email" | "image" | "color"> | null;
  creator: Pick<User, "id" | "name" | "email" | "image" | "color"> | null;
};

export function DashboardClient({
  unassigned,
  myTasks,
  resolved,
  userName,
}: {
  unassigned: TaskWithRelations[];
  myTasks: TaskWithRelations[];
  resolved: TaskWithRelations[];
  userName: string;
}) {
  const [fabOpen, setFabOpen] = useState(false);

  function handleExportCSV() {
    window.open("/api/export/medical-csv", "_blank");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">
            {userName ? `Hey, ${userName.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground">Family triage board</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-1" />
          Doctor&apos;s Brief
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Unassigned Needs
            </h2>
            {unassigned.length === 0 ? (
              <EmptyState
                icon={Inbox}
                message="All caught up! No unassigned tasks."
                actionLabel="Add a task"
                onAction={() => setFabOpen(true)}
              />
            ) : (
              unassigned.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              My Upcoming Tasks
            </h2>
            {myTasks.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                message="Nothing assigned to you yet. Grab a task from the board above."
              />
            ) : (
              myTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </section>
        </TabsContent>

        <TabsContent value="history">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Resolved
            </h2>
            {resolved.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                message="Complete a task to see it here."
              />
            ) : (
              resolved.map((task) => (
                <TaskCard key={task.id} task={task} showActions={false} />
              ))
            )}
          </section>
        </TabsContent>
      </Tabs>

      <QuickAddFab open={fabOpen} onOpenChange={setFabOpen} />
    </div>
  );
}
