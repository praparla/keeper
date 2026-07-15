import type {
  TemplateCategory, TriggerType, IntervalAnchor, TaskType, Recurrence,
  ResidenceType, SuggestionStatus,
} from "@prisma/client";
import type { ClimateRegion } from "@/lib/climate";
import type { FactValue } from "@/lib/facts";

/** Structured gates parsed from SuggestionTemplate.requiresFacts (JSON). */
export interface TemplateGates {
  /** factKey → required boolean value. */
  facts?: Record<string, boolean>;
  /** recipient.residenceType must be one of these. */
  residence?: ResidenceType[];
  /** recipient.climateRegion must be one of these. */
  regions?: ClimateRegion[];
  /** recipient.activeMedCount must be ≥ this. */
  minActiveMeds?: number;
}

export interface EngineTemplate {
  id: string;
  slug: string;
  title: string;
  reasonTemplate: string;
  category: TemplateCategory;
  triggerType: TriggerType;
  windowStartMonth: number | null;
  windowStartDay: number | null;
  windowEndMonth: number | null;
  windowEndDay: number | null;
  intervalDays: number | null;
  intervalAnchor: IntervalAnchor | null;
  leadDays: number;
  minAge: number | null;
  gates: TemplateGates;
  climateSensitive: boolean;
  defaultTaskType: TaskType;
  defaultRecurrence: Recurrence;
  active: boolean;
  /** Circle-level template (tax filing, catalog review) — evaluated once per circle, no recipient. */
  recipientAgnostic: boolean;
}

export interface EngineRecipient {
  id: string;
  name: string;
  relationship: string | null;
  birthYear: number | null;
  timezone: string;
  climateRegion: ClimateRegion | null;
  residenceType: ResidenceType | null;
  createdAt: Date;
  facts: Record<string, FactValue>;
  activeMedCount: number;
  suppressedSlugs: Set<string>;
  /** slug → most recent completion date of a task lineaged to that template (INTERVAL anchoring). */
  lastCompletionByTemplate: Record<string, Date>;
}

export interface ExistingSuggestion {
  id: string;
  templateId: string | null;
  cycleKey: string;
  status: SuggestionStatus;
  windowEnd: Date | null;
}

export interface CircleState {
  circleId: string;
  timezone: string;
  existing: ExistingSuggestion[];
  /** circle-level template completions, for recipient-agnostic INTERVAL templates. */
  lastCompletionByTemplate: Record<string, Date>;
}

export interface NewSuggestion {
  circleId: string;
  recipientId: string | null;
  templateId: string;
  cycleKey: string;
  title: string;
  reason: string;
  windowStart: Date;
  windowEnd: Date | null;
}

export interface EvaluateResult {
  create: NewSuggestion[];
  expire: string[];
}
