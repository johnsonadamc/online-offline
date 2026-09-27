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

import { existsSync, readFileSync } from 'fs';
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

  const code = `(function(){\n${[...sources, ...aliases].join('\n')}\n})();`;
  return { code, fontCss: manifest.fontCss ?? '', manifest };
}
