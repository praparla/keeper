"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginClient({ callbackURL }: { callbackURL: string }) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;
    void authClient.oneTap({ callbackURL }).catch((cause: unknown) => {
      console.error("Google One Tap failed", cause);
    });
  }, [callbackURL]);

  async function signInWithGoogle() {
    setError("");
    const result = await authClient.signIn.social({ provider: "google", callbackURL });
    if (result.error) setError("Google sign-in failed. Try again.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Keeper</CardTitle>
          <CardDescription>Family care coordination</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={signInWithGoogle}>Continue with Google</Button>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
