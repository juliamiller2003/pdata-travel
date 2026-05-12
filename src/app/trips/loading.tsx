export default function TripsLoading() {
  return (
    <div className="animate-pulse">
      {/* AI planner input skeleton */}
      <div className="mb-8 h-10 rounded-xl bg-gray-100 dark:bg-[#2e2e2e]" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-[#2e2e2e]" />
          <div className="h-4 w-16 rounded bg-gray-100 dark:bg-[#2e2e2e]" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-[#2e2e2e]" />
      </div>

      {/* Trip card skeletons */}
      <div className="divide-y divide-gray-100 dark:divide-transparent space-y-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="py-4 flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 rounded-xl bg-gray-200 dark:bg-[#2e2e2e]" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-[#2e2e2e]" />
              <div className="h-3.5 w-24 rounded bg-gray-100 dark:bg-[#2e2e2e]" />
            </div>
            <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-[#2e2e2e]" />
          </div>
        ))}
      </div>
    </div>
  );
}
