import type { CSSProperties } from 'react';
import type { Block, Section } from '@editor/schema';

// Flat scalar "preferences" -> CSS is exactly the piece the official Rails page_builder does
// server-side (preference -> inline style helper); kept here as pure functions so both the editor
// canvas and the future storefront renderer produce identical output.
export function sectionStyles(style: Section['style']): CSSProperties {
  const hasBorder = style.topBorderWidth > 0 || style.bottomBorderWidth > 0;
  return {
    color: style.textColor ?? undefined,
    backgroundColor: style.backgroundColor ?? undefined,
    borderColor: style.borderColor ?? undefined,
    borderStyle: hasBorder ? 'solid' : undefined,
    borderTopWidth: style.topBorderWidth,
    borderBottomWidth: style.bottomBorderWidth,
    paddingTop: style.topPadding,
    paddingBottom: style.bottomPadding,
  };
}

const CONTAINER_ALIGNMENT_TO_JUSTIFY_CONTENT = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const;

export function blockStyles(style: Block['style']): CSSProperties {
  return {
    textAlign: style.textAlignment,
    justifyContent: CONTAINER_ALIGNMENT_TO_JUSTIFY_CONTENT[style.containerAlignment],
    paddingTop: style.topPadding,
    paddingBottom: style.bottomPadding,
    width: `${style.widthDesktop}%`,
    // `size` (small/medium/large) is a semantic token for the component itself to interpret
    // (font/icon scale, etc.) — deliberately not translated into a CSS property here.
  };
}
