/**
 * RCML Element Validation Script
 *
 * Creates a campaign in Rule.io with a template showcasing every RCML
 * element type. Uses the brand-aware builders (UUIDs on every node) so
 * the template is fully editor-compatible.
 *
 * Reads RULE_API_KEY from .env file automatically.
 *
 * Usage:
 *   npx tsx scripts/validate-rcml.ts                    # Create full showcase
 *   npx tsx scripts/validate-rcml.ts --cleanup          # Delete created resources
 *   npx tsx scripts/validate-rcml.ts --probe            # Test each section individually
 *   npx tsx scripts/validate-rcml.ts --sections=1,2,6   # Create with specific sections only
 *
 * .env variables:
 *   RULE_API_KEY          — Required
 *   RULE_BRAND_STYLE_ID   — Brand style ID to use (auto-detects first one if omitted)
 *   RULE_CUSTOM_FIELD_ID  — Custom field ID for placeholder test (auto-detects if omitted)
 *   RULE_FROM_EMAIL       — Sender email (default: test@example.com)
 *   RULE_FROM_NAME        — Sender name (default: SDK RCML Validation)
 */

import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RuleClient,
  toBrandStyleConfig,
  createBrandTemplate,
  createDefaultContentSection,
  createFooterSection,
  createBrandLogo,
  createBrandHeading,
  createBrandText,
  createBrandButton,
  createContentSection,
  createDocWithPlaceholders,
  createTextNode,
  createPlaceholder,
} from '../src';
import type {
  BrandStyleConfig,
  RCMLBodyChild,
  RCMLColumnChild,
  RCMLProseMirrorDoc,
} from '../src';

// ---------------------------------------------------------------------------
// Load .env file
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

