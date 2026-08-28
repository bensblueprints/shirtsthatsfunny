# shirtsthatsfunny

A fully-automatic print-on-demand T-shirt store: **React.js frontend + headless WooCommerce + Printful API**, plus a **local GPU content farm** that turns Facebook reels of funny shirts into generated stills and 8-second videos.

## What's here

- **`WORKFLOW.md`** — the full end-to-end pipeline doc (reels → shirt reference → FLUX Kontext stills → MiniMax H3 videos → sound variants → Victus delivery), with exact commands, ComfyUI node graphs, models, canvas sizes, prompts, and pitfalls.
- **`scripts/`** — the generation scripts:
  - `kontext_gen.py` / `batch_kontext.py` — FLUX Kontext reference→stills (5060 Ti).
  - `h3_i2v.py` / `batch_h3.py` — MiniMax H3 image→video (3090).
- **`data/`** — `shirt_specs.json` (17 shirts: text/colors/graphic/setting) and `title_map.json` (reel id → folder title).

## Hardware (all local, no cloud AI)

| Host | GPU | Role |
|---|---|---|
| Victus (Windows) | — | source reels + final outputs |
| Mac Mini | — | orchestrator (scripts + cron) |
| `ghost-pi` (Linux) | RTX 5060 Ti 16GB | FLUX Kontext stills |
| `pop-os` (Linux) | RTX 3090 24GB | MiniMax H3 videos |

## Site stack

- **Frontend:** React.js (Next.js) on `shirtthatsfunny.com` — Hetzner (`144.76.78.158`), Cloudflare DNS.
- **Backend:** headless WooCommerce at `cms.shirtthatsfunny.com` (REST `wc/v3`).
- **Fulfillment:** Printful API.

## Quick start

```bash
# Download a reel
yt-dlp -o "reel_%(id)s.%(ext)s" "https://www.facebook.com/share/r/<id>/"

# Generate a still (5060 Ti)
python3 scripts/kontext_gen.py jobs/reel_<id>.json

# Generate a video (3090)
python3 scripts/h3_i2v.py h3jobs/reel_<id>.json
```

See `WORKFLOW.md` for the full pipeline.
