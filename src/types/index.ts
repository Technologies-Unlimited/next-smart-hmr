export type StatusColor = "yellow" | "blue" | "green" | "red";

export interface TrainingItem {
  id: string;
  topic: string;
  owners: string;
  format: string;
  status: string;
  statusColor: StatusColor;
  links: string;
  notes: string;
}

export interface BrokenLinkItem {
  id: string;
  sourcePage: string;
  sourceUrl: string;
  description: string;
  brokenUrl: string;
  claimedBy: string;
  status: string;
  statusColor: StatusColor;
  newUrl: string;
  notes: string;
}

export interface ZoomRecordingItem {
  id: string;
  sourcePage: string;
  sourceUrl: string;
  description: string;
  recordingUrl: string;
  originalPasscode: string;
  originalPresenter: string;
  checkedBy: string;
  status: string;
  statusColor: StatusColor;
  newPresenter: string;
  newUrl: string;
  newPasscode: string;
  notes: string;
}

export interface ConfluenceEngItem {
  id: string;
  sourcePage: string;
  sourceUrl: string;
  description: string;
  claimedBy: string;
  status: string;
  statusColor: StatusColor;
  notes: string;
}

export interface ContentInventoryItem {
  id: string;
  pageTitle: string;
  pageUrl: string;
  contents: string;
  duplicateOverlap: string;
  recommendedAction: string;
  owner: string;
  status: string;
  statusColor: StatusColor;
}

export interface DeletionCandidate {
  id: string;
  pageTitle: string;
  reason: string;
  contentToMigrate: string;
  migrationDestination: string;
  nominatedBy: string;
  reviewedBy: string;
  status: string;
  statusColor: StatusColor;
}

export interface DeadToolItem {
  id: string;
  sourcePage: string;
  sourceUrl: string;
  description: string;
  deadUrl: string;
  claimedBy: string;
  status: string;
  statusColor: StatusColor;
  newUrl: string;
  notes: string;
}

export interface EmailAliasItem {
  id: string;
  sourcePage: string;
  sourceUrl: string;
  description: string;
  oldAddress: string;
  claimedBy: string;
  status: string;
  statusColor: StatusColor;
  currentAddress: string;
  notes: string;
}

export interface ExternalLinkItem {
  id: string;
  sourcePage: string;
  sourceUrl: string;
  description: string;
  url: string;
  claimedBy: string;
  status: string;
  statusColor: StatusColor;
  notes: string;
}

export interface WolkenKbItem {
  id: string;
  sourcePage: string;
  sourceUrl: string;
  description: string;
  url: string;
  claimedBy: string;
  status: string;
  statusColor: StatusColor;
  notes: string;
}
