/**
 * RCML Element Validation Script
 *
 * Creates a campaign in Rule.io with a template showcasing a representative
 * set of RCML elements (headings, text, rich text, placeholders, buttons,
 * images, spacers, dividers, multi-column layouts). Uses the brand-aware
 * builders (UUIDs on every node) so the template is fully editor-compatible.
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
 *   RULE_BRAND_STYLE_ID   — Brand style ID to use (resolves the account's preferred / is_default brand style if omitted)
 *   RULE_FROM_EMAIL       — Sender email (default: test@example.com)
 *   RULE_FROM_NAME        — Sender name (default: SDK RCML Validation)
 */

import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Command } from 'commander';
import { RuleClient, RULE_API_V2_BASE_URL } from '@rule-io/client';
import { createSocialElement, createSocialChildElement, createSwitchElement, createCaseElement } from '@rule-io/rcml';
import { resolveBrandTheme } from '@rule-io/client';
import {
  brandButton,
  brandHeading,
  brandLoop,
  brandText,
  buildThemedDocument,
  contentSection,
  docWithNodes,
  footerSection,
  loopFieldPlaceholder,
  logoSection,
  placeholder,
  textNode,
} from '@rule-io/rcml';
import { EmailThemeColorType, type EmailTheme } from '@rule-io/core';
import type {
  Json,
  RcmlBodyChild,
  RcmlColumnChild,
} from '@rule-io/rcml';

// ---------------------------------------------------------------------------
// Run-time config (populated in registerValidateRcml → run())
// ---------------------------------------------------------------------------

/**
 * Ids of resources created by the most recent `create` run. Persisted to
 * `.validate-rcml-ids.json` in the current working directory so `--cleanup`
 * can delete them later.
 */
const IDS_FILE = join(process.cwd(), '.validate-rcml-ids.json');

let API_KEY: string | undefined;
let isCleanup = false;
let isProbe = false;
let onlySections: number[] | undefined;

// ---------------------------------------------------------------------------
// Brand style resolution — shared between create() and probe()
// ---------------------------------------------------------------------------

/**
 * Parse `RULE_BRAND_STYLE_ID` into a positive integer, throwing a clear
 * error for malformed values. Returning `undefined` signals that the
 * preferred (is_default) brand style should be discovered instead.
 *
 * The error propagates up to the script's top-level `run().catch()` which
 * logs and exits — same pattern as `deploy-shopify.ts:parseBrandOverride`.
 */
function parseBrandStyleEnvOverride(): number | undefined {
  const raw = process.env.RULE_BRAND_STYLE_ID;

  if (!raw) return undefined;
  const n = Number(raw);

  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(
      `Invalid RULE_BRAND_STYLE_ID "${raw}": expected a positive integer.`,
    );
  }

  return n;
}

/**
 * Thin wrapper that turns `resolveBrandTheme` errors into a
 * `process.exit(1)` with a readable message — consistent with the rest of
 * this script's fail-fast style.
 */
async function resolveBrandThemeOrExit(
  client: RuleClient,
  overrideId: number | undefined,
): Promise<Awaited<ReturnType<typeof resolveBrandTheme>>> {
  try {
    return await resolveBrandTheme(client, overrideId);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers — all produce nodes with UUIDs
// ---------------------------------------------------------------------------

const id = (): string => randomUUID();

/** Plain ProseMirror doc from a string */
function doc(text: string): Json {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  } as unknown as Json;
}

/**
 * Rich ProseMirror doc with inline nodes. Accepts loosely-typed inline
 * objects (partial FontMark attrs are fine) and casts the result to `Json`
 * — the canonical InlineNode/FontMark types are stricter than what this
 * script's demonstration fixtures supply, but Rule.io accepts both shapes.
 */
function richDoc(nodes: Array<Record<string, unknown>>): Json {
  return { type: 'doc', content: [{ type: 'paragraph', content: nodes }] } as unknown as Json;
}

/** Section label — grey bar to separate test groups in the editor */
function label(title: string): RcmlBodyChild {
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
  } as RcmlBodyChild;
}

