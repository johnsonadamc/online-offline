// src/magazine/core/printProfiles.ts — Printer output profiles.
//
// The design canvas is the master and never changes: 768×1032 px trim with an
// 11px bleed on every side → 790×1054 px rendered canvas. A profile describes
// the PDF geometry a specific printer requires; the generator's assembly stage
// scales/positions the rendered canvas so the design trim maps exactly onto the
// profile trim, with the design bleed extending into the profile's bleed zones.

import type { PrintProfile } from './types';

// Convert inches → PDF points (72 pt/in), rounded to 1e-4 pt so values defined
// via division (e.g. 790/72 in for the screen profile) round-trip exactly.
export function inToPt(v: number): number {
  return Math.round(v * 72 * 1e4) / 1e4;
}

export const PRINT_PROFILES: Record<string, PrintProfile> = {
  // Current behavior, and the default: page = the full 790×1054 pt design
  // canvas, symmetric 11px bleed, printer marks rendered, PNG at
  // deviceScaleFactor 4. The generic mapping math degenerates to scale 1.0 and
  // offset (0,0), so output is unchanged from the pre-profile pipeline.
  screen: {
    name: 'screen',
    pageWidthIn:  790 / 72,
    pageHeightIn: 1054 / 72,
    trimWidthIn:  768 / 72,
    trimHeightIn: 1032 / 72,
    bleedTopIn:    11 / 72,
    bleedBottomIn: 11 / 72,
    bleedInsideIn: 11 / 72,
    bleedOutsideIn: 11 / 72,
    safetyInsetIn: 0,
    includePrinterMarks: true,
    deviceScaleFactor: 4,
    imageFormat: 'png',
  },

  // MagCloud "Standard" 8.25×10.75in trim magazine: uploaded PDF must be
  // exactly 8.5×11in (612×792pt) per page, bleed 0.125in top/bottom, 0.25in on
  // the outside edge and 0 on the spine side, and no printer marks of any kind.
  // Sanity: 8.25 + 0.25 + 0 = 8.5 ✓ · 10.75 + 0.125 + 0.125 = 11 ✓
  // deviceScaleFactor 3 + JPEG keeps files under MagCloud's 300MB upload cap
  // (~279×288 dpi effective on the 8.25×10.75in trim).
  magcloud: {
    name: 'magcloud',
    pageWidthIn:  8.5,
    pageHeightIn: 11,
    trimWidthIn:  8.25,
    trimHeightIn: 10.75,
    bleedTopIn:    0.125,
    bleedBottomIn: 0.125,
    bleedInsideIn: 0,
    bleedOutsideIn: 0.25,
    // 0.1in extra headroom: MagCloud trims with ±1/8in variance, and mapping the
    // design trim exactly onto their trim left bottom-edge folios/captions in
    // the danger zone. The design trim maps onto the trim rect inset by this on
    // all four sides; a full-page bleed underlay fills the page edges.
    safetyInsetIn: 0.1,
    includePrinterMarks: false,
    deviceScaleFactor: 3,
    imageFormat: 'jpeg',
    jpegQuality: 92,
  },
};
