import type { BrokenLinkItem } from "@/types";
import { StatusBadge } from "./StatusBadge";

export function BrokenLinkTable({ items }: { items: BrokenLinkItem[] }) {
  if (items.length === 0) {
    return <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No broken links identified in this category.</p>;
  }
  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: 40 }}>#</th>
          <th>Source Page</th>
          <th>Description</th>
          <th>Broken URL</th>
          <th>Claimed By</th>
          <th>Status</th>
          <th>New URL (verified)</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>
              {item.sourceUrl ? (
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{item.sourcePage}</a>
              ) : item.sourcePage}
            </td>
            <td>{item.description}</td>
            <td style={{ wordBreak: "break-all", fontSize: "0.75rem" }}>
              <code>{item.brokenUrl}</code>
            </td>
            <td>{item.claimedBy || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
            <td><StatusBadge label={item.status} color={item.statusColor} /></td>
            <td>{item.newUrl || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
            <td>{item.notes || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
