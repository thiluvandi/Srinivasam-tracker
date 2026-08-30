export default function Loading() {
  return (
    <div className="px-5 pb-8 pt-8">
      <div className="h-4 w-16 animate-pulse rounded bg-[#EEEAE0]" />
      <div className="mt-3 h-6 w-40 animate-pulse rounded bg-[#EEEAE0]" />
      <div className="mt-6 h-48 animate-pulse rounded-2xl border border-[#E4E0D6] bg-white" />
      <div className="mt-6 h-24 animate-pulse rounded-2xl border border-[#E4E0D6] bg-white" />
    </div>
  );
}
