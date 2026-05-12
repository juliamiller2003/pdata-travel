export default function TripDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-[#2e2e2e]" />
          <div className="h-4 w-2 rounded bg-gray-100 dark:bg-[#2e2e2e]" />
          <div className="h-4 w-32 rounded bg-gray-200 dark:bg-[#2e2e2e]" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-lg bg-gray-100 dark:bg-[#2e2e2e]" />
          <div className="h-8 w-14 rounded-lg bg-gray-100 dark:bg-[#2e2e2e]" />
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-[#2e2e2e]" />
      </div>

      {/* Meta grid */}
      <div className="mb-6 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-gray-100 dark:bg-[#2e2e2e]" />
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-[#2e2e2e]" />
            </div>
          ))}
        </div>
      </div>

      {/* Section skeletons */}
      <div className="mb-8 space-y-8">
        {[
          ["45%", "70%", "55%"],
          ["60%", "40%"],
          ["50%", "65%", "35%"],
        ].map((lines, i) => (
          <div key={i}>
            <div className="mb-4 h-5 w-24 rounded-lg bg-gray-200 dark:bg-[#2e2e2e]" />
            <div className="rounded-xl border border-gray-100 dark:border-[#2e2e2e] p-4 space-y-3">
              {lines.map((w, j) => (
                <div key={j} className="h-4 rounded bg-gray-100 dark:bg-[#2e2e2e]" style={{ width: w }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
