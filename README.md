# Roledex

A real, spinning Rolodex for your contacts — built as a fast, private, local-first web app.

## Features

- **Actually rotating Rolodex.** Contacts sit on a 3D drum you spin with the on-screen arrows, the
  keyboard (↑/↓ or ←/→), or by clicking a card peeking out above/below the current one.
- **A–Z jump tabs**, just like the physical thing, plus a live search box.
- **Flip a card** to see and edit notes and industry, and to add someone to the dinner club — all
  inline, no page reload.
- **Add contacts** by hand through a form (name, company, title, industry, email, phone, notes).
- **Import contacts** from a CSV export (Google/Apple/Outlook contacts) or a vCard `.vcf` file —
  drag-and-drop, browse, or paste the raw text. Likely duplicates are detected and can be skipped.
- **Export** everything back out as JSON (full backup) or CSV any time.
- **The Dinner Guest club** — a second tab listing everyone you've flagged from your Rolodex as a
  dinner club guest, with its own notes field (allergies, favorite cuisine, etc).
- Everything is stored locally in your browser (`localStorage`) — no account, no server, no data
  leaving your machine.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. To build a static production bundle:

```bash
npm run build
npm run preview
```

## Tech

React + TypeScript + Vite, no backend. Contact data lives in `localStorage` under the key
`roledex.contacts.v1`. Use the **Export JSON** button any time you want a portable backup.
