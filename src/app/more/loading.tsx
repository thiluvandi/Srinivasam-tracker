export default function Loading() {
  return (
    <div className="px-5 pb-8 pt-8">
      <p className="text-xl font-semibold tracking-tight text-[#2A2724]">More</p>
      <div className="mt-6 animate-pulse space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-2xl border border-[#E4E0D6] bg-white" />
        ))}
      </div>
    </div>
  );
}
