import { BlockSchema } from '@editor/schema';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { registerBlock, resetRegistry } from '../src/registry.js';
import { renderBlock } from '../src/renderBlock.js';

describe('renderBlock', () => {
  afterEach(() => {
    resetRegistry();
  });

  it('renders the registered component for the block type, passing block + mode', () => {
    registerBlock('button', ({ block, mode }) => (
      <div>
        {block.type === 'button' ? block.preferences.label : ''} / {mode}
      </div>
    ));

    const block = BlockSchema.parse({ id: 'blk_1', type: 'button', position: 0, preferences: { label: 'Buy', href: '/buy' } });

    render(renderBlock(block, { mode: 'edit' }));
    expect(screen.getByText('Buy / edit')).toBeTruthy();
  });

  it('renders a readable fallback for an unregistered block type instead of crashing', () => {
    const block = BlockSchema.parse({ id: 'blk_1', type: 'button', position: 0, preferences: { label: 'Buy', href: '/buy' } });

    render(renderBlock(block, { mode: 'live' }));
    expect(screen.getByText('Unknown block type: "button"')).toBeTruthy();
  });
});
