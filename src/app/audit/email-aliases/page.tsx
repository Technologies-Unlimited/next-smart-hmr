import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { emailAliasLinks } from "@/data/audit-email";

export default function EmailAliasesPage() {
  return (
    <>
      <PageHeader
        title="Email Aliases Audit"
        description="Email aliases referenced in Confluence pages that may need updating"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> Email aliases ending in @vmware.com may have been migrated to @broadcom.com or decommissioned. Verify each alias and update references to the current address.
      </InfoBox>
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Source Page</th>
            <th>Description</th>
            <th>Old Address</th>
            <th>Claimed By</th>
            <th>Status</th>
            <th>Current Address</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {emailAliasLinks.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{item.sourcePage}</a>
                ) : item.sourcePage}
              </td>
              <td>{item.description}</td>
              <td><code style={{ fontSize: "0.75rem" }}>{item.oldAddress}</code></td>
              <td>{item.claimedBy || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
              <td><StatusBadge label={item.status} color={item.statusColor} /></td>
              <td>{item.currentAddress || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
              <td>{item.notes || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