function loadEnv(): void {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.RULE_API_KEY;
const IDS_FILE = join(__dirname, '.validate-rcml-ids.json');

if (!API_KEY) {
  console.error('Error: RULE_API_KEY environment variable is required.');
  console.error('Put RULE_API_KEY in .env or pass it directly.');
  process.exit(1);
}

const isCleanup = process.argv.includes('--cleanup');
const isProbe = process.argv.includes('--probe');
const onlySections = process.argv
  .find(a => a.startsWith('--sections='))
  ?.slice('--sections='.length)
  .split(',')
  .map(Number);

// ---------------------------------------------------------------------------
// Helpers — all produce nodes with UUIDs
// ---------------------------------------------------------------------------

const id = (): string => randomUUID();

/** Plain ProseMirror doc from a string */
function doc(text: string): RCMLProseMirrorDoc {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

/** Rich ProseMirror doc with inline nodes */
function richDoc(nodes: RCMLProseMirrorDoc['content'][0][]): RCMLProseMirrorDoc {
  return { type: 'doc', content: [{ type: 'paragraph', content: nodes }] };
}

/** Section label — grey bar to separate test groups in the editor */
function label(title: string): RCMLBodyChild {
  return {
    tagName: 'rc-section',
    id: id(),
    attributes: { 'background-color': '#E0E0E0', padding: '8px 0' },
    children: [{
      tagName: 'rc-column',
      id: id(),
      attributes: { padding: '0 20px' },
      children: [{
        tagName: 'rc-heading',
        id: id(),
        attributes: {
          align: 'center',
          color: '#666666',
          'font-size': '13px',
          'font-weight': '700',
          'font-family': 'monospace',
          padding: '0',
        },
        content: doc(title),
      }],
    }],
  } as RCMLBodyChild;
}

/** Centered section with UUID on section + column */
function section(children: RCMLColumnChild[], bg?: string): RCMLBodyChild {
  return {
    tagName: 'rc-section',
    id: id(),
    attributes: {
      padding: '20px 0',
      ...(bg && { 'background-color': bg }),
    },
    children: [{
      tagName: 'rc-column',
      id: id(),
      attributes: { padding: '0 20px' },
      children,
    }],
  } as RCMLBodyChild;
}

/** Two-column section with UUIDs */
function twoColSection(
  left: RCMLColumnChild[],
  right: RCMLColumnChild[],
  leftWidth = '50%',
  rightWidth = '50%',
): RCMLBodyChild {
  return {
    tagName: 'rc-section',
    id: id(),
    attributes: { padding: '20px 0' },
    children: [
      {
        tagName: 'rc-column',
        id: id(),
        attributes: { width: leftWidth, padding: '0 10px 0 20px' },
        children: left,
      },
      {
        tagName: 'rc-column',
        id: id(),
        attributes: { width: rightWidth, padding: '0 20px 0 10px' },
        children: right,
      },
    ],
  } as RCMLBodyChild;
}

/** rc-image with UUID */
function image(src: string, opts?: { alt?: string; width?: string; href?: string; borderRadius?: string }): RCMLColumnChild {
  return {
    tagName: 'rc-image',
    id: id(),
    attributes: {
      src,
      alt: opts?.alt ?? '',
      padding: '0 0 20px 0',
      ...(opts?.width && { width: opts.width }),
      ...(opts?.href && { href: opts.href }),
      ...(opts?.borderRadius && { 'border-radius': opts.borderRadius }),
    },
  };
}

/** rc-spacer with UUID */
function spacer(height = '20px'): RCMLColumnChild {
  return { tagName: 'rc-spacer', id: id(), attributes: { height } };
}

/** rc-divider with UUID */
function divider(opts?: { borderStyle?: 'solid' | 'dashed' | 'dotted'; borderColor?: string; borderWidth?: string; width?: string }): RCMLColumnChild {
  return {
    tagName: 'rc-divider',
    id: id(),
    attributes: {
      'border-color': opts?.borderColor ?? '#CCCCCC',
      'border-style': opts?.borderStyle ?? 'solid',
      'border-width': opts?.borderWidth ?? '1px',
      width: opts?.width ?? '100%',
      padding: '10px 0',
    },
  };
}

/** rc-text with inline styles + UUID (for non-brand styled text like notes) */
function noteText(text: string, opts?: { align?: 'left' | 'center' | 'right'; color?: string; fontSize?: string }): RCMLColumnChild {
  return {
    tagName: 'rc-text',
    id: id(),
    attributes: {
      align: opts?.align ?? 'center',
      color: opts?.color ?? '#999999',
      'font-size': opts?.fontSize ?? '12px',
      'line-height': '1.4',
      padding: '0 0 10px 0',
      'font-family': 'Helvetica, Arial, sans-serif',
    },
    content: doc(text),
  };
}

// ---------------------------------------------------------------------------
// Cleanup mode
// ---------------------------------------------------------------------------

async function cleanup(): Promise<void> {
  if (!existsSync(IDS_FILE)) {
    console.log('No saved IDs found. Nothing to clean up.');
    return;
  }

  const ids = JSON.parse(readFileSync(IDS_FILE, 'utf-8')) as {
    campaignId: number;
    messageId: number;
    templateId: number;
    dynamicSetId: number;
  };

  const client = new RuleClient({ apiKey: API_KEY!, debug: true });

  console.log('Cleaning up resources...');

  const steps: [string, number, () => Promise<unknown>][] = [
    ['dynamic set', ids.dynamicSetId, () => client.deleteDynamicSet(ids.dynamicSetId)],
    ['template', ids.templateId, () => client.deleteTemplate(ids.templateId)],
    ['message', ids.messageId, () => client.deleteMessage(ids.messageId)],
    ['campaign', ids.campaignId, () => client.deleteCampaign(ids.campaignId)],
  ];

  for (const [name, resId, fn] of steps) {
    try {
      await fn();
      console.log(`  Deleted ${name} ${resId}`);
    } catch (err) {
      console.warn(`  Failed to delete ${name} ${resId}:`, err instanceof Error ? err.message : err);
    }
  }

  unlinkSync(IDS_FILE);
  console.log('Cleanup complete. ID file removed.');
}

// ---------------------------------------------------------------------------
// Build the full showcase template
// ---------------------------------------------------------------------------

/** Named section group for probe testing */
interface SectionGroup {
  num: number;
  name: string;
  sections: RCMLBodyChild[];
}

function buildSectionGroups(
  brandStyle: BrandStyleConfig,
  resolvedField?: { id: number; name: string },
): SectionGroup[] {
  const groups: SectionGroup[] = [];

  groups.push({
    num: 1, name: 'Default content section',
    sections: [
      label('1. Default content section'),
      createDefaultContentSection({ buttonUrl: 'https://example.com' }),
    ],
  });

  groups.push({
    num: 2, name: 'Headings h1–h4',
    sections: [
      label('2. rc-heading (h1–h4)'),
      createContentSection([
        createBrandHeading(doc('Heading H1 (36px)'), 1),
        createBrandHeading(doc('Heading H2 (28px)'), 2),
        createBrandHeading(doc('Heading H3 (24px)'), 3),
        createBrandHeading(doc('Heading H4 (18px)'), 4),
      ]),
    ],
  });

  groups.push({
    num: 3, name: 'Text alignment',
    sections: [
      label('3. rc-text'),
      createContentSection([
        createBrandText(doc('Default brand text (rc-class: rcml-p-style)')),
        createBrandText(doc('Center-aligned text'), { align: 'center' }),
        createBrandText(doc('Right-aligned text'), { align: 'right' }),
      ]),
    ],
  });

  groups.push({
    num: 4, name: 'Rich text marks',
    sections: [
      label('4. Rich text (bold, italic, underline, link)'),
      createContentSection([
        createBrandText(richDoc([
          { type: 'text', text: 'This has ' },
          { type: 'text', text: 'bold', marks: [{ type: 'font', attrs: { 'font-weight': 'bold' } }] },
          { type: 'text', text: ', ' },
          { type: 'text', text: 'italic', marks: [{ type: 'font', attrs: { 'font-style': 'italic' } }] },
          { type: 'text', text: ', ' },
          { type: 'text', text: 'underline', marks: [{ type: 'font', attrs: { 'text-decoration': 'underline' } }] },
          { type: 'text', text: ', and ' },
          { type: 'text', text: 'a link', marks: [{ type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }] },
          { type: 'text', text: '.' },
        ])),
        createBrandText(richDoc([
          { type: 'text', text: 'Combined: ' },
          { type: 'text', text: 'bold italic', marks: [{ type: 'font', attrs: { 'font-weight': 'bold', 'font-style': 'italic' } }] },
          { type: 'text', text: ' and ' },
          { type: 'text', text: 'bold underline link', marks: [{ type: 'font', attrs: { 'font-weight': 'bold', 'text-decoration': 'underline' } }, { type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }] },
          { type: 'text', text: '.' },
        ])),
      ]),
    ],
  });

  // == 5. Placeholder — requires a real custom field ID (API validates they exist)
  if (resolvedField) {
    groups.push({
      num: 5, name: 'Placeholder (merge field)',
      sections: [
        label('5. Placeholder (merge field)'),
        createContentSection([
          createBrandText(createDocWithPlaceholders([
            createTextNode('Hello, '),
            createPlaceholder(resolvedField.name, resolvedField.id),
            createTextNode('! This is a merge field placeholder.'),
          ])),
          noteText(`(Using field "${resolvedField.name}" — ID ${resolvedField.id})`),
        ]),
      ],
    });
  }

  groups.push({
    num: 6, name: 'Button',
    sections: [
      label('6. rc-button'),
      createContentSection([
        createBrandButton(doc('Brand Button with URL'), 'https://example.com'),
        noteText('Button above uses createBrandButton with rc-class: rcml-label-style'),
      ]),
    ],
  });

  groups.push({
    num: 7, name: 'Images',
    sections: [
      label('7. rc-image'),
      createContentSection([
        image('https://placehold.co/560x200/333333/FFFFFF?text=Column+Width+Image', { alt: 'Column width' }),
        image('https://placehold.co/300x150/0066CC/FFFFFF?text=300x150', { alt: 'Fixed width', width: '300px' }),
        image('https://placehold.co/400x200/CC3300/FFFFFF?text=Clickable', { alt: 'Clickable', href: 'https://example.com' }),
        image('https://placehold.co/300x150/339933/FFFFFF?text=Rounded', { alt: 'Rounded', width: '300px', borderRadius: '16px' }),
      ]),
    ],
  });

  groups.push({
    num: 8, name: 'Spacers',
    sections: [
      label('8. rc-spacer'),
      section([
        createBrandText(doc('Text above 20px spacer')),
        spacer('20px'),
        createBrandText(doc('Between 20px and 40px spacer')),
        spacer('40px'),
        createBrandText(doc('Between 40px and 80px spacer')),
        spacer('80px'),
        createBrandText(doc('Below 80px spacer')),
      ]),
    ],
  });

  groups.push({
    num: 9, name: 'Dividers',
    sections: [
      label('9. rc-divider'),
      section([
        noteText('Solid (default)', { fontSize: '14px', color: '#333333' }),
        divider(),
        noteText('Dashed', { fontSize: '14px', color: '#333333' }),
        divider({ borderStyle: 'dashed' }),
        noteText('Dotted', { fontSize: '14px', color: '#333333' }),
        divider({ borderStyle: 'dotted' }),
        noteText('Colored (#0066CC, 2px)', { fontSize: '14px', color: '#333333' }),
        divider({ borderColor: '#0066CC', borderWidth: '2px' }),
        noteText('50% width', { fontSize: '14px', color: '#333333' }),
        divider({ width: '50%' }),
      ]),
    ],
  });

  groups.push({
    num: 10, name: 'Two-column 50/50',
    sections: [
      label('10. Two-column (50/50)'),
      twoColSection(
        [
          createBrandHeading(doc('Left Column'), 3),
          createBrandText(doc('This is the left column at 50% width.')),
          createBrandButton(doc('Left CTA'), 'https://example.com'),
        ],
        [
          createBrandHeading(doc('Right Column'), 3),
          createBrandText(doc('This is the right column at 50% width.')),
          createBrandButton(doc('Right CTA'), 'https://example.com'),
        ],
      ),
    ],
  });

  groups.push({
    num: 11, name: 'Two-column 33/67',
    sections: [
      label('11. Two-column (33/67)'),
      twoColSection(
        [
          image('https://placehold.co/180x180/0066CC/FFFFFF?text=33%25', { alt: 'Narrow' }),
        ],
        [
          createBrandHeading(doc('67% Column'), 3),
          createBrandText(doc('Asymmetric layout — image column is 33%, text column is 67%.')),
        ],
        '33%',
        '67%',
      ),
    ],
  });

  return groups;
}

function buildShowcase(
  brandStyle: BrandStyleConfig,
  resolvedField?: { id: number; name: string },
): RCMLBodyChild[] {
  const allGroups = buildSectionGroups(brandStyle, resolvedField);
  const groups = onlySections
    ? allGroups.filter(g => onlySections.includes(g.num))
    : allGroups;

  const result: RCMLBodyChild[] = [];

  // == Logo ==
  if (brandStyle.logoUrl) {
    result.push(createBrandLogo(brandStyle.logoUrl));
  }

  for (const g of groups) {
    result.push(...g.sections);
  }

  // == Footer ==
  result.push(createFooterSection({ backgroundColor: brandStyle.bodyBackgroundColor }));

  return result;
}

// ---------------------------------------------------------------------------
// Create mode
// ---------------------------------------------------------------------------

async function create(): Promise<void> {
  if (existsSync(IDS_FILE)) {
    console.error('Existing validation resources found. Run with --cleanup first.');
    console.error('  npx tsx scripts/validate-rcml.ts --cleanup');
    process.exit(1);
  }

  const client = new RuleClient({ apiKey: API_KEY!, debug: true });

  // -- Resolve brand style --
  let brandStyleId = process.env.RULE_BRAND_STYLE_ID
    ? Number(process.env.RULE_BRAND_STYLE_ID)
    : undefined;

  if (!brandStyleId) {
    console.log('No RULE_BRAND_STYLE_ID set, auto-detecting...');
    const styles = await client.listBrandStyles();
    const first = styles?.data?.[0];
    if (!first?.id) {
      console.error('No brand styles found on account. Create one in Rule.io first.');
      process.exit(1);
    }
    brandStyleId = first.id;
    console.log(`Using brand style: ${first.name ?? 'unnamed'} (ID: ${brandStyleId})`);
  }

  const brandStyleResponse = await client.getBrandStyle(brandStyleId);
  if (!brandStyleResponse?.data) {
    console.error(`Brand style ${brandStyleId} not found.`);
    process.exit(1);
  }
  const brandStyle = toBrandStyleConfig(brandStyleResponse.data);

  console.log('\nBrand style config:');
  console.log(`  ID:         ${brandStyle.brandStyleId}`);
  console.log(`  Logo:       ${brandStyle.logoUrl ?? '(none)'}`);
  console.log(`  Button:     ${brandStyle.buttonColor}`);
  console.log(`  Body BG:    ${brandStyle.bodyBackgroundColor}`);
  console.log(`  Section BG: ${brandStyle.sectionBackgroundColor}`);
  console.log(`  Text:       ${brandStyle.textColor}`);

  // -- Resolve a custom field for placeholder testing --
  // Fetch /api/v2/customizations to find an existing field ID on the account.
  let resolvedField: { id: number; name: string } | undefined;

  console.log('\nLooking up custom fields...');
  try {
    const custResp = await fetch('https://app.rule.io/api/v2/customizations', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (custResp.ok) {
      const custData = await custResp.json();
      // Response is { groups: [{ id, name, fields: [{ id, name, type }] }] }
      const groups: unknown[] = Array.isArray(custData) ? custData : (custData?.groups ?? custData?.data ?? []);
      for (const g of groups) {
        const group = g as Record<string, unknown>;
        const groupName = String(group.name ?? group.group_name ?? 'Unknown');
        const fields = (group.fields ?? group.customizations ?? []) as Array<Record<string, unknown>>;
        for (const field of fields) {
          const fieldName = String(field.name ?? field.key ?? '');
          const fieldId = Number(field.id);
          if (fieldId && fieldName) {
            const fullName = `${groupName}.${fieldName}`;
            if (!resolvedField) {
              resolvedField = { id: fieldId, name: fullName };
            }
            if (/first.?name/i.test(fieldName)) {
              resolvedField = { id: fieldId, name: fullName };
              break;
            }
          }
        }
        if (resolvedField && /first.?name/i.test(resolvedField.name)) break;
      }

      if (resolvedField) {
        console.log(`  Using field: ${resolvedField.name} (ID: ${resolvedField.id})`);
      } else {
        console.log('  No parseable custom fields found — placeholder section will be skipped');
      }
    } else {
      const body = await custResp.text();
      console.log(`  Customizations API returned ${custResp.status}: ${body.slice(0, 300)}`);
    }
  } catch (err) {
    console.log(`  Error fetching customizations: ${err instanceof Error ? err.message : err}`);
  }

  // -- Build showcase template --
  const sections = buildShowcase(brandStyle, resolvedField);

  const template = createBrandTemplate({
    brandStyle,
    preheader: 'RCML Element Validation — Full Showcase',
    sections,
  });

  console.log(`\nTemplate built: ${template.children[1].children.length} body sections`);

  console.log('Creating campaign...\n');

  const result = await client.createCampaignEmail({
    name: `RCML Validation ${Date.now()}`,
    subject: 'RCML Element Validation — Full Showcase',
    fromName: process.env.RULE_FROM_NAME ?? 'SDK RCML Validation',
    fromEmail: process.env.RULE_FROM_EMAIL ?? 'test@example.com',
    template,
  });

  writeFileSync(IDS_FILE, JSON.stringify(result, null, 2));

  console.log('Campaign created successfully!\n');
  console.log(`  Campaign ID:  ${result.campaignId}`);
  console.log(`  Message ID:   ${result.messageId}`);
  console.log(`  Template ID:  ${result.templateId}`);
  console.log(`  Dynamic Set:  ${result.dynamicSetId}`);
  console.log('\nOpen campaign in Rule.io editor. Validation checklist:');
  console.log('  [ ] 1.  Default section  — image, heading, text, button with URL');
  console.log('  [ ] 2.  Headings         — h1 (36px), h2 (28px), h3 (24px), h4 (18px)');
  console.log('  [ ] 3.  Text             — default, center, right alignment');
  console.log('  [ ] 4.  Rich text        — bold, italic, underline, links, combined');
  console.log(`  [${resolvedField ? ' ' : '-'}] 5.  Placeholder      — merge field token visible${resolvedField ? '' : ' (skipped — no custom fields found)'}`);
  console.log('  [ ] 6.  Button           — brand styled with working URL');
  console.log('  [ ] 7.  Images           — column width, fixed, clickable, rounded');
  console.log('  [ ] 8.  Spacers          — 20px, 40px, 80px gaps');
  console.log('  [ ] 9.  Dividers         — solid, dashed, dotted, colored, narrow');
  console.log('  [ ] 10. Two-column 50/50 — symmetric layout');
  console.log('  [ ] 11. Two-column 33/67 — asymmetric layout');
  console.log('  [ ] Footer               — View in browser + Unsubscribe links');
  console.log('\nCleanup: npx tsx scripts/validate-rcml.ts --cleanup');
}

// ---------------------------------------------------------------------------
// Probe mode — test each section individually
// ---------------------------------------------------------------------------

async function probe(): Promise<void> {
  const client = new RuleClient({ apiKey: API_KEY!, debug: false });

  // -- Resolve brand style (same as create) --
  let brandStyleId = process.env.RULE_BRAND_STYLE_ID
    ? Number(process.env.RULE_BRAND_STYLE_ID)
    : undefined;

  if (!brandStyleId) {
    const styles = await client.listBrandStyles();
    const first = styles?.data?.[0];
    if (!first?.id) {
      console.error('No brand styles found on account.');
      process.exit(1);
    }
    brandStyleId = first.id;
  }

  const brandStyleResponse = await client.getBrandStyle(brandStyleId);
  if (!brandStyleResponse?.data) {
    console.error(`Brand style ${brandStyleId} not found.`);
    process.exit(1);
  }
  const brandStyle = toBrandStyleConfig(brandStyleResponse.data);

  // Probe doesn't auto-detect fields — test structural validity only
  const groups = buildSectionGroups(brandStyle);
  const results: { num: number; name: string; ok: boolean; error?: string }[] = [];

  console.log(`\nProbing ${groups.length} section groups individually...\n`);

  for (const group of groups) {
    const bodySections: RCMLBodyChild[] = [];
    if (brandStyle.logoUrl) {
      bodySections.push(createBrandLogo(brandStyle.logoUrl));
    }
    bodySections.push(...group.sections);
    bodySections.push(createFooterSection({ backgroundColor: brandStyle.bodyBackgroundColor }));

    const template = createBrandTemplate({
      brandStyle,
      preheader: `Probe: section ${group.num}`,
      sections: bodySections,
    });

    try {
      const result = await client.createCampaignEmail({
        name: `RCML Probe ${group.num} ${Date.now()}`,
        subject: `Probe ${group.num}: ${group.name}`,
        fromName: process.env.RULE_FROM_NAME ?? 'SDK RCML Validation',
        fromEmail: process.env.RULE_FROM_EMAIL ?? 'test@example.com',
        template,
      });

      // Clean up immediately
      try { await client.deleteDynamicSet(result.dynamicSetId); } catch { /* ignore */ }
      try { await client.deleteTemplate(result.templateId); } catch { /* ignore */ }
      try { await client.deleteMessage(result.messageId); } catch { /* ignore */ }
      try { await client.deleteCampaign(result.campaignId); } catch { /* ignore */ }

      results.push({ num: group.num, name: group.name, ok: true });
      process.stdout.write(`  [PASS] ${group.num}. ${group.name}\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ num: group.num, name: group.name, ok: false, error: msg });
      process.stdout.write(`  [FAIL] ${group.num}. ${group.name} — ${msg}\n`);
    }
  }

  console.log('\n--- Summary ---');
  const passed = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  console.log(`  Passed: ${passed.length}/${results.length}`);
  if (failed.length > 0) {
    console.log('  Failed:');
    for (const f of failed) {
      console.log(`    ${f.num}. ${f.name}: ${f.error}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const run = isCleanup ? cleanup : isProbe ? probe : create;
run().catch((err) => {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
