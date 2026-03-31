import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { bugzillaLinks } from "@/data/audit-bugzilla";

export default function BugzillaPage() {
  return (
    <>
      <PageHeader
        title="Broken Links: Bugzilla"
        description="Links to bugzilla.eng.vmware.com that are no longer accessible"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> Bugzilla (bugzilla.eng.vmware.com) has been decommissioned as part of the Broadcom transition. Bug references should be updated to point to the new Jira-based tracking system where applicable, or noted as historical references.
      </InfoBox>
      <p style={{ color: "var(--muted)", fontSize: "0.8125rem", marginBottom: 16 }}>
        Note: Items 07 and 08 were removed as duplicates during the initial audit.
      </p>
      <BrokenLinkTable items={bugzillaLinks} />
    </>
  );
}
