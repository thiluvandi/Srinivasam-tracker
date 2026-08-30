import { CardListSkeleton } from "@/components/CardListSkeleton";

export default function Loading() {
  return (
    <div className="px-5 pb-8 pt-8">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 animate-pulse rounded-full bg-[#EEEAE0]" />
        <p className="text-xl font-semibold tracking-tight text-[#2A2724]">Srinivasam</p>
      </div>
      <div className="mt-10">
        <CardListSkeleton rows={6} />
      </div>
    </div>
  );
}
