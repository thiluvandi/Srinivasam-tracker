export default function Loading() {
  return (
    <div className="px-5 pb-8 pt-8">
      <p className="text-xl font-semibold tracking-tight text-[#2A2724]">Reports</p>
      <div className="mt-6 animate-pulse space-y-3">
        <div className="h-40 rounded-2xl border border-[#E4E0D6] bg-white" />
        <div className="h-10 rounded-xl bg-[#EEEAE0]" />
        <div className="h-32 rounded-2xl border border-[#E4E0D6] bg-white" />
      </div>
    </div>
  );
}
