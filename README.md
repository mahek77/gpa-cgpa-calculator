# GPA & CGPA Ledger

A polished, single-purpose web app for calculating semester GPA and cumulative CGPA — built with SZABIST's green identity, glassmorphism cards, and a signature arc gauge that reads your standing at a glance.

## Files

```
GPA-Calculator/
├── index.html   → page structure & templates
├── style.css    → design system (tokens, glass cards, gauge, dark mode, responsive rules)
├── script.js    → state, GPA/CGPA math, rendering, localStorage persistence
└── README.md    → this file
```

No build step, no dependencies. Open `index.html` in any modern browser, or serve the folder with any static file server.

## Features

- **GPA / CGPA toggle** — a segmented switch at the top lets you pick exactly what you need:
  - **GPA** mode shows one semester's course table (course name, credit hours, grade) and computes that semester's GPA on the gauge.
  - **CGPA** mode does **not** ask for individual courses. Instead each semester is just a card with a name, its total **Credit Hours**, and its **GPA** (entered directly, e.g. from a transcript). Use "Add Semester" to add Semester 2, Semester 3, and so on. The gauge shows your overall CGPA as the credit-weighted average of every semester's GPA.
  - Switching modes never deletes your data — GPA-mode courses and CGPA-mode semesters are stored separately.
- **Arc gauge** — a fuel-style dial (0–4.0) showing your live CGPA, coloured from red through amber to mint as it climbs
- **Unlimited semesters and courses** — add or remove either with one click
- **Grade dropdown** — standard 4.0 scale, A through F, shown in the legend card
- **Credit hours dropdown** — 1 to 4
- **Live GPA** per semester and **CGPA** across all semesters, recalculated instantly on any change
- **Progress bar** per semester card, scaled to the 4.0 ceiling
- **Total credits earned** and semester count in the summary panel
- **Dark / light mode** toggle, remembers your system preference on first load
- **Autosave** — everything is written to `localStorage` on every change, so a refresh never loses your data
- **Reset** button (with a confirmation prompt) to clear everything and start over
- **Fully responsive** — collapses to a single column on mobile, with a tightened course grid
- **Keyboard-accessible** — visible focus rings, reduced-motion respected

## Grading scale used

Grading Plan (7):

| Marks  | Grade | GPA  |
|--------|-------|------|
| 90-100 | A+    | 4.00 |
| 85-89  | A     | 3.75 |
| 80-84  | A-    | 3.50 |
| 75-79  | B+    | 3.25 |
| 70-74  | B     | 3.00 |
| 66-69  | B-    | 2.75 |
| 63-65  | C+    | 2.50 |
| 60-62  | C     | 2.00 |
| 55-59  | C-    | 1.50 |
| 0-54   | F     | 0.00 |

If your program uses a different scale, edit the `GRADE_INFO` array at the top of `script.js` — the in-app Grade Key legend (marks range + letter grade + GPA points) is generated from this same array, so it always stays in sync with this table.

### CGPA formula

CGPA is the credit-weighted average of every semester's GPA:

```
CGPA = Σ (semester GPA × semester credit hours) / Σ (semester credit hours)
```

Example: Semester 1 = 3.50 GPA over 15 credits, Semester 2 = 3.68 GPA over 15 credits →
`((3.50×15) + (3.68×15)) / 30 = 3.59`.

## Customizing

- **Colors / fonts** — all defined as CSS custom properties at the top of `style.css` under `:root` and `html[data-theme="dark"]`.
- **Default semester name / course count** — edit `createDefaultState()` in `script.js`.
- **Logo** — drop a `logo.png` into the folder and swap the inline SVG mark in `index.html`'s `.brand-mark` for an `<img>` tag if you'd like a real crest instead of the geometric mark.
