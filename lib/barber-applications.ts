// Barber-partner applications submitted on the marketing site (0031, 0034).
// The stages must match barber_applications_status_check.
export const APPLICATION_STAGES = [
  { value: "submitted", label: "New", chip: "NEW" },
  { value: "verifying", label: "Verifying", chip: "VERIFYING" },
  { value: "interview_scheduled", label: "Interview", chip: "INTERVIEW" },
  { value: "training", label: "Training", chip: "TRAINING" },
  { value: "active", label: "Active", chip: "ACTIVE" },
  { value: "not_yet", label: "Not yet", chip: "NOT YET" },
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number]["value"];

export const APPLICATIONS_BUCKET = "barber-applications";

export const stageChip = (status: string) =>
  APPLICATION_STAGES.find((s) => s.value === status)?.chip ?? status.toUpperCase();

export const isImagePath = (path: string) => /\.(jpe?g|png)$/i.test(path);
