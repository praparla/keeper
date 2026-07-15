import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { isRefillDue, refillRunOutDate } from "@/lib/refills";
import { ParentsClient } from "./parents-client";
import type { RecipientDTO, MemberDTO } from "@/types/parents";

export const dynamic = "force-dynamic";

export default async function ParentsPage() {
  const { circleId } = await requireCircleContext();
  const now = new Date();

  const [recipients, memberships] = await Promise.all([
    prisma.careRecipient.findMany({
      where: { circleId },
      orderBy: { createdAt: "asc" },
      include: {
        facts: { orderBy: { key: "asc" } },
        providers: { orderBy: { name: "asc" } },
        conditions: { orderBy: [{ active: "desc" }, { name: "asc" }] },
        medications: {
          include: { prescriber: { select: { name: true } } },
          orderBy: [{ active: "desc" }, { name: "asc" }],
        },
        appointments: {
          include: { provider: { select: { name: true } }, attendee: { select: { name: true } } },
          orderBy: { startsAt: "desc" },
        },
        vitalInfo: { orderBy: { category: "asc" } },
      },
    }),
    prisma.membership.findMany({
      where: { circleId },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const members: MemberDTO[] = memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    color: m.user.color,
  }));

  const dto: RecipientDTO[] = recipients.map((r) => ({
    id: r.id,
    name: r.name,
    relationship: r.relationship,
    birthYear: r.birthYear,
    zip: r.zip,
    residenceType: r.residenceType,
    timezone: r.timezone,
    providers: r.providers.map((p) => ({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      phone: p.phone,
      address: p.address,
      notes: p.notes,
    })),
    conditions: r.conditions.map((c) => ({ id: c.id, name: c.name, notes: c.notes, active: c.active })),
    medications: r.medications.map((m) => ({
      id: m.id,
      name: m.name,
      dose: m.dose,
      schedule: m.schedule,
      pharmacy: m.pharmacy,
      prescriberId: m.prescriberId,
      prescriberName: m.prescriber?.name ?? null,
      refillIntervalDays: m.refillIntervalDays,
      lastFilledAt: m.lastFilledAt?.toISOString() ?? null,
      defaultAssigneeId: m.defaultAssigneeId,
      active: m.active,
      notes: m.notes,
      runOutAt: refillRunOutDate(m)?.toISOString() ?? null,
      refillDue: isRefillDue(m, now),
    })),
    appointments: r.appointments.map((a) => ({
      id: a.id,
      title: a.title,
      startsAt: a.startsAt.toISOString(),
      providerId: a.providerId,
      providerName: a.provider?.name ?? null,
      location: a.location,
      attendeeId: a.attendeeId,
      attendeeName: a.attendee?.name ?? null,
      notes: a.notes,
      outcome: a.outcome,
      status: a.status,
    })),
    facts: r.facts.map((f) => ({ key: f.key, value: f.value, source: f.source })),
    vitalInfo: r.vitalInfo.map((v) => ({ id: v.id, category: v.category, content: v.content })),
  }));

  return <ParentsClient recipients={dto} members={members} />;
}
