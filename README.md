# Fundscope | Care Homes

A browser tool that models UK care home funding cashflow over time, with jurisdiction and tax-year aware settings, an on-page chart, and xlsx export.

**See it running here...**  
[https://chichilatte.github.io/fundscope-carehomes](https://chichilatte.github.io/fundscope-carehomes)


## Development

```bash
npm install
npm run dev     # local dev server
npm test        # vitest
npm run build   # type-check + production build (outputs dist/)
```

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
