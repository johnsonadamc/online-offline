// src/magazine/core/selectionLogic.ts — Template selection decision tree.
// Implements the rules from src/magazine/SELECTION_LOGIC.md exactly.

import type {
  SelectionItem,
  TemplateAssignment,
  ContentPageData,
  CollabPageData,
  CommunicationsPageData,
  CampaignPageData,
} from './types';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function totalCaptionWords(entries: Array<{ caption?: string }>): number {
  return entries.reduce((sum, e) => sum + countWords(e.caption ?? ''), 0);
}

// Poetry detection: ALL three conditions must hold.
function isPoetry(body: string): boolean {
  if (!body.includes('\n\n')) return false; // must have a stanza break

  const lines = body.split('\n');
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  if (nonEmpty.length === 0) return false;

  const avgLineLen = nonEmpty.reduce((s, l) => s + l.length, 0) / nonEmpty.length;
  if (avgLineLen >= 60) return false;

  const words = countWords(body);
  if (words === 0) return false;
  const lineBreaksPer100Words = (lines.length / words) * 100;
  return lineBreaksPer100Words >= 3;
}

function splitBody(body: string): { para1: string; para2: string; para3: string } {
  const paras = body.split(/\n\n+/);
  return { para1: paras[0] ?? body, para2: paras[1] ?? '', para3: paras[2] ?? '' };
}

export function selectTemplate(item: SelectionItem, pageStart: number): TemplateAssignment {
  switch (item.kind) {
    case 'creator': {
      const { contentType, submissionType, entries, pageTitle, contributor, season } = item;

      // ── Music ─────────────────────────────────────────────────────────────
      if (contentType === 'music') {
        const data: ContentPageData = {
          page: pageStart, type: contentType, page_title: pageTitle,
          season, contributor, entries,
        };
        return { templateName: 'MusicPage', pageCount: 1, data };
      }

      // ── Essay / Poetry ────────────────────────────────────────────────────
      if (contentType === 'essay' || contentType === 'poetry') {
        const body = entries[0]?.caption ?? '';
        const wordCount = countWords(body);

        if (isPoetry(body)) {
          const data: ContentPageData = {
            page: pageStart, type: 'poetry', page_title: pageTitle,
            season, contributor, entries, body, word_count: wordCount,
          };
          return { templateName: 'PoetryPage', pageCount: 1, data };
        }

        if (wordCount <= 500) {
          const { para1, para2, para3 } = splitBody(body);
          const data: ContentPageData = {
            page: pageStart, type: contentType, page_title: pageTitle,
            season, contributor, entries,
            body, word_count: wordCount,
            body_para1: para1, body_para2: para2, body_para3: para3,
          };
          return { templateName: 'TextSubmission', pageCount: 1, data };
        }

        const truncated = wordCount > 1800
          ? body.split(/\s+/).slice(0, 1800).join(' ') + '…'
          : body;
        const { para1, para2, para3 } = splitBody(truncated);
        const data: ContentPageData = {
          page: pageStart, type: contentType, page_title: pageTitle,
          season, contributor, entries,
          body: truncated, word_count: Math.min(wordCount, 1800),
          body_para1: para1, body_para2: para2, body_para3: para3,
        };
        return { templateName: 'TextSpread', pageCount: 2, data };
      }

      // ── Photography / Art ─────────────────────────────────────────────────
      if (submissionType === 'fullSpread') {
        const data: ContentPageData = {
          page: pageStart, type: contentType, page_title: pageTitle,
          season, contributor, entries,
        };
        return { templateName: 'SpreadPanorama', pageCount: 2, data };
      }

      const count = entries.length;
      const captionWords = totalCaptionWords(entries);

      let templateName: string;
      if (count === 1 && captionWords <= 50) templateName = 'SpreadPanorama';
      else if (count === 1)                  templateName = 'Spread';
      else if (count === 2)                  templateName = 'Spread2';
      else if (count <= 4)                   templateName = 'Spread4';
      else if (count <= 6)                   templateName = 'SpreadMosaic';
      else                                   templateName = 'Spread6';

      const data: ContentPageData = {
        page: pageStart, type: contentType, page_title: pageTitle,
        season, contributor, entries,
      };
      return { templateName, pageCount: 2, data };
    }

    case 'collab': {
      const { collabTitle, participationMode, displayText, entries, location, season } = item;
      const templateMap: Record<string, string> = {
        community: 'CollabSpreadCommunity',
        local:     'CollabSpreadLocal',
        private:   'CollabSpreadPrivate',
      };
      const data: CollabPageData = {
        page: pageStart, collab_title: collabTitle,
        mode: participationMode, season, display_text: displayText,
        location, entries,
      };
      return {
        templateName: templateMap[participationMode] ?? 'CollabSpreadCommunity',
        pageCount: 2,
        data,
      };
    }

    case 'communications': {
      const data: CommunicationsPageData = {
        page: pageStart, season: item.season, messages: item.messages,
      };
      return { templateName: 'CommunicationsPage', pageCount: 1, data };
    }

    case 'campaign': {
      const { campaignName, tagline, discount, avatar_url } = item;
      const data: CampaignPageData = {
        page: pageStart, campaign_name: campaignName, tagline, discount, avatar_url,
      };
      return { templateName: 'CampaignPage', pageCount: 1, data };
    }
  }
}
