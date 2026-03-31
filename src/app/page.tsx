import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { InfoBox } from "@/components/InfoBox";
import { nsxTrainings, hcxTrainings, coreNetworkingTrainings, vrniTrainings, computeTrainings } from "@/data/trainings";
import { docsVmwareLinks } from "@/data/audit-docs-vmware";
import { ikbVmwareLinks } from "@/data/audit-ikb-vmware";
import { bugzillaLinks } from "@/data/audit-bugzilla";
import { zoomRecordings } from "@/data/audit-zoom";
import { kbVmwareLinks } from "@/data/audit-kb-vmware";
import { confluenceEngLinks } from "@/data/audit-confluence-eng";
import { viaVmwLinks } from "@/data/audit-via-vmw";
import { gitlabEngLinks } from "@/data/audit-gitlab";
import { sharepointLinks } from "@/data/audit-sharepoint";
import { communitiesLinks } from "@/data/audit-communities";
import { wolkenKbLinks } from "@/data/audit-wolken";
import { deadToolLinks } from "@/data/audit-dead-tools";
import { externalLinks } from "@/data/audit-external";
import { emailAliasLinks } from "@/data/audit-email";
import { contentInventory } from "@/data/inventory";
import { deletionCandidates } from "@/data/deletion";
import type { StatusColor } from "@/types";

function countByStatus(items: { statusColor: StatusColor }[]) {
  const counts = { yellow: 0, blue: 0, green: 0, red: 0 };
  items.forEach(item => counts[item.statusColor]++);
  return counts;
}

export default function OverviewPage() {
  const allTrainings = [...nsxTrainings, ...hcxTrainings, ...coreNetworkingTrainings, ...vrniTrainings, ...computeTrainings];
  const allAuditItems = [
    ...docsVmwareLinks, ...ikbVmwareLinks, ...bugzillaLinks,
    ...zoomRecordings, ...kbVmwareLinks, ...confluenceEngLinks,
    ...viaVmwLinks, ...gitlabEngLinks, ...sharepointLinks,
    ...communitiesLinks, ...wolkenKbLinks, ...deadToolLinks,
    ...externalLinks, ...emailAliasLinks,
  ];
  const allItems = [...allTrainings, ...allAuditItems, ...contentInventory, ...deletionCandidates];
  const counts = countByStatus(allItems);

  return (
    <>
      <PageHeader
        title="GSS NSX Training Content & Broken Link Audit Tracker"
        description="Last updated: 04 March 2026 | Owner: GSS NSX Global Support Team"
      />

      <InfoBox variant="info">
        <strong>About This Page</strong>
        <br />
        This tracker serves two purposes:
        <ol style={{ margin: "8px 0 0 20px", padding: 0 }}>
          <li><strong>Part 1 — Training Content:</strong> Track pending training topics for GSS NSX engineers, including assignments, formats, and delivery status.</li>
          <li><strong>Part 2 — Broken Link Audit:</strong> Systematically identify and remediate broken links across GSS NSX Confluence pages following the VMware-to-Broadcom domain migrations.</li>
        </ol>
      </InfoBox>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 12 }}>Status Badge Key</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <StatusBadge label="Unassigned" color="yellow" />
          <StatusBadge label="Assigned" color="blue" />
          <StatusBadge label="In Progress" color="blue" />
          <StatusBadge label="Completed" color="green" />
          <StatusBadge label="Verified" color="green" />
          <StatusBadge label="Blocked" color="red" />
          <StatusBadge label="Dead Link" color="red" />
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: 12 }}>Summary Statistics</h2>
        <table style={{ maxWidth: 600 }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Items</th>
              <th>Unassigned</th>
              <th>In Progress</th>
              <th>Completed</th>
              <th>Blocked</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Training Topics</td>
              <td>{allTrainings.length}</td>
              <td>{countByStatus(allTrainings).yellow}</td>
              <td>{countByStatus(allTrainings).blue}</td>
              <td>{countByStatus(allTrainings).green}</td>
              <td>{countByStatus(allTrainings).red}</td>
            </tr>
            <tr>
              <td>Broken Link Audit</td>
              <td>{allAuditItems.length}</td>
              <td>{countByStatus(allAuditItems).yellow}</td>
              <td>{countByStatus(allAuditItems).blue}</td>
              <td>{countByStatus(allAuditItems).green}</td>
              <td>{countByStatus(allAuditItems).red}</td>
            </tr>
            <tr>
              <td>Content Inventory</td>
              <td>{contentInventory.length}</td>
              <td>{countByStatus(contentInventory).yellow}</td>
              <td>{countByStatus(contentInventory).blue}</td>
              <td>{countByStatus(contentInventory).green}</td>
              <td>{countByStatus(contentInventory).red}</td>
            </tr>
            <tr>
              <td>Deletion Candidates</td>
              <td>{deletionCandidates.length}</td>
              <td>{countByStatus(deletionCandidates).yellow}</td>
              <td>{countByStatus(deletionCandidates).blue}</td>
              <td>{countByStatus(deletionCandidates).green}</td>
              <td>{countByStatus(deletionCandidates).red}</td>
            </tr>
            <tr style={{ fontWeight: 600 }}>
              <td>Total</td>
              <td>{allItems.length}</td>
              <td>{counts.yellow}</td>
              <td>{counts.blue}</td>
              <td>{counts.green}</td>
              <td>{counts.red}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
