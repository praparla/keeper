export default function VitalInfoLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-32 bg-muted rounded" />
      <div className="h-4 w-56 bg-muted rounded" />
      <div className="space-y-4 mt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 w-full bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
