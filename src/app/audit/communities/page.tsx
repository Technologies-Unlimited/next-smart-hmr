import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { communitiesLinks } from "@/data/audit-communities";

export default function CommunitiesPage() {
  return (
    <>
      <PageHeader
        title="Broken Links: communities.vmware.com"
        description="VMware Communities forum links that may have changed or been archived"
      />
      <InfoBox variant="info">
        <strong>Note:</strong> The VMware Communities site has been migrated to the Broadcom community platform. Some threads may still be accessible via redirects, but URL structures have changed.
      </InfoBox>
      <BrokenLinkTable items={communitiesLinks} />
    </>
  );
}
