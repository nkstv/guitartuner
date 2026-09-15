# Guitar Tuner Fast — static bilingual site

100% static website, ready for GitHub Pages / Cloudflare Pages / Netlify.

## Routes
- `/` — English version: **Guitar Tuner Fast**
- `/fr/` — French version: **Accorde Guitare**

## Features
- Acoustic guitar, electric guitar, bass and ukulele
- Reference tones generated with the Web Audio API (no external audio files)
- Automatic microphone tuner with pitch detection
- Multiple tunings
- Responsive mobile / desktop design
- English + French SEO with canonical + hreflang tags
- 404 pages, sitemap, robots.txt, manifests, favicon and Open Graph images
- No dependency and no build step

## Deploy
1. Commit every file and folder at the root of your repository.
2. Enable GitHub Pages on the main branch, or deploy the repository to any static host.
3. The production domain is already configured as `https://guitar-tuner-fast.com` in:
   - `index.html`
   - `fr/index.html`
   - `robots.txt`
   - `sitemap.xml`
4. Microphone access requires HTTPS. GitHub Pages provides HTTPS automatically.

## Local testing
Reference tones work when opening `index.html` directly, but microphone access is more reliable through a local HTTPS/server environment.


## v6 interaction fixes
- Instrument cards always scroll to the tuner, even if the URL hash already points there.
- The selected physical string is highlighted in gold on the central neck.
- Selection feedback spacing is corrected.


## Tuning guides
Added 4 English guides and 4 French equivalents, all cross-linked and included in sitemap.xml.

## Privacy policy

Chrome Web Store privacy policy URL:
- English: https://guitar-tuner-fast.com/privacy/
- French: https://guitar-tuner-fast.com/fr/confidentialite/


## Chrome extension landing pages
- EN: https://guitar-tuner-fast.com/chrome-extension-guitar-tuner/
- FR: https://guitar-tuner-fast.com/fr/extension-chrome-accordeur-guitare/
