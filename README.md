# rudilab-hugo

Hugo-based portfolio site for rudilab.my.id

## Stack
- Hugo v0.166.0+ (SSG)
- Theme: `themes/rudilab/` (custom built)
- i18n: EN (default) + ID
- Data: `data/data.json` (single source of truth, same as original)

## Structure
```
content/
  en/           <- English content (default, public)
  id/           <- Bahasa Indonesia content (add here to translate)
    poc/        <- translate pocNN.md here; falls back to EN if missing
    lab/
    research/
    achievements/
data/
  data.json     <- homepage card data (PoC, Lab, Research, Books, Certs, Achievements)
i18n/
  en.yaml       <- English UI strings
  id.yaml       <- Indonesian UI strings (nav labels, section headings, etc)
themes/
  rudilab/      <- custom theme: layouts, CSS, JS
```

## Adding content

### New PoC (EN):
Create `content/en/poc/pocNN.md`:
```markdown
---
title: "Your Finding Title"
date: "2026-01-15"
poc_num: "08"
target: "target.com"
category: "Web Application"
severity: "Medium"
severity_note: "Severity is researcher-assessed based on observed conditions."
impact: "Description of impact"
status: "Proven"
---

## Overview
...your write-up in Markdown...
```

Also add entry to `data/data.json` `poc` array (for homepage card + collect page).

### Translate to Indonesian:
Create `content/id/poc/pocNN.md` with same frontmatter but Indonesian body text.
If the file doesn't exist in `content/id/`, Hugo automatically falls back to EN.

### UI labels (buttons, headings):
Edit `i18n/id.yaml` to add/change Indonesian translations.

## Local development
```bash
hugo server --disableFastRender
# Visit http://localhost:1313/     (EN)
# Visit http://localhost:1313/id/  (ID)
```

## Deploy
Push to GitLab main branch. CI runs `hugo --minify` and deploys to Pages → rudilab.my.id
