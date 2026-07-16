import type { Media } from '../types.js';

export interface MediaRepository {
  upload(storeId: string, file: File): Promise<{ id: string; url: string }>;
  delete(storeId: string, mediaId: string): Promise<void>;
  listByStore(storeId: string): Promise<Media[]>;
}
