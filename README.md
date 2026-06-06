# 🎸 Guitar Song Tracker & Lyrics Viewer

A personal web application to manage your guitar repertoire. Track practice sessions, store lyrics & chords, monitor your progress across guitar and lyrics mastery levels, and keep a smart "days since last played" warning system.

---

## Features

- **Dashboard** — Kanban-style tier board (Practice / Solid / Mastery) to visualise your repertoire at a glance
- **Song Directory** — Searchable, filterable & sortable table of all songs
- **Song Viewer / Practice Room** — Full-screen lyrics & chords display with auto-scroll and adjustable text size
- **Practice Levels** — Independent 0–3 star ratings for guitar and lyrics mastery
- **Days Tracker** — Automatically calculates days since last play; colour-coded warnings (High / Low / Zero)
- **Add & Edit Songs** — Full CRUD: add, edit, and delete songs via the UI
- **Quick Integrations** — One-click YouTube search and Chordify links per song
- **CSV Export** — Download your full database as a semicolon-delimited CSV (European Excel-compatible, UTF-8 BOM)
- **Tutorial Links** — Store and open YouTube tutorial links directly from the song viewer

---

## Tech Stack

| Layer      | Technology                     |
|------------|-------------------------------|
| Backend    | Python 3 · Flask               |
| Frontend   | Vanilla HTML / CSS / JavaScript |
| Database   | JSON flat-file (`songs_db.json`) |
| Fonts      | Inter · Outfit · JetBrains Mono (Google Fonts) |

---

## Project Structure

```
.
├── server.py              # Flask backend & REST API
├── init_db.py             # One-time DB builder (merges Excel exports into JSON)
├── songs_db.json          # Live song database (git-ignored)
├── songs_db_sample.json   # Sample DB structure for reference
├── static/
│   ├── index.html         # Single-page application shell
│   ├── app.js             # All frontend logic
│   └── app.css            # Styling & theming
└── .venv/                 # Python virtual environment (git-ignored)
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- pip

### 1. Clone the repository

```bash
git clone git@github.com:LorenzoChavez/guitar-app.git
cd guitar-app
```

### 2. Create and activate a virtual environment

```bash
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install flask
```

### 4. Prepare the database

The app reads from `songs_db.json`. You can either:

- **Start fresh** — The app will create an empty list on first load if the file is missing.
- **Use the sample** — Copy `songs_db_sample.json` to `songs_db.json` to get a skeleton with placeholder entries.
- **Import from Excel** — Use `init_db.py` to merge your own `bbdd_data.json` and `lyrics_data.json` exports (see [Database Initialization](#database-initialization)).

### 5. Run the server

```bash
# Windows
.venv\Scripts\python server.py

# macOS / Linux
.venv/bin/python server.py
```

The app will be available at **http://127.0.0.1:5000**.

---

## API Reference

All endpoints return JSON unless otherwise noted.

| Method | Endpoint                          | Description                        |
|--------|-----------------------------------|------------------------------------|
| GET    | `/api/songs`                      | List all songs                     |
| POST   | `/api/songs/add`                  | Add a new song                     |
| POST   | `/api/songs/<id>/played`          | Mark a song as played today        |
| POST   | `/api/songs/<id>/levels`          | Update guitar/lyrics level ratings |
| POST   | `/api/songs/<id>/edit`            | Edit all song fields               |
| POST   | `/api/songs/delete/<id>`          | Delete a song                      |
| GET    | `/api/export`                     | Download full database as CSV      |

---

## Song Data Model

Each song in `songs_db.json` follows this schema:

```json
{
  "id":            1,
  "letter":        "A",
  "artist":        "Artist Name",
  "title":         "Song Title",
  "guitar_level":  2,
  "lyrics_level":  1,
  "last_played":   "2025-06-01",
  "days":          5,
  "tutorial":      "Yes",
  "tutorial_link": "https://youtu.be/...",
  "chords":        "G - D - Em - C",
  "lyrics":        "Full lyrics text here..."
}
```

### Level Scale (0–3)

| Value | Guitar                         | Lyrics                      |
|-------|--------------------------------|-----------------------------|
| 0     | Just starting / riffs only     | Don't know the lyrics       |
| 1     | Strumming chords slowly        | Need sheet in front of me   |
| 2     | Comfortable with transitions   | Know major verses/choruses  |
| 3     | Mastery — can play blindly     | Fully memorized             |

### Dashboard Tiers

Songs are placed in tiers based on the **minimum** of the two level scores:

| Tier       | Condition        |
|------------|-----------------|
| 3 – Mastery | Both levels = 3 |
| 2 – Solid  | Min level = 2   |
| 1 – Practice | Min level ≤ 1  |

---

## Database Initialization

`init_db.py` is a one-time migration script used to build `songs_db.json` from two JSON exports of an Excel workbook:

- `bbdd_data.json` — The main song list (rows/columns from the Excel sheet)
- `lyrics_data.json` — A separate lyrics sheet (artist, title, full lyrics per column)

The script fuzzy-normalises artist/title strings, applies manual corrections for known spelling differences, and writes the merged output to `songs_db.json`.

```bash
python init_db.py
```

> **Note:** `bbdd_data.json` and `lyrics_data.json` are not committed to the repository.

---

## Notes

- `songs_db.json` is excluded from version control via `.gitignore` to protect your personal data. Only `songs_db_sample.json` (a sanitised placeholder) is committed.
- The `days` field is **recomputed dynamically on every load** from `last_played`, so it stays accurate without any scheduled tasks.
- The CSV export uses semicolons (`;`) as delimiter and includes a UTF-8 BOM for direct compatibility with European Excel installs.
