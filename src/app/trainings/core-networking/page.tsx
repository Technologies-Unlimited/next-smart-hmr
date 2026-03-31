import { PageHeader } from "@/components/PageHeader";
import { TrainingTable } from "@/components/TrainingTable";
import { coreNetworkingTrainings } from "@/data/trainings";

export default function CoreNetworkingTrainingsPage() {
  return (
    <>
      <PageHeader
        title="Core Networking Training Topics"
        description="Pending training content for core networking topics (vSwitch, ESXi networking, etc.)"
      />
      <TrainingTable items={coreNetworkingTrainings} />
    </>
  );
}
