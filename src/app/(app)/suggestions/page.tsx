import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { getPendingSuggestions } from "@/lib/actions/suggestion";
import { SuggestionInbox } from "@/components/suggestion-inbox";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Full suggestion inbox + season preview (§6.5). The inbox is every pending suggestion;
 * the "season preview" framing is simply that same list ordered by window — what Keeper
 * will keep an eye on over the coming weeks.
 */
export default async function SuggestionsPage() {
  const { circleId } = await requireCircleContext();
  const [suggestions, members] = await Promise.all([
    getPendingSuggestions(),
    prisma.membership.findMany({
      where: { circleId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Today
        </Link>
        <h1 className="text-2xl">Season preview</h1>
        <p className="text-sm text-muted-foreground">Everything Keeper is watching, in the order it comes due.</p>
      </div>

      <SuggestionInbox
        suggestions={suggestions.map((s) => ({
          id: s.id,
          title: s.title,
          reason: s.reason,
          recipientName: s.recipient?.relationship || s.recipient?.name || null,
          windowStart: s.windowStart.toISOString(),
          windowEnd: s.windowEnd?.toISOString() ?? null,
        }))}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
        limit={100}
      />
    </div>
  );
}
