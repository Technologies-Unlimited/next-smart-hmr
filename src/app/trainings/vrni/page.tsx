import { PageHeader } from "@/components/PageHeader";
import { TrainingTable } from "@/components/TrainingTable";
import { vrniTrainings } from "@/data/trainings";

export default function VrniTrainingsPage() {
  return (
    <>
      <PageHeader
        title="vRNI / Aria Operations for Networks Training Topics"
        description="Pending training content for vRealize Network Insight (now Aria Operations for Networks)"
      />
      <TrainingTable items={vrniTrainings} />
    </>
  );
}
