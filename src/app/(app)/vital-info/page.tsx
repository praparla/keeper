import { prisma } from "@/lib/db";
import { VitalInfoClient } from "./vital-info-client";

export const dynamic = "force-dynamic";

export default async function VitalInfoPage() {
  const vitalInfo = await prisma.vitalInfo.findMany({
    orderBy: { category: "asc" },
  });

  return <VitalInfoClient items={vitalInfo} />;
}
