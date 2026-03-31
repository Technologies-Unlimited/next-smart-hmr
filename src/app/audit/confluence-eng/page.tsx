import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { confluenceEngLinks } from "@/data/audit-confluence-eng";

export default function ConfluenceEngPage() {
  return (
    <>
      <PageHeader
        title="Broken Links: confluence.eng.vmware.com"
        description="Internal Confluence Engineering wiki links that may no longer be accessible"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> The confluence.eng.vmware.com instance is being decommissioned. Engineering documentation may have moved to internal Broadcom Confluence or other documentation platforms. Coordinate with Engineering to locate migrated content.
      </InfoBox>
      <table>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Source Page</th>
            <th>Description</th>
            <th>Claimed By</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {confluenceEngLinks.map(item => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{item.sourcePage}</a>
                ) : item.sourcePage}
              </td>
              <td>{item.description}</td>
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
