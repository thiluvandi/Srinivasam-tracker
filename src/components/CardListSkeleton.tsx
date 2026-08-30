export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[#E4E0D6] bg-white p-4">
          <div className="h-4 w-24 rounded bg-[#EEEAE0]" />
          <div className="mt-2 h-3 w-32 rounded bg-[#F2EFE7]" />
        </div>
      ))}
    </div>
  );
}
