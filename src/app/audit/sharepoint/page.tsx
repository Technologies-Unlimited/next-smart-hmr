import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { sharepointLinks } from "@/data/audit-sharepoint";

export default function SharePointPage() {
  return (
    <>
      <PageHeader
        title="Broken Links: SharePoint (onevmw-my.sharepoint.com)"
        description="SharePoint personal and team links that may have changed after migration"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> SharePoint links under onevmw-my.sharepoint.com may have changed due to the VMware-to-Broadcom tenant migration. Files may have been moved to new SharePoint sites or different storage locations.
      </InfoBox>
      <BrokenLinkTable items={sharepointLinks} />
    </>
  );
}
