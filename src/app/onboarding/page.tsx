import { getMembership, getRequestSession } from "@/lib/access";
import { createCircle } from "@/lib/actions/circle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await getRequestSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/onboarding");
  const user = session.user;
  if (await getMembership(user.id)) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>Create your family circle</CardTitle><CardDescription>This keeps your family data private.</CardDescription></CardHeader>
        <CardContent>
          <form action={createCircle} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">Circle name</Label><Input id="name" name="name" defaultValue={`${user.name || "My"}'s family`} required /></div>
            <Button className="w-full" type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
