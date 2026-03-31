import { PageHeader } from "@/components/PageHeader";
import { BrokenLinkTable } from "@/components/BrokenLinkTable";
import { InfoBox } from "@/components/InfoBox";
import { viaVmwLinks } from "@/data/audit-via-vmw";

export default function ViaVmwPage() {
  return (
    <>
      <PageHeader
        title="Broken Links: via.vmw.com"
        description="VMware internal short links (via.vmw.com) that may no longer resolve"
      />
      <InfoBox variant="warning">
        <strong>Migration Note:</strong> The via.vmw.com URL shortener service may have been decommissioned. These short links need to be resolved to their original destinations and then checked for validity.
      </InfoBox>
      <BrokenLinkTable items={viaVmwLinks} />
    </>
  );
}
