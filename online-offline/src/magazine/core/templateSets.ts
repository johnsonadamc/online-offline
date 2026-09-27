// src/magazine/core/templateSets.ts — Template-set loader.
//
// A template set restyles some templates without touching base. Its files are spliced into the
// page's ONE <script type="text/babel"> block (generator.ts buildPageHtml), after primitives + the
// base template file and before the bootstrap that looks the component up as window[templateName].
// A second <script> block would be too late: the bootstrap runs at the end of the first block.
// The set code is wrapped in an IIFE so its top-level declarations (even one named Folio or C)
// cannot clobber the primitives base templates resolve lexically; a set publishes ONLY through its
// own Object.assign(window, { … }). Anything the set does not provide renders from base.
// See src/magazine/templates/sets/README.md.

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

export interface TemplateSetManifest {
  name: string;
  provides: string[];                        // pipeline template names this set renders
  files: string[];                           // .jsx files, relative to the set folder, in load order
  fontCss?: string;                          // CSS injected as <style> after the Google Fonts <link>
  nameMap?: Record<string, string>;          // kit component name → pipeline template name
  adapt?: (templateName: string, data: unknown) => unknown; // Node-side data adapter (provided names only)
}

export interface LoadedTemplateSet {
  code: string;      // the IIFE, ready to splice
  fontCss: string;   // '' when the manifest has none
  manifest: TemplateSetManifest;
}

export const TEMPLATE_SETS_DIR = join(process.cwd(), 'src/magazine/templates/sets');

// Every name the pipeline can ask the renderer for: selectTemplate()'s outputs
// (src/magazine/core/selectionLogic.ts) plus the four the generator adds itself.
export const EMITTABLE_TEMPLATES: readonly string[] = [
  'MusicPage', 'PoetryPage', 'TextSubmission', 'TextSpread',
  'SpreadPanorama', 'Spread', 'Spread2', 'Spread4', 'SpreadMosaic', 'Spread6',
  'CollabSpreadCommunity', 'CollabSpreadLocal', 'CollabSpreadPrivate',
  'CommunicationsPage', 'CampaignPage',
  'CoverA', 'BlankPage', 'FrontMatter', 'ColophonPage',
];

// Resolve the run's set name. Precedence: explicit flag > periods.template_set_name > none.
// null, '' and 'base' all mean "no set" (the flag value 'base' therefore forces base over the column).
export function resolveTemplateSetName(flag: string | null | undefined, column: string | null | undefined): string | null {
  const pick = flag !== undefined && flag !== null ? flag : column;
  if (!pick || pick === 'base') return null;
  return pick;
}

export async function loadTemplateSet(name: string, setsDir: string = TEMPLATE_SETS_DIR): Promise<LoadedTemplateSet> {
  const dir = join(setsDir, name);
  if (!existsSync(dir)) throw new Error(`Template set "${name}" not found: ${dir}`);
  const manifestPath = join(dir, 'manifest.ts');
  if (!existsSync(manifestPath)) throw new Error(`Template set "${name}" has no manifest.ts: ${manifestPath}`);

  const mod = await import(pathToFileURL(manifestPath).href);
  const manifest: TemplateSetManifest | undefined = mod.default ?? mod.manifest;
  if (!manifest || !Array.isArray(manifest.provides) || !Array.isArray(manifest.files)) {
    throw new Error(`Template set "${name}": manifest.ts must export default { name, provides, files, … }`);
  }

  for (const p of manifest.provides) {
    if (!EMITTABLE_TEMPLATES.includes(p)) {
      console.warn(`[templateSets] "${name}" provides "${p}", which the pipeline never renders — ignored`);
    }
  }

  const sources = manifest.files.map(f => {
    const path = join(dir, f);
    if (!existsSync(path)) throw new Error(`Template set "${name}": missing file ${path}`);
    return readFileSync(path, 'utf-8');
  });

  const aliases = Object.entries(manifest.nameMap ?? {})
    .map(([kit, pipeline]) => `Object.assign(window, { ${JSON.stringify(pipeline)}: window[${JSON.stringify(kit)}] });`);

  const iife = `(function(){\n${[...sources, ...aliases].join('\n')}\n})();`;
  return { code: guardBaseGlobals(iife, manifest.provides), fontCss: manifest.fontCss ?? '', manifest };
}

// ─── Window-clobber guard ─────────────────────────────────────────────────────
// The IIFE keeps a set's top-level DECLARATIONS private, but not what it assigns to window.
// Base's primitives and templates are global function declarations, i.e. properties of window,
// and base templates resolve them through the global object — so a set that publishes its own
// Folio via Object.assign(window, …) replaces base's Folio for every base template on the page
// (proven in Session P: base SpreadMosaic lost both folios). The guard snapshots every name base
// publishes before the set runs and restores each one the set does not provide afterwards; the
// set's provided names (after nameMap) are the only ones it may change.
//
// The name list is DERIVED at load time from base's own Object.assign(window, { … }) calls
// (primitives.jsx + templates/base/*.jsx) rather than kept as a constant: a primitive or template
// added to base is covered automatically, with no second list to drift out of sync.
const BASE_PRIMITIVES = join(process.cwd(), 'src/magazine/core/primitives.jsx');
const BASE_TEMPLATES_DIR = join(process.cwd(), 'src/magazine/templates/base');

export function baseWindowNames(): string[] {
  const files = [BASE_PRIMITIVES, ...readdirSync(BASE_TEMPLATES_DIR).filter(f => f.endsWith('.jsx')).sort().map(f => join(BASE_TEMPLATES_DIR, f))];
  const names = new Set<string>();
  for (const f of files) {
    for (const m of readFileSync(f, 'utf-8').matchAll(/Object\.assign\(\s*window\s*,\s*\{([^}]*)\}/g)) {
      for (const n of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        if (!/^[A-Za-z_$][\w$]*$/.test(n)) throw new Error(`[templateSets] cannot parse base window export "${n}" in ${f}`);
        names.add(n);
      }
    }
  }
  if (names.size === 0) throw new Error('[templateSets] found no base Object.assign(window, …) exports — guard would be empty');
  return [...names].sort();
}

function guardBaseGlobals(iife: string, provides: string[]): string {
  const guarded = baseWindowNames().filter(n => !provides.includes(n));
  return [
    '(function(){',
    `var __ooNames = ${JSON.stringify(guarded)}, __ooHad = {}, __ooSnap = {};`,
    '__ooNames.forEach(function(k){ __ooHad[k] = k in window; __ooSnap[k] = window[k]; });',
    iife,
    '__ooNames.forEach(function(k){ if (__ooHad[k]) { window[k] = __ooSnap[k]; } else { delete window[k]; } });',
    '})();',
  ].join('\n');
}
