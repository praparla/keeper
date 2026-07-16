"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Pill, CalendarClock, Stethoscope, Activity,
  NotebookText, BadgeInfo, CheckCircle2, Siren, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RESIDENCE_LABELS, formatAlmanacDate, formatAlmanacDateTime } from "@/lib/constants";
import { HOME_FACTS, HEALTH_FACTS, type FactValue } from "@/lib/facts";
import type {
  RecipientDTO, MemberDTO, MedicationDTO, AppointmentDTO, ProviderDTO, ConditionDTO,
} from "@/types/parents";
import {
  createRecipient, updateRecipient, deleteRecipient, setFact,
} from "@/lib/actions/recipient";
import {
  createProvider, updateProvider, deleteProvider,
} from "@/lib/actions/provider";
import {
  createCondition, updateCondition, deleteCondition,
} from "@/lib/actions/condition";
import {
  createMedication, updateMedication, markMedicationFilled, setMedicationActive, deleteMedication,
} from "@/lib/actions/medication";
import {
  createAppointment, updateAppointment, recordAppointmentOutcome, deleteAppointment,
} from "@/lib/actions/appointment";
import { upsertVitalInfo, deleteVitalInfo } from "@/lib/actions/vital-info";
import { refreshSuggestions } from "@/lib/actions/suggestion";

const SECTIONS = [
  { key: "meds", label: "Meds", icon: Pill },
  { key: "appts", label: "Appointments", icon: CalendarClock },
  { key: "providers", label: "Providers", icon: Stethoscope },
  { key: "conditions", label: "Conditions", icon: Activity },
  { key: "vital", label: "Vital info", icon: NotebookText },
  { key: "facts", label: "What Keeper knows", icon: BadgeInfo },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

function age(birthYear: number | null): string {
  if (!birthYear) return "";
  return `${new Date().getFullYear() - birthYear}`;
}

export function ParentsClient({
  recipients,
  members,
}: {
  recipients: RecipientDTO[];
  members: MemberDTO[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(recipients[0]?.id ?? "");
  const [section, setSection] = useState<SectionKey>("meds");
  const [addParentOpen, setAddParentOpen] = useState(false);
  const [erOpen, setErOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const selected = recipients.find((r) => r.id === selectedId) ?? recipients[0];

  if (recipients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl">Parents</h1>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No one added yet. Add the parent or loved one you&apos;re caring for.
          </p>
          <Button onClick={() => setAddParentOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add a parent
          </Button>
        </div>
        <RecipientFormDialog
          open={addParentOpen}
          onOpenChange={setAddParentOpen}
          onDone={() => router.refresh()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recipient switcher chips */}
      <div className="flex flex-wrap items-center gap-2">
        {recipients.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              r.id === selected?.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground",
            )}
          >
            {r.relationship || r.name}
          </button>
        ))}
        <button
          onClick={() => setAddParentOpen(true)}
          className="rounded-full border border-dashed px-3 py-1 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="mr-0.5 inline h-3.5 w-3.5" /> Add
        </button>
      </div>

      {selected && (
        <>
          {/* Recipient header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl leading-tight">{selected.name}</h1>
              <p className="text-sm text-muted-foreground">
                {[
                  selected.relationship,
                  age(selected.birthYear) && `age ${age(selected.birthYear)}`,
                  selected.residenceType && RESIDENCE_LABELS[selected.residenceType],
                  selected.zip,
                ]
                  .filter(Boolean)
                  .join(" · ") || "No profile details yet"}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="outline" onClick={() => setErOpen(true)}>
                <Siren className="mr-1 h-3.5 w-3.5 text-accent-urgent" /> ER brief
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Section nav */}
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  section === s.key ? "bg-secondary text-secondary-foreground font-medium" : "text-muted-foreground",
                )}
              >
                <s.icon className="h-4 w-4" strokeWidth={1.5} /> {s.label}
              </button>
            ))}
          </div>

          <div className="min-h-[40vh]">
            {section === "meds" && <MedsSection recipient={selected} members={members} onDone={() => router.refresh()} />}
            {section === "appts" && <ApptsSection recipient={selected} members={members} onDone={() => router.refresh()} />}
            {section === "providers" && <ProvidersSection recipient={selected} onDone={() => router.refresh()} />}
            {section === "conditions" && <ConditionsSection recipient={selected} onDone={() => router.refresh()} />}
            {section === "vital" && <VitalSection recipient={selected} onDone={() => router.refresh()} />}
            {section === "facts" && <FactsSection recipient={selected} onDone={() => router.refresh()} />}
          </div>

          <RecipientFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            recipient={selected}
            onDone={() => router.refresh()}
            onRequestDelete={() => { setEditOpen(false); setDeleteOpen(true); }}
          />
          <DeleteRecipientDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            recipient={selected}
            onDone={() => {
              setSelectedId(recipients.find((r) => r.id !== selected.id)?.id ?? "");
              router.refresh();
            }}
          />
          <ErBriefDialog open={erOpen} onOpenChange={setErOpen} recipient={selected} />
        </>
      )}

      <RecipientFormDialog
        open={addParentOpen}
        onOpenChange={setAddParentOpen}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

