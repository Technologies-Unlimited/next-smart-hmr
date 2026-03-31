import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { kbVmwareLinks } from "@/data/audit-kb-vmware";

export default function KbVmwarePage() {
  return (
    <>
      <PageHeader
        title="Broken Links: kb.vmware.com"
        description="VMware Knowledge Base links that may have migrated to Broadcom support"
      />
      <InfoBox variant="info">
        <strong>Migration Note:</strong> kb.vmware.com articles have been migrated to the Broadcom support portal at <strong>knowledge.broadcom.com</strong>. Some article numbers may have changed. Verify each link against the new portal.
      </InfoBox>
      <BrokenLinkTable items={kbVmwareLinks} />
    </>
  );
}
