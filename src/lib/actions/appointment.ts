"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext, requireRecipient } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { ApptStatus } from "@prisma/client";
import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");
const APPT_STATUSES = ["SCHEDULED", "DONE", "CANCELLED"] as const;

const appointmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  providerId: z.string().min(1).nullable().optional(),
  location: z.string().trim().max(300).optional(),
  attendeeId: z.string().min(1).nullable().optional(),
  notes: z.string().max(4000).optional(),
});

async function requireAppointment(id: string, circleId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id, recipient: { circleId } },
  });
  if (!appt) throw new AuthorizationError("Appointment not found in your circle");
  return appt;
}

async function validateProvider(providerId: string | null | undefined, recipientId: string) {
  if (!providerId) return;
  const provider = await prisma.provider.findFirst({
    where: { id: providerId, recipientId },
    select: { id: true },
  });
  if (!provider) throw new AuthorizationError("Provider is not for this recipient");
}

async function validateAttendee(attendeeId: string | null | undefined, circleId: string) {
  if (!attendeeId) return;
  const membership = await prisma.membership.findUnique({
    where: { userId_circleId: { userId: attendeeId, circleId } },
    select: { id: true },
  });
  if (!membership) throw new AuthorizationError("Attendee is not in your circle");
}

export async function getAppointments(recipientId: string) {
  const validId = idSchema.parse(recipientId);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validId, circleId);
  return prisma.appointment.findMany({
    where: { recipientId: validId },
    include: { provider: true, attendee: true },
    orderBy: { startsAt: "desc" },
  });
}

/** All upcoming appointments across the circle — for Today / Calendar timeline. */
export async function getUpcomingAppointments() {
  const { circleId } = await requireCircleContext();
  return prisma.appointment.findMany({
    where: { recipient: { circleId }, status: ApptStatus.SCHEDULED },
    include: { provider: true, attendee: true, recipient: true },
    orderBy: { startsAt: "asc" },
  });
}

export async function createAppointment(
  recipientId: string,
  data: z.input<typeof appointmentSchema>,
) {
  const validRecipientId = idSchema.parse(recipientId);
  const v = appointmentSchema.parse(data);
  const { circleId } = await requireCircleContext();
  await requireRecipient(validRecipientId, circleId);
  await validateProvider(v.providerId, validRecipientId);
  await validateAttendee(v.attendeeId, circleId);

  const appt = await prisma.appointment.create({
    data: {
      recipientId: validRecipientId,
      title: v.title,
      startsAt: new Date(v.startsAt),
      providerId: v.providerId ?? null,
      location: v.location || null,
      attendeeId: v.attendeeId ?? null,
      notes: v.notes || null,
    },
  });

  revalidatePath("/parents");
  revalidatePath("/dashboard");
  return appt;
}

export async function updateAppointment(
  id: string,
  data: Partial<z.input<typeof appointmentSchema>> & { status?: (typeof APPT_STATUSES)[number] },
) {
  const validId = idSchema.parse(id);
  const v = appointmentSchema.partial().extend({ status: z.enum(APPT_STATUSES).optional() }).parse(data);
  const { circleId } = await requireCircleContext();
  const existing = await requireAppointment(validId, circleId);
  await validateProvider(v.providerId, existing.recipientId);
  await validateAttendee(v.attendeeId, circleId);

  const appt = await prisma.appointment.update({
    where: { id: validId },
    data: {
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.startsAt !== undefined ? { startsAt: new Date(v.startsAt) } : {}),
      ...(v.providerId !== undefined ? { providerId: v.providerId ?? null } : {}),
      ...(v.location !== undefined ? { location: v.location || null } : {}),
      ...(v.attendeeId !== undefined ? { attendeeId: v.attendeeId ?? null } : {}),
      ...(v.notes !== undefined ? { notes: v.notes || null } : {}),
      ...(v.status !== undefined ? { status: v.status } : {}),
    },
  });

  revalidatePath("/parents");
  revalidatePath("/dashboard");
  return appt;
}

/** After the visit: record how it went and mark done (§6.4 outcome prompt). */
export async function recordAppointmentOutcome(id: string, outcome: string) {
  const validId = idSchema.parse(id);
  const validOutcome = z.string().max(4000).parse(outcome);
  const { circleId } = await requireCircleContext();
  await requireAppointment(validId, circleId);

  const appt = await prisma.appointment.update({
    where: { id: validId },
    data: { outcome: validOutcome || null, status: ApptStatus.DONE },
  });

  revalidatePath("/parents");
  revalidatePath("/dashboard");
  return appt;
}

export async function deleteAppointment(id: string) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireAppointment(validId, circleId);
  await prisma.appointment.delete({ where: { id: validId } });
  revalidatePath("/parents");
  revalidatePath("/dashboard");
}
