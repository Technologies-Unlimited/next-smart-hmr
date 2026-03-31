import { PageHeader } from "@/components/PageHeader";
import { TrainingTable } from "@/components/TrainingTable";
import { InfoBox } from "@/components/InfoBox";
import { hcxTrainings } from "@/data/trainings";

export default function HcxTrainingsPage() {
  return (
    <>
      <PageHeader
        title="HCX Training Topics"
        description="Pending training content for HCX-specific topics"
      />
      <InfoBox variant="note">
        No HCX training topics have been submitted yet. If you have a topic suggestion, please add it to the tracker.
      </InfoBox>
      <TrainingTable items={hcxTrainings} />
    </>
  );
}
