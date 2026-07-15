import { acceptInvite } from "@/lib/actions/circle";
import { getMembership, getRequestSession } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getRequestSession();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  if (await getMembership(session.user.id)) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={acceptInvite.bind(null, token)} className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Join family circle?</h1>
        <p className="my-4 text-sm text-muted-foreground">You will share tasks and care information with this family.</p>
        <Button className="w-full" type="submit">Join circle</Button>
      </form>
    </main>
  );
}
