import { prisma } from "@/lib/db";
import { requireCircleContext } from "@/lib/access";
import { VitalInfoClient } from "./vital-info-client";

export const dynamic = "force-dynamic";

export default async function VitalInfoPage() {
  const { circleId } = await requireCircleContext();
  const vitalInfo = await prisma.vitalInfo.findMany({
    where: { circleId },
    orderBy: { category: "asc" },
  });

  return <VitalInfoClient items={vitalInfo} />;
}
