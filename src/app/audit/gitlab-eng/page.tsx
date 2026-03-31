import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { gitlabEngLinks } from "@/data/audit-gitlab";

export default function GitlabEngPage() {
  return (
    <>
      <PageHeader
        title="Broken Links: gitlab.eng.vmware.com"
        description="Internal GitLab links that may no longer be accessible"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> The gitlab.eng.vmware.com instance has been decommissioned. Repositories may have been migrated to GitHub Enterprise or other internal platforms. Check with Engineering for new locations.
      </InfoBox>
      <BrokenLinkTable items={gitlabEngLinks} />
    </>
  );
}