/* ─────────────────────────── Section: Medications ─────────────────────────── */

function MedsSection({
  recipient, members, onDone,
}: {
  recipient: RecipientDTO;
  members: MemberDTO[];
  onDone: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationDTO | null>(null);

  async function handleFilled(med: MedicationDTO) {
    try {
      await markMedicationFilled(med.id);
      toast.success(`Marked ${med.name} filled`);
      onDone();
    } catch {
      toast.error("Couldn't update refill");
    }
  }

  const active = recipient.medications.filter((m) => m.active);
  const inactive = recipient.medications.filter((m) => !m.active);

  return (
    <div className="space-y-3">
      <SectionHeader title="Medications" onAdd={() => { setEditing(null); setFormOpen(true); }} />
      {recipient.medications.length === 0 && <EmptyRow text="No medications tracked yet." />}
      <div className="notebook-list rounded-lg border">
        {active.map((med) => (
          <div key={med.id} className="flex items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="font-medium">
                {med.name} {med.dose && <span className="font-mono text-sm text-muted-foreground">{med.dose}</span>}
              </p>
              {med.schedule && <p className="text-sm text-muted-foreground">{med.schedule}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {med.pharmacy && <span>{med.pharmacy}</span>}
                {med.refillIntervalDays && med.runOutAt && (
                  <span className={cn("ml-2", med.refillDue && "text-accent-urgent font-medium")}>
                    {med.refillDue ? "Refill due" : `Runs out ${formatAlmanacDate(med.runOutAt)}`}
                  </span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {med.refillIntervalDays && (
                <Button size="sm" variant="outline" onClick={() => handleFilled(med)}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Filled
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(med); setFormOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {inactive.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer py-1">{inactive.length} inactive</summary>
          <div className="notebook-list mt-1 rounded-lg border">
            {inactive.map((med) => (
              <div key={med.id} className="flex items-center justify-between p-3">
                <span className="line-through">{med.name} {med.dose}</span>
                <Button size="sm" variant="ghost" onClick={async () => { await setMedicationActive(med.id, true); toast.success("Reactivated"); onDone(); }}>
                  Reactivate
                </Button>
              </div>
            ))}
          </div>
        </details>
      )}
      <MedFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        recipient={recipient}
        members={members}
        med={editing}
        onDone={onDone}
      />
    </div>
  );
}

function MedFormDialog({
  open, onOpenChange, recipient, members, med, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipient: RecipientDTO;
  members: MemberDTO[];
  med: MedicationDTO | null;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const refill = fd.get("refillIntervalDays") as string;
    const data = {
      name: (fd.get("name") as string).trim(),
      dose: (fd.get("dose") as string).trim() || undefined,
      schedule: (fd.get("schedule") as string).trim() || undefined,
      pharmacy: (fd.get("pharmacy") as string).trim() || undefined,
      prescriberId: (fd.get("prescriberId") as string) || null,
      refillIntervalDays: refill ? Number(refill) : null,
      lastFilledAt: (fd.get("lastFilledAt") as string) || null,
      defaultAssigneeId: (fd.get("defaultAssigneeId") as string) || null,
      notes: (fd.get("notes") as string).trim() || undefined,
    };
    if (!data.name) return;
    setSaving(true);
    try {
      if (med) await updateMedication(med.id, data);
      else await createMedication(recipient.id, data);
      toast.success(med ? "Medication updated" : "Medication added");
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save medication");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{med ? "Edit medication" : "Add medication"}</DialogTitle>
          <DialogDescription>Logistics only — name, refill cadence, pharmacy.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3" key={med?.id ?? "new"}>
          <Field label="Name" required><Input name="name" defaultValue={med?.name} required autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose"><Input name="dose" defaultValue={med?.dose ?? ""} placeholder="10mg" /></Field>
            <Field label="Schedule"><Input name="schedule" defaultValue={med?.schedule ?? ""} placeholder="daily, AM" /></Field>
          </div>
          <Field label="Pharmacy"><Input name="pharmacy" defaultValue={med?.pharmacy ?? ""} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Refill interval (days)"><Input name="refillIntervalDays" type="number" min={1} max={365} defaultValue={med?.refillIntervalDays ?? ""} placeholder="30 / 90" /></Field>
            <Field label="Last filled"><Input name="lastFilledAt" type="date" defaultValue={med?.lastFilledAt?.slice(0, 10) ?? ""} /></Field>
          </div>
          <Field label="Prescriber">
            <NativeSelect name="prescriberId" defaultValue={med?.prescriberId ?? ""}>
              <option value="">None</option>
              {recipient.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Default assignee">
            <NativeSelect name="defaultAssigneeId" defaultValue={med?.defaultAssigneeId ?? ""}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Notes"><Textarea name="notes" defaultValue={med?.notes ?? ""} rows={2} /></Field>
          <DialogFooter className="gap-2 sm:justify-between">
            {med && (
              <Button type="button" variant="ghost" className="text-accent-urgent"
                onClick={async () => { await setMedicationActive(med.id, false); toast.success("Deactivated"); onOpenChange(false); onDone(); }}>
                Deactivate
              </Button>
            )}
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Section: Appointments ─────────────────────────── */

function ApptsSection({
  recipient, members, onDone,
}: {
  recipient: RecipientDTO;
  members: MemberDTO[];
  onDone: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentDTO | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<AppointmentDTO | null>(null);
  // Snapshot "now" once at mount — pure across re-renders (lint: react-hooks/purity).
  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-3">
      <SectionHeader title="Appointments" onAdd={() => { setEditing(null); setFormOpen(true); }} />
      {recipient.appointments.length === 0 && <EmptyRow text="No appointments yet." />}
      <div className="notebook-list rounded-lg border">
        {recipient.appointments.map((appt) => {
          const past = new Date(appt.startsAt).getTime() < now;
          const needsOutcome = past && appt.status === "SCHEDULED";
          return (
            <div key={appt.id} className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="font-medium">{appt.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatAlmanacDateTime(appt.startsAt)}
                  {appt.providerName && ` · ${appt.providerName}`}
                  {appt.attendeeName && ` · ${appt.attendeeName} taking`}
                </p>
                {appt.location && <p className="text-xs text-muted-foreground">{appt.location}</p>}
                {appt.outcome && <p className="almanac-line mt-1 text-sm">{appt.outcome}</p>}
                {appt.status !== "SCHEDULED" && <Badge variant="note" className="mt-1">{appt.status}</Badge>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {needsOutcome && (
                  <Button size="sm" variant="outline" onClick={() => setOutcomeFor(appt)}>How did it go?</Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(appt); setFormOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <ApptFormDialog
        open={formOpen} onOpenChange={setFormOpen} recipient={recipient} members={members} appt={editing} onDone={onDone}
      />
      {outcomeFor && (
        <OutcomeDialog appt={outcomeFor} recipient={recipient} onClose={() => setOutcomeFor(null)} onDone={onDone} />
      )}
    </div>
  );
}

function ApptFormDialog({
  open, onOpenChange, recipient, members, appt, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipient: RecipientDTO;
  members: MemberDTO[];
  appt: AppointmentDTO | null;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startsAt = fd.get("startsAt") as string;
    const data = {
      title: (fd.get("title") as string).trim(),
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      providerId: (fd.get("providerId") as string) || null,
      location: (fd.get("location") as string).trim() || undefined,
      attendeeId: (fd.get("attendeeId") as string) || null,
      notes: (fd.get("notes") as string).trim() || undefined,
    };
    if (!data.title || !startsAt) return;
    setSaving(true);
    try {
      if (appt) await updateAppointment(appt.id, data);
      else await createAppointment(recipient.id, data);
      toast.success(appt ? "Appointment updated" : "Appointment added");
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save appointment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{appt ? "Edit appointment" : "Add appointment"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3" key={appt?.id ?? "new"}>
          <Field label="Title" required><Input name="title" defaultValue={appt?.title} required autoFocus placeholder="Cardiology follow-up" /></Field>
          <Field label="When" required>
            <Input name="startsAt" type="datetime-local" required
              defaultValue={appt ? toLocalInput(appt.startsAt) : ""} />
          </Field>
          <Field label="Provider">
            <NativeSelect name="providerId" defaultValue={appt?.providerId ?? ""}>
              <option value="">None</option>
              {recipient.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Who's taking them">
            <NativeSelect name="attendeeId" defaultValue={appt?.attendeeId ?? ""}>
              <option value="">Undecided</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Location"><Input name="location" defaultValue={appt?.location ?? ""} /></Field>
          <Field label="Notes"><Textarea name="notes" defaultValue={appt?.notes ?? ""} rows={2} /></Field>
          <DialogFooter className="gap-2 sm:justify-between">
            {appt && (
              <Button type="button" variant="ghost" className="text-accent-urgent"
                onClick={async () => { await deleteAppointment(appt.id); toast.success("Deleted"); onOpenChange(false); onDone(); }}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            )}
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OutcomeDialog({
  appt, recipient, onClose, onDone,
}: {
  appt: AppointmentDTO;
  recipient: RecipientDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [followUp, setFollowUp] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const outcome = (fd.get("outcome") as string).trim();
    setSaving(true);
    try {
      await recordAppointmentOutcome(appt.id, outcome);
      if (followUp) {
        // Pre-filled follow-up: this recipient, Medical type.
        await createAppointment(recipient.id, {
          title: `Follow-up: ${appt.title}`,
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          providerId: appt.providerId,
        });
      }
      toast.success("Outcome saved");
      onClose();
      onDone();
    } catch {
      toast.error("Couldn't save outcome");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How did it go?</DialogTitle>
          <DialogDescription>{appt.title} · {formatAlmanacDateTime(appt.startsAt)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Outcome"><Textarea name="outcome" rows={3} autoFocus placeholder="What did the doctor say?" /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
            Book a follow-up in a week
          </label>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── Section: Providers ─────────────────────────── */

function ProvidersSection({ recipient, onDone }: { recipient: RecipientDTO; onDone: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderDTO | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: (fd.get("name") as string).trim(),
      specialty: (fd.get("specialty") as string).trim() || undefined,
      phone: (fd.get("phone") as string).trim() || undefined,
      address: (fd.get("address") as string).trim() || undefined,
      notes: (fd.get("notes") as string).trim() || undefined,
    };
    if (!data.name) return;
    try {
      if (editing) await updateProvider(editing.id, data);
      else await createProvider(recipient.id, data);
      toast.success("Provider saved");
      setFormOpen(false);
      onDone();
    } catch {
      toast.error("Couldn't save provider");
    }
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Providers" onAdd={() => { setEditing(null); setFormOpen(true); }} />
      {recipient.providers.length === 0 && <EmptyRow text="No providers yet." />}
      <div className="notebook-list rounded-lg border">
        {recipient.providers.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {[p.specialty, p.phone].filter(Boolean).join(" · ")}
              </p>
              {p.address && <p className="text-xs text-muted-foreground">{p.address}</p>}
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(p); setFormOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit provider" : "Add provider"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3" key={editing?.id ?? "new"}>
            <Field label="Name" required><Input name="name" defaultValue={editing?.name} required autoFocus /></Field>
            <Field label="Specialty"><Input name="specialty" defaultValue={editing?.specialty ?? ""} /></Field>
            <Field label="Phone"><Input name="phone" defaultValue={editing?.phone ?? ""} /></Field>
            <Field label="Address"><Input name="address" defaultValue={editing?.address ?? ""} /></Field>
            <Field label="Notes"><Textarea name="notes" defaultValue={editing?.notes ?? ""} rows={2} /></Field>
            <DialogFooter className="gap-2 sm:justify-between">
              {editing && (
                <Button type="button" variant="ghost" className="text-accent-urgent"
                  onClick={async () => { await deleteProvider(editing.id); toast.success("Deleted"); setFormOpen(false); onDone(); }}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              )}
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────── Section: Conditions ─────────────────────────── */

function ConditionsSection({ recipient, onDone }: { recipient: RecipientDTO; onDone: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ConditionDTO | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: (fd.get("name") as string).trim(),
      notes: (fd.get("notes") as string).trim() || undefined,
    };
    if (!data.name) return;
    try {
      if (editing) await updateCondition(editing.id, data);
      else await createCondition(recipient.id, data);
      toast.success("Condition saved");
      setFormOpen(false);
      onDone();
    } catch {
      toast.error("Couldn't save condition");
    }
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Conditions" onAdd={() => { setEditing(null); setFormOpen(true); }} />
      {recipient.conditions.length === 0 && <EmptyRow text="No conditions listed." />}
      <div className="notebook-list rounded-lg border">
        {recipient.conditions.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className={cn("font-medium", !c.active && "line-through text-muted-foreground")}>{c.name}</p>
              {c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(c); setFormOpen(true); }}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit condition" : "Add condition"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3" key={editing?.id ?? "new"}>
            <Field label="Name" required><Input name="name" defaultValue={editing?.name} required autoFocus placeholder="Type 2 diabetes" /></Field>
            <Field label="Notes"><Textarea name="notes" defaultValue={editing?.notes ?? ""} rows={2} /></Field>
            <DialogFooter className="gap-2 sm:justify-between">
              {editing && (
                <Button type="button" variant="ghost" className="text-accent-urgent"
                  onClick={async () => { await deleteCondition(editing.id); toast.success("Deleted"); setFormOpen(false); onDone(); }}>
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              )}
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────── Section: Vital info ─────────────────────────── */

function VitalSection({ recipient, onDone }: { recipient: RecipientDTO; onDone: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<{ category: string; content: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = (fd.get("category") as string).trim();
    const content = (fd.get("content") as string).trim();
    if (!category) return;
    try {
      await upsertVitalInfo(recipient.id, category, content);
      toast.success("Saved");
      setFormOpen(false);
      onDone();
    } catch {
      toast.error("Couldn't save");
    }
  }

  return (
    <div className="space-y-3">
      <SectionHeader title="Vital info" onAdd={() => { setEditing(null); setFormOpen(true); }} />
      {recipient.vitalInfo.length === 0 && <EmptyRow text="No vital info yet (allergies, insurance, emergency contacts)." />}
      <div className="space-y-2">
        {recipient.vitalInfo.map((v) => (
          <div key={v.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{v.category}</p>
              <Button size="icon" variant="ghost" className="h-8 w-8"
                onClick={() => { setEditing({ category: v.category, content: v.content }); setFormOpen(true); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{v.content}</p>
          </div>
        ))}
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit vital info" : "Add vital info"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3" key={editing?.category ?? "new"}>
            <Field label="Category" required>
              <Input name="category" defaultValue={editing?.category ?? ""} readOnly={!!editing} required autoFocus placeholder="Allergies / Insurance / Emergency Contacts" />
            </Field>
            <Field label="Details"><Textarea name="content" defaultValue={editing?.content ?? ""} rows={4} /></Field>
            <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────── Section: What Keeper knows (facts) ─────────────────────── */

function FactsSection({ recipient, onDone }: { recipient: RecipientDTO; onDone: () => void }) {
  const factMap = new Map(recipient.facts.map((f) => [f.key, f]));
  // Debounce the engine re-run: many rapid chip taps → one sweep once the user settles (M2-003).
  const sweepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (sweepTimer.current) clearTimeout(sweepTimer.current); }, []);

  function scheduleRefresh() {
    if (sweepTimer.current) clearTimeout(sweepTimer.current);
    sweepTimer.current = setTimeout(() => {
      refreshSuggestions().then(onDone).catch(() => {});
    }, 800);
  }

  async function cycle(key: string, current: FactValue) {
    const order: FactValue[] = ["true", "false", "unknown"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    try {
      await setFact(recipient.id, key, next);
      onDone();
      scheduleRefresh();
    } catch {
      toast.error("Couldn't update");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        What Keeper uses to predict work. Tap to correct — changes affect the next suggestion run.
      </p>
      {[
        { title: "Home", facts: HOME_FACTS },
        { title: "Health", facts: HEALTH_FACTS },
      ].map((group) => (
        <div key={group.title} className="space-y-2">
          <h2 className="text-sm font-medium">{group.title}</h2>
          <div className="notebook-list rounded-lg border">
            {group.facts.map((f) => {
              const fact = factMap.get(f.key);
              const value = (fact?.value as FactValue) ?? "unknown";
              return (
                <div key={f.key} className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="text-sm">{f.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {fact ? provenanceLabel(fact.source) : "default"}
                    </p>
                  </div>
                  <button onClick={() => cycle(f.key, value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      value === "true" && "border-primary bg-primary text-primary-foreground",
                      value === "false" && "border-border bg-secondary text-secondary-foreground",
                      value === "unknown" && "border-dashed text-muted-foreground",
                    )}>
                    {value === "true" ? "Yes" : value === "false" ? "No" : "Unknown"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function provenanceLabel(source: string): string {
  switch (source) {
    case "ONBOARDING": return "you said";
    case "MANUAL": return "you corrected";
    case "DISMISSAL": return "inferred from a dismissal";
    default: return "default";
  }
}

/* ─────────────────────────── Recipient profile form ─────────────────────────── */

function RecipientFormDialog({
  open, onOpenChange, recipient, onDone, onRequestDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipient?: RecipientDTO;
  onDone: () => void;
  onRequestDelete?: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const birthYear = fd.get("birthYear") as string;
    const residence = fd.get("residenceType") as string;
    const data = {
      name: (fd.get("name") as string).trim(),
      relationship: (fd.get("relationship") as string).trim() || undefined,
      birthYear: birthYear ? Number(birthYear) : null,
      zip: (fd.get("zip") as string).trim() || undefined,
      residenceType: (residence || null) as RecipientDTO["residenceType"],
    };
    if (!data.name) return;
    setSaving(true);
    try {
      if (recipient) await updateRecipient(recipient.id, data);
      else await createRecipient(data);
      toast.success(recipient ? "Updated" : `Added ${data.name}`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{recipient ? "Edit profile" : "Add a parent"}</DialogTitle>
          <DialogDescription>Only a name is required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3" key={recipient?.id ?? "new"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" required><Input name="name" defaultValue={recipient?.name} required autoFocus placeholder="Jane" /></Field>
            <Field label="Relationship"><Input name="relationship" defaultValue={recipient?.relationship ?? ""} placeholder="Mom" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth year"><Input name="birthYear" type="number" min={1900} max={new Date().getFullYear()} defaultValue={recipient?.birthYear ?? ""} /></Field>
            <Field label="ZIP"><Input name="zip" defaultValue={recipient?.zip ?? ""} placeholder="20147" /></Field>
          </div>
          <Field label="Residence">
            <NativeSelect name="residenceType" defaultValue={recipient?.residenceType ?? ""}>
              <option value="">Not set</option>
              <option value="HOUSE">House</option>
              <option value="CONDO">Condo</option>
              <option value="APARTMENT">Apartment</option>
              <option value="FACILITY">Care facility</option>
            </NativeSelect>
          </Field>
          <DialogFooter className="gap-2 sm:justify-between">
            {recipient && onRequestDelete && (
              <Button type="button" variant="ghost" className="text-accent-urgent" onClick={onRequestDelete}>
                <Trash2 className="mr-1 h-4 w-4" /> Remove parent
              </Button>
            )}
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRecipientDialog({
  open, onOpenChange, recipient, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipient: RecipientDTO;
  onDone: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {recipient.name}?</DialogTitle>
          <DialogDescription>
            This removes their profile, meds, appointments, providers, conditions, and vital info.
            Type <span className="font-mono">{recipient.name}</span> to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={recipient.name} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={confirm !== recipient.name}
            onClick={async () => { await deleteRecipient(recipient.id); toast.success("Deleted"); onOpenChange(false); onDone(); }}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── ER brief ─────────────────────────── */

function ErBriefDialog({ open, onOpenChange, recipient }: { open: boolean; onOpenChange: (o: boolean) => void; recipient: RecipientDTO }) {
  const meds = recipient.medications.filter((m) => m.active);
  const conditions = recipient.conditions.filter((c) => c.active);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Siren className="h-5 w-5 text-accent-urgent" /> ER brief — {recipient.name}</DialogTitle>
          <DialogDescription>Read this to a nurse. Everything they ask for, in order.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <ErBlock title="Medications">
            {meds.length === 0 ? <p className="text-muted-foreground">None listed</p> :
              meds.map((m) => <p key={m.id} className="font-mono">{m.name}{m.dose && ` — ${m.dose}`}{m.schedule && ` — ${m.schedule}`}</p>)}
          </ErBlock>
          <ErBlock title="Conditions">
            {conditions.length === 0 ? <p className="text-muted-foreground">None listed</p> :
              conditions.map((c) => <p key={c.id}>{c.name}</p>)}
          </ErBlock>
          {recipient.vitalInfo.map((v) => (
            <ErBlock key={v.id} title={v.category}><p className="whitespace-pre-wrap">{v.content}</p></ErBlock>
          ))}
          <ErBlock title="Providers">
            {recipient.providers.length === 0 ? <p className="text-muted-foreground">None listed</p> :
              recipient.providers.map((p) => <p key={p.id}>{p.name}{p.specialty && ` (${p.specialty})`}{p.phone && ` — ${p.phone}`}</p>)}
          </ErBlock>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ErBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

/* ─────────────────────────── Small shared UI ─────────────────────────── */

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg">{title}</h2>
      <Button size="sm" variant="outline" onClick={onAdd}><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{text}</p>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label} {required && <span className="text-accent-urgent">*</span>}</Label>
      {children}
    </div>
  );
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        props.className,
      )}
    />
  );
}

/** ISO string → value for <input type="datetime-local"> in the browser's local zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
