import type { TrainingItem } from "@/types";
import { StatusBadge } from "./StatusBadge";

export function TrainingTable({ items }: { items: TrainingItem[] }) {
  if (items.length === 0) {
    return <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No training topics have been added to this category yet. Check back later or suggest a topic.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: 40 }}>#</th>
          <th>Training Topic</th>
          <th>Owner(s)</th>
          <th>Format</th>
          <th>Status</th>
          <th>Links / Associated Content</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.topic}</td>
            <td>{item.owners || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
            <td>{item.format}</td>
            <td><StatusBadge label={item.status} color={item.statusColor} /></td>
            <td>{item.links || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
            <td>{item.notes || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
