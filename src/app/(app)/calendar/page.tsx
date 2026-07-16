import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { formatAlmanacDate, formatAlmanacDateTime } from "@/lib/constants";
import { CalendarClock, ListTodo } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Calendar (M1): a unified upcoming timeline of tasks (with due dates) and
 * appointments — no dual-write of a shadow task. The full week-strip view is M2.
 */
export default async function CalendarPage() {
  const { circleId } = await requireCircleContext();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [tasks, appointments] = await Promise.all([
    prisma.task.findMany({
      where: { circleId, status: { not: "Resolved" }, dueDate: { not: null } },
      include: { recipient: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.appointment.findMany({
      where: { recipient: { circleId }, status: "SCHEDULED" },
      include: { recipient: { select: { name: true } }, provider: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  type Item = { id: string; when: Date; kind: "task" | "appt"; title: string; sub: string; overdue: boolean };
  const items: Item[] = [
    ...tasks.map((t) => ({
      id: `t-${t.id}`,
      when: t.dueDate as Date,
      kind: "task" as const,
      title: t.title,
      sub: [t.recipient?.name, t.assignee?.name && `${t.assignee.name} on it`].filter(Boolean).join(" · "),
      overdue: (t.dueDate as Date) < startOfToday,
    })),
    ...appointments.map((a) => ({
      id: `a-${a.id}`,
      when: a.startsAt,
      kind: "appt" as const,
      title: a.title,
      sub: [a.recipient.name, a.provider?.name].filter(Boolean).join(" · "),
      overdue: false,
    })),
  ].sort((x, y) => x.when.getTime() - y.when.getTime());

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Calendar</h1>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nothing scheduled. Tasks with due dates and appointments show up here.
        </p>
      )}
      <div className="notebook-list rounded-lg border">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-3">
            <div className="mt-0.5 text-muted-foreground">
              {item.kind === "appt" ? <CalendarClock className="h-4 w-4" strokeWidth={1.5} /> : <ListTodo className="h-4 w-4" strokeWidth={1.5} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.title}</p>
              {item.sub && <p className="text-sm text-muted-foreground">{item.sub}</p>}
            </div>
            <div className={item.overdue ? "text-sm font-medium text-accent-urgent" : "text-sm text-muted-foreground"}>
              {item.kind === "appt" ? formatAlmanacDateTime(item.when) : formatAlmanacDate(item.when)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
