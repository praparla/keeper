import { type LucideIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon = FileText,
  message,
  actionLabel,
  onAction,
}: {
  icon?: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
