export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-7 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
