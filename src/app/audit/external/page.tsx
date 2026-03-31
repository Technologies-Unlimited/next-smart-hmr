import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { externalLinks } from "@/data/audit-external";

export default function ExternalLinksPage() {
  return (
    <>
      <PageHeader
        title="External / Third-Party Links"
        description="Links to external websites and third-party resources that need verification"
      />
      <InfoBox variant="info">
        <strong>Note:</strong> These are links to external websites that are not controlled by VMware/Broadcom. They may have become broken due to site changes, content removal, or domain expiration. Verify each link and find an alternative if the original is no longer available.
      </InfoBox>
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Source Page</th>
            <th>Description</th>
            <th>URL</th>
            <th>Claimed By</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {externalLinks.map(item => (
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
