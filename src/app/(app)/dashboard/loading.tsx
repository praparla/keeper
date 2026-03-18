export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-4 w-28 bg-muted rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-muted rounded" />
      </div>
      <div className="h-10 w-full bg-muted rounded" />
      <div className="space-y-3">
        <div className="h-4 w-36 bg-muted rounded" />
        <div className="h-24 w-full bg-muted rounded-lg" />
        <div className="h-24 w-full bg-muted rounded-lg" />
      </div>
    </div>
  );
}
