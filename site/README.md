# Presentation website

Scroll-driven presentation for the final project, meeting the CSC 2400 presentation requirements (one section per rubric item). The 3D TTU case-study simulation will be added to the `#simSlot` placeholder once the algorithms are in the repo.

```bash
cd site && npm install && npm run dev
```

**Presenting:** `→`/`←` (or a clicker) moves between sections, `P` turns on snap-to-section presentation mode, and `F` goes fullscreen. Print to PDF from the browser for the backup deck.

**Filling in:** anything shown with a dashed gold `TBD` box in `index.html` still needs real content (GA parameters, hardware, results, takeaways).

**Deploy:** `.github/workflows/pages.yml` builds and publishes on pushes to `main`. Enable it once under *Settings → Pages → Source: GitHub Actions*.
