import { PageHeader } from "@/components/PageHeader";
import { InfoBox } from "@/components/InfoBox";
import { StatusBadge } from "@/components/StatusBadge";
import { zoomRecordings } from "@/data/audit-zoom";

export default function ZoomRecordingsPage() {
  return (
    <>
      <PageHeader
        title="Zoom Recording Audit"
        description="Zoom recordings linked from Confluence pages that need verification"
      />
      <InfoBox variant="warning">
        <strong>Action Required:</strong> Zoom recordings linked from Confluence pages may have expired, been deleted, or have changed passcodes after the VMware-to-Broadcom transition. Each recording must be checked for accessibility. If a recording is no longer available, attempt to identify the original presenter and request a re-upload or find an alternative.
      </InfoBox>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Source Page</th>
              <th>Recording Description</th>
              <th>Original Passcode</th>
              <th>Original Presenter</th>
              <th>Checked By</th>
              <th>Status</th>
              <th>New Presenter</th>
              <th>New URL</th>
              <th>New Passcode</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {zoomRecordings.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6" }}>{item.sourcePage}</a>
                  ) : item.sourcePage}
                </td>
                <td>{item.description}</td>
                <td><code style={{ fontSize: "0.75rem" }}>{item.originalPasscode}</code></td>
                <td>{item.originalPresenter}</td>
                <td>{item.checkedBy || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
                <td><StatusBadge label={item.status} color={item.statusColor} /></td>
                <td>{item.newPresenter || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
                <td>{item.newUrl || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
                <td>{item.newPasscode || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
                <td>{item.notes || <span style={{ color: "var(--muted)" }}>&mdash;</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
