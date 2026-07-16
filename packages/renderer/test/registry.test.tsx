import { afterEach, describe, expect, it } from 'vitest';
import { getBlockComponent, getSectionComponent, registerBlock, registerSection, resetRegistry } from '../src/registry.js';

const FakeHero = () => <div>hero</div>;
const FakeButtonBlock = () => <div>button</div>;

describe('registry', () => {
  afterEach(() => {
    resetRegistry();
  });

  it('returns undefined for an unregistered section/block type', () => {
    expect(getSectionComponent('hero')).toBeUndefined();
    expect(getBlockComponent('button')).toBeUndefined();
  });

  it('registers and retrieves a section component by type', () => {
    registerSection('hero', FakeHero);
    expect(getSectionComponent('hero')).toBe(FakeHero);
  });

  it('registers and retrieves a block component by type', () => {
    registerBlock('button', FakeButtonBlock);
    expect(getBlockComponent('button')).toBe(FakeButtonBlock);
  });

  it('resetRegistry clears every registration', () => {
    registerSection('hero', FakeHero);
    registerBlock('button', FakeButtonBlock);

    resetRegistry();

    expect(getSectionComponent('hero')).toBeUndefined();
    expect(getBlockComponent('button')).toBeUndefined();
  });
});
