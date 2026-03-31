import { PageHeader } from "@/components/PageHeader";
import { TrainingTable } from "@/components/TrainingTable";
import { InfoBox } from "@/components/InfoBox";
import { nsxTrainings } from "@/data/trainings";

export default function NsxTrainingsPage() {
  return (
    <>
      <PageHeader
        title="NSX Training Topics"
        description="Pending training content for NSX-specific topics"
      />
      <InfoBox variant="info">
        These are training topics identified by the GSS NSX team as high-value content for upskilling engineers. If you would like to claim a topic, update the Owner(s) field and change the status to <strong>Assigned</strong>.
      </InfoBox>
      <TrainingTable items={nsxTrainings} />
    </>
  );
}
