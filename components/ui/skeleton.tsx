export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-surface p-6 shadow-xl animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-muted rounded"></div>
          <div className="h-5 w-5 bg-muted rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-10 w-full bg-muted rounded"></div>
          <div className="h-10 w-full bg-muted rounded"></div>
          <div className="h-24 w-full bg-muted rounded"></div>
          <div className="flex gap-3 pt-4">
            <div className="h-10 flex-1 bg-muted rounded"></div>
            <div className="h-10 flex-1 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="rounded-lg bg-surface shadow-sm animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-muted rounded-md"></div>
          <div className="h-9 w-9 bg-muted rounded-md"></div>
          <div className="h-8 w-16 bg-muted rounded-md"></div>
        </div>
        <div className="h-6 w-48 bg-muted rounded"></div>
        <div className="h-5 w-20 bg-muted rounded"></div>
      </div>

      {/* Calendar Grid */}
      <div className="relative max-h-[600px] overflow-hidden">
        <div className="relative">
          {/* Time Labels */}
          <div className="absolute left-0 top-0 w-16 border-r border-border bg-muted">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="h-12 flex items-start justify-end pr-2 pt-1"
              >
                <div className="h-3 w-8 bg-muted/50 rounded"></div>
              </div>
            ))}
          </div>

          {/* Grid Lines */}
          <div className="ml-16">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-12 border-b border-border"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
