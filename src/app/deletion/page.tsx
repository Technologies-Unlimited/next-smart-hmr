import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { deletionCandidates } from "@/data/deletion";

export default function DeletionPage() {
  return (
    <>
      <PageHeader
        title="Deletion Candidates"
        description="Pages nominated for deletion from the GSS NSX Confluence space"
      />
      <InfoBox variant="warning">
        <strong>Process:</strong> Before a page can be deleted, it must be reviewed by at least one team lead. Any content worth preserving should be migrated to the designated destination page first. Only mark a page as &quot;Approved&quot; once migration is complete and verified.
      </InfoBox>
      {deletionCandidates.length === 0 ? (
        <p style={{ color: "var(--muted)", fontStyle: "italic", marginTop: 16 }}>
          No pages have been nominated for deletion yet. Use the Content Inventory to identify candidates.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Page Title</th>
              <th>Reason for Deletion</th>
              <th>Content to Migrate</th>
              <th>Migration Destination</th>
              <th>Nominated By</th>
              <th>Reviewed By</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deletionCandidates.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.pageTitle}</td>
                <td>{item.reason}</td>
                <td>{item.contentToMigrate}</td>
                <td>{item.migrationDestination}</td>
                <td>{item.nominatedBy}</td>
                <td>{item.reviewedBy || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
                <td><StatusBadge label={item.status} color={item.statusColor} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
