import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { wolkenKbLinks } from "@/data/audit-wolken";

export default function WolkenKbPage() {
  return (
    <>
      <PageHeader
        title="Broken Links: Wolken KB"
        description="Links to the Wolken Knowledge Base system"
      />
      <InfoBox variant="info">
        <strong>Note:</strong> Wolken KB articles may have been migrated or archived as part of support platform changes. Verify each link for accessibility and content accuracy.
      </InfoBox>
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Source Page</th>
            <th>Description</th>
            <th>Wolken URL</th>
            <th>Claimed By</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {wolkenKbLinks.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{item.sourcePage}</a>
                ) : item.sourcePage}
              </td>
              <td>{item.description}</td>
              <td style={{ wordBreak: "break-all", fontSize: "0.75rem" }}><code>{item.url}</code></td>
              <td>{item.claimedBy || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
              <td><StatusBadge label={item.status} color={item.statusColor} /></td>
              <td>{item.notes || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
