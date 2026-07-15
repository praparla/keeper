import { Task, User } from "@prisma/client";

export function sendTaskReminder(task: Task, user: User): void {
  if (user.digestEmail && user.email) {
    console.log(`[Notification] Simulating EMAIL to ${user.email}: Reminder for task "${task.title}"`);
    return;
  }

  console.log(`[Notification] Email disabled for user ${user.id}; skipped "${task.title}"`);
}
