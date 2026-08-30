import type { LedgerStatus } from "@/lib/status";

export const STATUS_COLORS: Record<LedgerStatus, { text: string; bg: string; dot: string }> = {
  paid: { text: "text-[#5C7A52]", bg: "bg-[#EAF0E4]", dot: "bg-[#7C9473]" },
  pending: { text: "text-[#5E7284]", bg: "bg-[#E7EDF2]", dot: "bg-[#7C93A8]" },
  partial: { text: "text-[#8A6B27]", bg: "bg-[#F5EAD3]", dot: "bg-[#B58A3E]" },
  overdue: { text: "text-[#9C563A]", bg: "bg-[#F5E3DB]", dot: "bg-[#B4694A]" },
  waived: { text: "text-[#6E6089]", bg: "bg-[#EDE8F2]", dot: "bg-[#8C7FA8]" },
};
