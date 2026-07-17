export * from './errors.js';
export * from './types.js';
export type { PageRepository } from './repositories/PageRepository.js';
export type { ThemeRepository } from './repositories/ThemeRepository.js';
export type { VersionRepository } from './repositories/VersionRepository.js';
export type { MediaRepository } from './repositories/MediaRepository.js';
export type { CommerceProvider } from './repositories/CommerceProvider.js';

export { createDatabase, withTransaction } from './sqlite/db.js';
export { SQLitePageRepository } from './sqlite/SQLitePageRepository.js';
export { SQLiteThemeRepository } from './sqlite/SQLiteThemeRepository.js';
export { SQLiteVersionRepository } from './sqlite/SQLiteVersionRepository.js';
export { SQLiteMediaRepository } from './sqlite/SQLiteMediaRepository.js';
export { DemoCommerceProvider } from './sqlite/DemoCommerceProvider.js';

// "Własne repo" mode: page documents as version-controllable JSON files (see ARCHITEKTURA.md).
// FilePageRepository = local disk (dev/demo); GitHubPageRepository = the shop's real repo,
// where publishing is a commit and the deploy that follows.
export { FilePageRepository } from './file/FilePageRepository.js';
export { GitHubPageRepository } from './github/GitHubPageRepository.js';
export type { GitHubPageRepositoryOptions } from './github/GitHubPageRepository.js';

// "Współdzielony storefront" mode (storefront-composition-system.md, kanon od 2026-07-17):
// page documents live in the sklepik database, scoped by store_id.
export { SklepikPageRepository } from './sklepik/SklepikPageRepository.js';
export type { SklepikPageRepositoryOptions } from './sklepik/SklepikPageRepository.js';
