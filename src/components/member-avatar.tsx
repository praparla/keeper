import { getMemberColor, getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MemberAvatar({
  name,
  color,
  size = "sm",
}: {
  name?: string | null;
  color?: string | null;
  size?: "sm" | "md";
}) {
  const c = getMemberColor(color);
  const initials = getInitials(name);
  const sizeClasses = size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0",
        c.bg,
        c.text,
        sizeClasses
      )}
      title={name ?? undefined}
    >
      {initials}
    </span>
  );
}
