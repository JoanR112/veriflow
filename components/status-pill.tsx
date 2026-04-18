import type { VerificationDecision } from "@/lib/types";

const labelMap: Record<VerificationDecision, string> = {
  approved: "Approved",
  manual_review: "Manual Review",
  rejected: "Rejected",
};

export function StatusPill({ status }: { status: VerificationDecision }) {
  return <span className={`status-pill ${status}`}>{labelMap[status]}</span>;
}
