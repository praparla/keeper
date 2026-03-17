import { BottomNav } from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // TODO: Re-enable auth gate when auth is configured
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="mx-auto max-w-lg px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
