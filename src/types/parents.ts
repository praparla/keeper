import type { ResidenceType, ApptStatus, FactSource } from "@prisma/client";

/**
 * Serializable DTOs for the Parents hub. Server components map Prisma rows (with
 * Date objects) to these ISO-string shapes so client components stay Date-free.
 */

export interface MemberDTO {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  color: string | null;
}

export interface ProviderDTO {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface ConditionDTO {
  id: string;
  name: string;
  notes: string | null;
  active: boolean;
}

export interface MedicationDTO {
  id: string;
  name: string;
  dose: string | null;
  schedule: string | null;
  pharmacy: string | null;
  prescriberId: string | null;
  prescriberName: string | null;
  refillIntervalDays: number | null;
  lastFilledAt: string | null;
  defaultAssigneeId: string | null;
  active: boolean;
  notes: string | null;
  /** Derived: run-out date (ISO) and whether a refill task is currently due. */
  runOutAt: string | null;
  refillDue: boolean;
}

export interface AppointmentDTO {
  id: string;
  title: string;
  startsAt: string;
  providerId: string | null;
  providerName: string | null;
  location: string | null;
  attendeeId: string | null;
  attendeeName: string | null;
  notes: string | null;
  outcome: string | null;
  status: ApptStatus;
}

export interface FactDTO {
  key: string;
  value: string;
  source: FactSource;
}

export interface VitalInfoDTO {
  id: string;
  category: string;
  content: string;
}

export interface RecipientDTO {
  id: string;
  name: string;
  relationship: string | null;
  birthYear: number | null;
  zip: string | null;
  residenceType: ResidenceType | null;
  timezone: string;
  providers: ProviderDTO[];
  conditions: ConditionDTO[];
  medications: MedicationDTO[];
  appointments: AppointmentDTO[];
  facts: FactDTO[];
  vitalInfo: VitalInfoDTO[];
}
