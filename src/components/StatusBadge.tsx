import type { StatusColor } from "@/types";

export function StatusBadge({ label, color }: { label: string; color: StatusColor }) {
  return <span className={`badge badge-${color}`}>{label}</span>;
}
