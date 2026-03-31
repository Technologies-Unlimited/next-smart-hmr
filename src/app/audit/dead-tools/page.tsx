import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { deadToolLinks } from "@/data/audit-dead-tools";

export default function DeadToolsPage() {
  return (
    <>
      <PageHeader
        title="Dead Internal Tools"
        description="Links to internal tools and dashboards that have been decommissioned"
      />
      <InfoBox variant="warning">
        <strong>Action Required:</strong> These links point to internal tools and dashboards that are no longer online. For each link, determine if a replacement tool exists or if the reference should be removed from the Confluence page entirely.
      </InfoBox>
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Source Page</th>
            <th>Description</th>
            <th>Dead URL</th>
            <th>Claimed By</th>
            <th>Status</th>
            <th>New URL</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {deadToolLinks.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{item.sourcePage}</a>
                ) : item.sourcePage}
              </td>
              <td>{item.description}</td>
              <td style={{ wordBreak: "break-all", fontSize: "0.75rem" }}><code>{item.deadUrl}</code></td>
              <td>{item.claimedBy || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
              <td><StatusBadge label={item.status} color={item.statusColor} /></td>
              <td>{item.newUrl || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
              <td>{item.notes || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
