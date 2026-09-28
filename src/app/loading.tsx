// Route-level skeleton shown while a DB-backed page streams in.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2">
        <div className="o-skeleton h-9 w-48" />
        <div className="o-skeleton h-4 w-64" />
      </div>
      <div className="o-skeleton h-11 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="o-skeleton h-36" />
        ))}
      </div>
    </div>
  );
}
