import { Task, User } from "@prisma/client";

/**
 * Notification skeleton — logs to console for MVP.
 * Replace with Resend (email) and Twilio (SMS) in production.
 */
export function sendTaskReminder(task: Task, user: User): void {
  if (user.emailReminders && user.email) {
    console.log(
      `[Notification] Simulating EMAIL to ${user.email}: Reminder for task "${task.title}"`
    );
  }

  if (user.smsReminders && user.phoneNumber) {
    console.log(
      `[Notification] Simulating SMS to ${user.phoneNumber}: Reminder for task "${task.title}"`
    );
  }

  if (!user.email && !user.phoneNumber) {
    console.log(
      `[Notification] No contact info for user ${user.name ?? user.id}, skipping reminder for "${task.title}"`
    );
  }
}
