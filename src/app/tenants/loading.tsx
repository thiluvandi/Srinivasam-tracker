import { CardListSkeleton } from "@/components/CardListSkeleton";

export default function Loading() {
  return (
    <div className="px-5 pb-8 pt-8">
      <p className="text-xl font-semibold tracking-tight text-[#2A2724]">Tenants</p>
      <div className="mt-6">
        <CardListSkeleton rows={6} />
      </div>
    </div>
  );
}
