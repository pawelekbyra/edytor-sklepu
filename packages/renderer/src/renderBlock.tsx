import { createElement, type ReactElement } from 'react';
import type { Block } from '@pawelekbyra/schema';
import { getBlockComponent } from './registry.js';
import type { RenderMode } from './types.js';

export interface RenderBlockOptions {
  mode: RenderMode;
}

export function renderBlock(block: Block, { mode }: RenderBlockOptions): ReactElement {
  const BlockComponent = getBlockComponent(block.type);

  if (!BlockComponent) {
    return createElement(
      'div',
      { key: block.id, 'data-block-fallback': block.type },
      `Unknown block type: "${block.type}"`,
    );
  }

  return createElement(
    'div',
    { key: block.id, 'data-block': block.type, 'data-mode': mode },
    createElement(BlockComponent, { block, mode }),
  );
}
