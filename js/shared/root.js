/* Explore Beyond — the site-root prefix for asset paths.
   Content data (data/projects.js) stores paths relative to the site
   root ("assets/shots/x.webp"); each page declares its own prefix in
   an inline <script>window.__ROOT__ = ...;</script> before the modules
   load (index.html sits at the root, the standalone run pages sit
   three folders deep). The headless Node stubs have no such variable,
   so the prefix degrades to "" there and images simply never load. */

export var ROOT = (typeof window !== 'undefined' && typeof window.__ROOT__ === 'string')
  ? window.__ROOT__
  : '';
