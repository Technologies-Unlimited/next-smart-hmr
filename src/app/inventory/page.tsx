import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { contentInventory } from "@/data/inventory";

export default function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Content Inventory"
        description="Inventory of all GSS NSX Confluence pages with content analysis and recommendations"
      />
      <InfoBox variant="info">
        <strong>Purpose:</strong> This inventory catalogs all pages in the GSS NSX Confluence space, identifies duplicate or overlapping content, and provides recommended actions (keep, consolidate, archive, or delete).
      </InfoBox>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Page Title</th>
              <th>Contents Summary</th>
              <th>Duplicate / Overlap</th>
              <th>Recommended Action</th>
              <th>Owner</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {contentInventory.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  {item.pageUrl ? (
                    <a href={item.pageUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{item.pageTitle}</a>
                  ) : item.pageTitle}
                </td>
                <td>{item.contents}</td>
                <td>{item.duplicateOverlap}</td>
                <td>{item.recommendedAction}</td>
                <td>{item.owner || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
                <td><StatusBadge label={item.status} color={item.statusColor} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
