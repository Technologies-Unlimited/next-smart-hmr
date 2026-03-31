import { PageHeader } from "@/components/PageHeader";
import { TrainingTable } from "@/components/TrainingTable";
import { computeTrainings } from "@/data/trainings";

export default function ComputeTrainingsPage() {
  return (
    <>
      <PageHeader
        title="Compute Cross-Skilling Training Topics"
        description="Cross-skilling topics for NSX engineers to learn compute/ESXi fundamentals"
      />
      <TrainingTable items={computeTrainings} />
    </>
  );
}
