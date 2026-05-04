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
