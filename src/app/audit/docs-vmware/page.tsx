import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { docsVmwareLinks } from "@/data/audit-docs-vmware";

export default function DocsVmwarePage() {
  return (
    <>
      <PageHeader
        title="Broken Links: docs.vmware.com"
        description="Links pointing to docs.vmware.com that are now broken after the Broadcom acquisition"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> Most docs.vmware.com links need to be updated to point to <strong>techdocs.broadcom.com</strong>. The URL structure has changed significantly. Each link must be manually verified to find the correct new location on the Broadcom documentation portal.
      </InfoBox>
      <BrokenLinkTable items={docsVmwareLinks} />
    </>
  );
}