/** Centered section with UUID on section + column */
function section(children: RcmlColumnChild[], bg?: string): RcmlBodyChild {
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
  } as RcmlBodyChild;
}

/** Two-column section with UUIDs */
function twoColSection(
  left: RcmlColumnChild[],
  right: RcmlColumnChild[],
  leftWidth = '50%',
  rightWidth = '50%',
): RcmlBodyChild {
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
  } as RcmlBodyChild;
}

/** rc-image with UUID */
function image(src: string, opts?: { alt?: string; width?: string; href?: string; borderRadius?: string }): RcmlColumnChild {
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
function spacer(height = '20px'): RcmlColumnChild {
  return { tagName: 'rc-spacer', id: id(), attributes: { height } };
}

/** rc-divider with UUID */
function divider(opts?: { borderStyle?: 'solid' | 'dashed' | 'dotted'; borderColor?: string; borderWidth?: string; width?: string }): RcmlColumnChild {
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
function noteText(text: string, opts?: { align?: 'left' | 'center' | 'right'; color?: string; fontSize?: string }): RcmlColumnChild {
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
  sections: RcmlBodyChild[];
}

function buildSectionGroups(
  theme: EmailTheme,
  resolvedField?: { id: number; name: string },
  repeatableField?: { id: number; name: string },
): SectionGroup[] {
  const groups: SectionGroup[] = [];

  groups.push({
    num: 1, name: 'Default content section',
    sections: [
      label('1. Default content section'),
      contentSection(
        [
          brandHeading(docWithNodes([textNode('Replace this title')]), 1),
          brandText(
            docWithNodes([
              textNode(
                'Click into this box to change the font settings. Edit this text to include additional information.',
              ),
            ]),
          ),
          brandButton(docWithNodes([textNode('Click me!')]), 'https://example.com'),
        ],
        { padding: '20px 0' },
      ),
    ],
  });

  groups.push({
    num: 2, name: 'Headings h1–h4',
    sections: [
      label('2. rc-heading (h1–h4)'),
      contentSection([
        brandHeading(doc('Heading H1 (36px)'), 1),
        brandHeading(doc('Heading H2 (28px)'), 2),
        brandHeading(doc('Heading H3 (24px)'), 3),
        brandHeading(doc('Heading H4 (18px)'), 4),
      ]),
    ],
  });

  groups.push({
    num: 3, name: 'Text alignment',
    sections: [
      label('3. rc-text'),
      contentSection([
        brandText(doc('Default brand text (rc-class: rcml-p-style)')),
        brandText(doc('Center-aligned text'), { align: 'center' }),
        brandText(doc('Right-aligned text'), { align: 'right' }),
      ]),
    ],
  });

  groups.push({
    num: 4, name: 'Rich text marks',
    sections: [
      label('4. Rich text (bold, italic, underline, link)'),
      contentSection([
        brandText(richDoc([
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
        brandText(richDoc([
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
        contentSection([
          brandText(docWithNodes([
            textNode('Hello, '),
            placeholder(resolvedField.name, resolvedField.id),
            textNode('! This is a merge field placeholder.'),
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
      contentSection([
        brandButton(doc('Brand Button with URL'), 'https://example.com'),
        noteText('Button above uses brandButton with rc-class: rcml-label-style'),
      ]),
    ],
  });

  groups.push({
    num: 7, name: 'Images',
    sections: [
      label('7. rc-image'),
      contentSection([
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
        brandText(doc('Text above 20px spacer')),
        spacer('20px'),
        brandText(doc('Between 20px and 40px spacer')),
        spacer('40px'),
        brandText(doc('Between 40px and 80px spacer')),
        spacer('80px'),
        brandText(doc('Below 80px spacer')),
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
          brandHeading(doc('Left Column'), 3),
          brandText(doc('This is the left column at 50% width.')),
          brandButton(doc('Left CTA'), 'https://example.com'),
        ],
        [
          brandHeading(doc('Right Column'), 3),
          brandText(doc('This is the right column at 50% width.')),
          brandButton(doc('Right CTA'), 'https://example.com'),
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
          brandHeading(doc('67% Column'), 3),
          brandText(doc('Asymmetric layout — image column is 33%, text column is 67%.')),
        ],
        '33%',
        '67%',
      ),
    ],
  });

  // == 12. Loop — requires a repeatable custom field to iterate over
  if (repeatableField) {
    groups.push({
      num: 12, name: 'Loop (rc-loop)',
      sections: [
        label('12. rc-loop (repeatable custom field)'),
        brandLoop(
          repeatableField.id,
          [
            {
              tagName: 'rc-section',
              id: id(),
              attributes: { padding: '10px 0' },
              children: [{
                tagName: 'rc-column',
                id: id(),
                attributes: { padding: '0 20px' },
                children: [
                  brandText(docWithNodes([
                    textNode('Loop item: '),
                    loopFieldPlaceholder('title'),
                  ])),
                  brandText(docWithNodes([
                    textNode('Value: '),
                    loopFieldPlaceholder('value'),
                  ]), { align: 'left' }),
                ],
              }],
            },
          ],
          { maxIterations: 10 },
        ),
        section([
          noteText(`(Using repeatable field "${repeatableField.name}" — ID ${repeatableField.id})`),
        ]),
      ],
    });
  }

  // == 13. Video (rc-video)
  groups.push({
    num: 13, name: 'Video (rc-video)',
    sections: [
      label('13. rc-video'),
      section([
        {
          tagName: 'rc-video',
          id: id(),
          attributes: {
            src: 'https://placehold.co/560x315/333333/FFFFFF?text=Video+Thumbnail',
            alt: 'SDK video test',
            align: 'center',
            padding: '0 0 20px 0',
          },
        },
        noteText('rc-video element with placeholder thumbnail'),
      ]),
    ],
  });

  // == 14. Switch / Case (conditional content)
  groups.push({
    num: 14, name: 'Conditional (rc-switch)',
    sections: [
      label('14. rc-switch / rc-case (conditional content)'),
      {
        ...createSwitchElement({
          children: [
            {
              ...createCaseElement({
                attrs: { 'case-type': 'tag', 'case-condition': 'eq', 'case-value': 1 },
                children: [contentSection([
                  brandText(docWithNodes([
                    textNode('This shows when tag ID 1 matches'),
                  ])),
                ])] as unknown as Parameters<typeof createCaseElement>[0]['children'],
              }),
              id: id(),
            },
            {
              ...createCaseElement({
                attrs: { 'case-type': 'default' },
                children: [contentSection([
                  brandText(docWithNodes([
                    textNode('This is the default / fallback content'),
                  ])),
                ])] as unknown as Parameters<typeof createCaseElement>[0]['children'],
              }),
              id: id(),
            },
          ],
        }),
        id: id(),
      },
    ],
  });

  // == 15. Social (rc-social + rc-social-element) — last before footer
  const themeSocialLinks = Object.values(theme.links).filter(
    (l): l is NonNullable<typeof l> => l !== undefined,
  );
  const rawSocialLinks: { name: string; href: string }[] =
    themeSocialLinks.length > 0
      ? themeSocialLinks.map((l) => ({ name: l.type, href: l.url }))
      : [
          { name: 'facebook', href: 'https://facebook.com' },
          { name: 'instagram', href: 'https://instagram.com' },
          { name: 'x', href: 'https://x.com' },
          { name: 'web', href: 'https://example.com' },
        ];

  // Filter out links with invalid/unsafe URLs (createSocialChildElement throws on bad hrefs)
  const socialElements = rawSocialLinks.flatMap((l: { name: string; href: string }) => {
    try {
      return [{ ...createSocialChildElement({ attrs: l }), id: id() }];
    } catch {
      console.warn(`  Skipping social link "${l.name}" — invalid URL: ${l.href}`);

      return [];
    }
  });

  if (socialElements.length > 0) {
    const socialNames = socialElements
      .map((el: { attributes: { name?: string } }) => el.attributes.name ?? '')
      .filter((n) => n.length > 0)
      .join(', ');

    groups.push({
      num: 15, name: 'Social icons (rc-social)',
      sections: [
        label('15. rc-social / rc-social-element'),
        section([
          {
            ...createSocialElement({
              attrs: { align: 'center', 'icon-size': '24px' },
              children: socialElements,
            }),
            id: id(),
          },
          noteText(`Social icons row — ${socialNames}`),
        ]),
      ],
    });
  }

  return groups;
}

function buildShowcase(
  theme: EmailTheme,
  resolvedField?: { id: number; name: string },
  repeatableField?: { id: number; name: string },
): RcmlBodyChild[] {
  const allGroups = buildSectionGroups(theme, resolvedField, repeatableField);
  const sectionFilter = onlySections;
  const groups = sectionFilter
    ? allGroups.filter(g => sectionFilter.includes(g.num))
    : allGroups;

  const result: RcmlBodyChild[] = [];

  // == Logo ==
  if (theme.images.logo?.url !== undefined) {
    result.push(logoSection(theme.images.logo.url));
  }

  for (const g of groups) {
    result.push(...g.sections);
  }

  // == Footer ==
  result.push(footerSection());

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

  // -- Resolve brand style (preferred / is_default) --
  const override = parseBrandStyleEnvOverride();

  if (!override) {
    console.log('No RULE_BRAND_STYLE_ID set, resolving preferred brand style...');
  }

  const resolved = await resolveBrandThemeOrExit(client, override);

  if (resolved.source === 'fallback') {
    console.warn(
      '  WARN: no brand style is flagged as default — falling back to first in list',
    );
  }

  const brandStyleId = resolved.id;
  const theme = resolved.theme;

  console.log(`Using brand style: ${resolved.name ?? 'unnamed'} (ID: ${brandStyleId})`);

  console.log('\nBrand style config:');
  console.log(`  ID:         ${theme.brandStyleId}`);
  console.log(`  Logo:       ${theme.images.logo?.url ?? '(none)'}`);
  console.log(`  Button:     ${theme.colors[EmailThemeColorType.Primary]?.hex}`);
  console.log(`  Body BG:    ${theme.colors[EmailThemeColorType.Background]?.hex}`);
  console.log(`  Section BG: ${theme.colors[EmailThemeColorType.Body]?.hex}`);
  console.log(`  Text:       ${theme.colors[EmailThemeColorType.Secondary]?.hex}`);
  const themeLinkEntries = Object.values(theme.links).filter(
    (l): l is NonNullable<typeof l> => l !== undefined,
  );

  console.log(
    `  Social:     ${themeLinkEntries.length} link(s)${themeLinkEntries.length ? ' — ' + themeLinkEntries.map((l) => l.type).join(', ') : ''}`,
  );

  // -- Resolve a custom field for placeholder testing --
  // Fetch /api/v2/customizations to find an existing field ID on the account.
  let resolvedField: { id: number; name: string } | undefined;
  let repeatableField: { id: number; name: string } | undefined;

  console.log('\nLooking up custom fields...');

  try {
    const custResp = await fetch(`${RULE_API_V2_BASE_URL}/customizations`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (custResp.ok) {
      const custData = (await custResp.json()) as unknown;
      // Response is { groups: [{ id, name, fields: [{ id, name, type }] }] }
      const custObj = (custData ?? {}) as { groups?: unknown; data?: unknown };
      const groups: unknown[] = Array.isArray(custData)
        ? custData
        : (Array.isArray(custObj.groups)
            ? custObj.groups
            : Array.isArray(custObj.data)
              ? custObj.data
              : []);

      for (const g of groups) {
        const group = g as Record<string, unknown>;
        const groupName = String(group.name ?? group.group_name ?? 'Unknown');
        const fields = (group.fields ?? group.customizations ?? []) as Array<Record<string, unknown>>;

        for (const field of fields) {
          const fieldName = String(field.name ?? field.key ?? '');
          const fieldId = Number(field.id);
          const fieldType = String(field.type ?? '');

          if (fieldId && fieldName) {
            const fullName = `${groupName}.${fieldName}`;

            // Pick the first field as fallback, prefer FirstName for placeholder section
            if (!resolvedField) {
              resolvedField = { id: fieldId, name: fullName };
            }

            if (/first.?name/i.test(fieldName)) {
              resolvedField = { id: fieldId, name: fullName };
            }

            // Look for repeatable/json fields for the loop section
            if (!repeatableField && /json|repeatable|array|items|products/i.test(fieldType + fieldName)) {
              repeatableField = { id: fieldId, name: fullName };
            }
          }
        }
      }

      if (resolvedField) {
        console.log(`  Using field: ${resolvedField.name} (ID: ${resolvedField.id})`);
      } else {
        console.log('  No parseable custom fields found — placeholder section will be skipped');
      }

      if (repeatableField) {
        console.log(`  Using repeatable field: ${repeatableField.name} (ID: ${repeatableField.id})`);
      } else {
        console.log('  No repeatable field found — loop section will be skipped');
      }
    } else {
      const body = await custResp.text();

      console.log(`  Customizations API returned ${custResp.status}: ${body.slice(0, 300)}`);
    }
  } catch (err) {
    console.log(`  Error fetching customizations: ${err instanceof Error ? err.message : String(err)}`);
  }

  // -- Build showcase template --
  const sections = buildShowcase(theme, resolvedField, repeatableField);

  const template = buildThemedDocument(theme, sections, 'RCML Element Validation — Full Showcase');

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
  console.log(`  [${repeatableField ? ' ' : '-'}] 12. Loop            — rc-loop with sub-field placeholders${repeatableField ? '' : ' (skipped — no repeatable field found)'}`);
  console.log('  [ ] 13. Video            — rc-video with thumbnail');
  console.log('  [ ] 14. Switch/Case      — rc-switch conditional (tag + default fallback)');
  console.log('  [ ] 15. Social           — rc-social icons row (facebook, instagram, x, web)');
  console.log('  [ ] Footer               — View in browser + Unsubscribe links');
  console.log('\nCleanup: npx tsx scripts/validate-rcml.ts --cleanup');
}

// ---------------------------------------------------------------------------
// Probe mode — test each section individually
// ---------------------------------------------------------------------------

async function probe(): Promise<void> {
  const client = new RuleClient({ apiKey: API_KEY!, debug: false });

  // -- Resolve brand style (preferred / is_default; same rules as create) --
  const resolved = await resolveBrandThemeOrExit(
    client,
    parseBrandStyleEnvOverride(),
  );
  const theme = resolved.theme;

  // Probe doesn't auto-detect fields — test structural validity only
  const groups = buildSectionGroups(theme);
  const results: { num: number; name: string; ok: boolean; error?: string }[] = [];

  console.log(`\nProbing ${groups.length} section groups individually...\n`);

  for (const group of groups) {
    const bodySections: RcmlBodyChild[] = [];

    if (theme.images.logo?.url !== undefined) {
      bodySections.push(logoSection(theme.images.logo.url));
    }

    bodySections.push(...group.sections);
    bodySections.push(footerSection());

    const template = buildThemedDocument(theme, bodySections, `Probe: section ${group.num}`);

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
// Registration
// ---------------------------------------------------------------------------

interface RunOptions {
  apiKey?: string;
  cleanup?: boolean;
  probe?: boolean;
  sections?: string;
}

export function registerValidateRcml(program: Command): void {
  program
    .command('validate-rcml')
    .description('Create a showcase campaign of RCML elements in Rule.io, or probe each section individually.')
    .option('--api-key <key>', 'Rule.io API key (defaults to $RULE_API_KEY)')
    .option('--cleanup', 'Delete the resources created by the most recent run')
    .option('--probe', 'Test each section individually instead of creating a full campaign')
    .option('--sections <csv>', 'Comma-separated section numbers to include (e.g. 1,2,6)')
    .action(async (opts: RunOptions) => {
      API_KEY = opts.apiKey ?? process.env['RULE_API_KEY'];

      if (!API_KEY) {
        throw new Error('Missing RULE_API_KEY in environment or .env');
      }

      isCleanup = opts.cleanup ?? false;
      isProbe = opts.probe ?? false;
      onlySections = opts.sections?.split(',').map((n) => Number(n.trim()));

      const run = isCleanup ? cleanup : isProbe ? probe : create;

      await run();
    });
}
