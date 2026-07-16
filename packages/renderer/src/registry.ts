import type { ComponentType } from 'react';
import type { Block, BlockType, Section, SectionType } from '@editor/schema';
import type { RenderMode } from './types.js';

// Components receive the full discriminated-union `Section`/`Block` and narrow on `.type`
// themselves — avoids a generic-per-key registry, which would need one overload per section type
// for little practical benefit until `component-library` actually exists.
export type SectionComponent = ComponentType<{ section: Section; mode: RenderMode }>;
export type BlockComponent = ComponentType<{ block: Block; mode: RenderMode }>;

const sectionRegistry = new Map<SectionType, SectionComponent>();
const blockRegistry = new Map<BlockType, BlockComponent>();

export function registerSection(type: SectionType, component: SectionComponent): void {
  sectionRegistry.set(type, component);
}

export function registerBlock(type: BlockType, component: BlockComponent): void {
  blockRegistry.set(type, component);
}

export function getSectionComponent(type: SectionType): SectionComponent | undefined {
  return sectionRegistry.get(type);
}

export function getBlockComponent(type: BlockType): BlockComponent | undefined {
  return blockRegistry.get(type);
}

// The registry is a process-wide singleton — one registry per running app (editor or storefront),
// per ARCHITEKTURA.md. Tests that register fixture components must reset between runs.
export function resetRegistry(): void {
  sectionRegistry.clear();
  blockRegistry.clear();
}
