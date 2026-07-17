import { registerSection } from '@pawelekbyra/renderer';
import { ButtonSection } from './sections/ButtonSection.js';
import { Faq } from './sections/Faq.js';
import { Hero } from './sections/Hero.js';
import { ImageBanner } from './sections/ImageBanner.js';
import { Newsletter } from './sections/Newsletter.js';
import { RichText } from './sections/RichText.js';
import { Spacer } from './sections/Spacer.js';

// Registers every *content* section this library owns. Commerce sections (product_grid,
// category_grid) are deliberately NOT here — they need a data layer that belongs to the host
// storefront, which registers its own implementation (see docs/ARCHITEKTURA.md, "Podział sekcji:
// treść vs commerce").
//
// The registry is a per-runtime singleton, so each app (editor, storefront) calls this once for
// its own runtime. Both get identical components — that's what makes the editor's preview match
// the published page.
export function registerContentSections(): void {
  registerSection('hero', Hero);
  registerSection('rich_text', RichText);
  registerSection('newsletter', Newsletter);
  registerSection('image_banner', ImageBanner);
  registerSection('faq', Faq);
  registerSection('spacer', Spacer);
  registerSection('button', ButtonSection);
}
