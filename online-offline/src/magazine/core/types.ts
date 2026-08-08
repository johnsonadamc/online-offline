// src/magazine/core/types.ts — Data shapes for the magazine generation pipeline

export interface ContributorData {
  name: string;
  city: string;
}

export interface ContentEntryData {
  title?: string;
  caption?: string;
  media_url?: string;
  focal_x?: number;
  focal_y?: number;
  aspect_ratio?: number | null;
}

export interface ContentPageData {
  page: number;
  type: string;
  page_title: string;
  season: string;
  contributor: ContributorData;
  entries: ContentEntryData[];
  body?: string;
  word_count?: number;
  pull_quote?: string;
  body_para1?: string;
  body_para2?: string;
  body_para3?: string;
}

export interface CollabEntryData extends ContentEntryData {
  contributor: ContributorData;
}

export interface CollabPageData {
  page: number;
  collab_title: string;
  mode: string;
  season: string;
  display_text: string;
  location?: string;
  city?: string;
  entries: CollabEntryData[];
}

export interface CommunicationMessage {
  from: { name: string; city: string };
  to: { name: string };
  date: string;
  subject?: string;
  body: string;
}

export interface CommunicationsPageData {
  page: number;
  season: string;
  messages: CommunicationMessage[];
}

export interface CampaignPageData {
  page: number;
  campaign_name: string;
  tagline: string;
  discount: number;
  focal_x?: number;
  focal_y?: number;
  avatar_url?: string;
}

export interface CoverData {
  page: number;
  season: string;
  volume?: string;
  issue?: number;
}

export interface TocEntry {
  page: number;
  contributor: string;
  type: string;
  title: string;
}

export interface FrontMatterData {
  page: number;
  curator: { name: string; city: string };
  season: string;
  toc: TocEntry[];
}

export interface ColophonData {
  page: number;
  season: string;
  contributors: ContributorData[];
  printer: string;
  edition_number: number;
  edition_total: number;
}

export type TemplateData =
  | ContentPageData
  | CollabPageData
  | CommunicationsPageData
  | CampaignPageData
  | CoverData
  | FrontMatterData
  | ColophonData;

export interface TemplateAssignment {
  templateName: string;
  pageCount: number;
  data: TemplateData;
}

export type ContentType = 'photography' | 'art' | 'essay' | 'poetry' | 'music';
export type ParticipationMode = 'community' | 'local' | 'private';

export interface SelectionItemCreator {
  kind: 'creator';
  creatorId: string;
  contentType: ContentType;
  submissionType: 'regular' | 'fullSpread';
  entries: ContentEntryData[];
  pageTitle: string;
  contributor: ContributorData;
  season: string;
}

export interface SelectionItemCollab {
  kind: 'collab';
  collabId: string;
  collabTitle: string;
  participationMode: ParticipationMode;
  location?: string;
  city?: string;
  displayText: string;
  entries: CollabEntryData[];
  season: string;
}

export interface SelectionItemCommunications {
  kind: 'communications';
  messages: CommunicationMessage[];
  season: string;
}

export interface SelectionItemCampaign {
  kind: 'campaign';
  campaignId: string;
  campaignName: string;
  tagline: string;
  discount: number;
  avatar_url?: string;
}

export type SelectionItem =
  | SelectionItemCreator
  | SelectionItemCollab
  | SelectionItemCommunications
  | SelectionItemCampaign;

// ─── Print Profiles ───────────────────────────────────────────────────────────
// A print profile maps the fixed design canvas (768×1032 trim + 11px bleed =
// 790×1054) onto a specific printer's required PDF geometry at output time.
// Templates never change; only the PDF assembly stage reads these.
export interface PrintProfile {
  name: string;
  pageWidthIn: number;          // exact output PDF page size (what gets uploaded)
  pageHeightIn: number;
  trimWidthIn: number;          // printer's trim box — the design trim maps onto this
  trimHeightIn: number;
  bleedTopIn: number;
  bleedBottomIn: number;
  bleedInsideIn: number;        // spine side
  bleedOutsideIn: number;       // outer edge
  includePrinterMarks: boolean; // false = suppress BleedMarks/RegistrationMark in render
  deviceScaleFactor: number;    // Puppeteer render resolution
  imageFormat: 'png' | 'jpeg';  // page raster format embedded in the PDF
  jpegQuality?: number;         // only for imageFormat 'jpeg'
}
