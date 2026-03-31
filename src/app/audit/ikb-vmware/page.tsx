import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { ikbVmwareLinks } from "@/data/audit-ikb-vmware";

export default function IkbVmwarePage() {
  return (
    <>
      <PageHeader
        title="Broken Links: ikb.vmware.com"
        description="Internal Knowledge Base links that are broken after domain migration"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> The ikb.vmware.com domain has been decommissioned. Articles may have been migrated to the Broadcom support portal or may need to be recreated. Check the Broadcom Knowledge Base for equivalent content.
      </InfoBox>
      <BrokenLinkTable items={ikbVmwareLinks} />
    </>
  );
}
