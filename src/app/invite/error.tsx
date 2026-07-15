"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function InviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2">This invite didn&apos;t work</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {error.message || "The invite may be expired, revoked, or already used."}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </main>
  );
}
