# shirtthatsfunny — Content Farm Workflow

> The complete end-to-end pipeline for turning Facebook reels of funny shirts into
> a content farm: generated stills + videos, delivered to the Victus and Discord.

---

## 1. Goal

Download Facebook reels of funny T-shirts, extract the shirt design as a reference
image (NOT re-typeset), generate new "old guy wearing the shirt" stills in different
scenarios, animate each into an 8-second MiniMax H3 video, overlay sound variants, and
deliver everything to the Victus in per-shirt subfolders.

**Golden rules:**
- Shirt text is **never diffusion-generated** — the actual print pixels are carried via a reference image.
- The reference image = the **whole person + shirt** (from behind), not just the print.
- Videos are **9:16** (portrait reel format).
- Every output goes to the Victus: `C:\Users\HP\Desktop\shirtthatsfunny\<Shirt Title>\`.

---

## 2. Architecture (4 hosts)

| Host | Tailscale | OS | Role |
|---|---|---|---|
| **Victus** (`hp@victus-1`) | 100.89.114.49 | Windows 11 | Source reels + final outputs |
| **Mac Mini (this)** | — | macOS | Orchestrator: scripts, cron, `~/shirtthatsfunny_work/` |
| **5060 Ti** (`benji@100.70.82.54`, "ghost-pi") | — | Linux | FLUX Kontext still generation (ComfyUI `127.0.0.1:8188`) |
| **3090** (`ben@100.72.70.38`, "pop-os") | — | Linux (Pop!_OS) | MiniMax H3 video generation (ComfyUI `127.0.0.1:8188`) |

GPU split: **5060 Ti = images** (FLUX), **3090 = videos** (H3). Both ComfyUI instances
are localhost-bound — drive them over SSH hitting `127.0.0.1:8188`.

---

## 3. The pipeline (6 steps)

### Step 1 — Download reels
`yt-dlp` on the Mac. Public `facebook.com/share/r/<id>` links work **without login**.

```bash
yt-dlp -o "reel_%(id)s.%(ext)s" --no-playlist "https://www.facebook.com/share/r/<id>/"
```

- Saved list (`facebook.com/saved/list/...`) is **login-walled** — needs Benji's cookies
  (Chrome login on the Mac → `--cookies-from-browser`, or exported `cookies.txt`).
- 2 reels historically fail with `Cannot parse data` (login-walled or odd format):
  `1Bsbvvk1zA`, `1672z91Yg8i`.

### Step 2 — Extract reference (person + shirt)
- `ffmpeg -i reel.mp4 -vf "fps=2" frames_<id>/f_%03d.jpg`
- Pick the **middle frame** (person seen from behind, shirt clearly visible).
- Save to `~/shirtthatsfunny_work/references/reel_<id>.jpg`.
- **Do NOT crop tight to the print** — keep the whole person (it's a better video ref).

### Step 3 — Shirt spec (OCR + VLM)
- macOS Vision OCR (`/tmp/ocr`, Swift binary) for the text.
- 3090 VLM (`~/clip_audit/.venv`, Qwen2.5-VL-7B 4-bit) for exact wording/layout/colors/
  graphic/front-vs-back.
- Compile into `~/shirtthatsfunny_work/shirt_specs.json`.

### Step 4 — FLUX Kontext still (5060 Ti)
Reference image → new old guy wearing the exact shirt in a scenario.

```
LoadImage → FluxKontextImageScale → VAEEncode → ReferenceLatent
DualCLIPLoader(clip_l + t5xxl_fp8, type=flux) → CLIPTextEncode → FluxGuidance(3.5) → ReferenceLatent
EmptySD3LatentImage(832×1472) → KSampler(steps=20, cfg=1.0, euler/simple, denoise=1.0)
→ VAEDecode → SaveImage
```

- **Models:** `flux1-kontext-dev-fp8-e4m3fn.safetensors`, `clip_l.safetensors` +
  `t5xxl_fp8_e4m3fn.safetensors`, `ae.safetensors` (VAE).
- **Canvas:** 832×1472 (≈9:16).
- Scripts: `kontext_gen.py` (single job) + `batch_kontext.py` (sequential batch).
- Prompt: `an older man with gray hair, seen from behind, wearing the t-shirt from the
  reference image, <scenario>, with several other people around in the background,
  candid smartphone photo, natural skin texture with visible pores, realistic skin
  tones, natural lighting, photorealistic, full body visible`.

### Step 5 — H3 video (3090)
Each still = the H3 **first frame (reference)**. `MiniMaxH3ImageToVideo` node.

```
LoadImage(first_frame) → UNETLoader(minimax_h3_fl2va_pruned_int8_convrot) → CLIPLoader(qwen3vl_32b, type=minimax)
→ VAELoader(video_vae) + VAELoader(audio_vae) → MiniMaxH3ImageToVideo(prompt, 768×1344, length=192)
→ RandomNoise → BasicGuider → SamplerCustomAdvanced → VAEDecode + VAEDecodeAudio → CreateVideo(24fps) → SaveVideo
```

- `length=192` = 8s @ 24fps (grid values: 5,22,39,56,73,90,107,124,141,158,175,192…).
- Motion prompt: `Man seen from behind, slowly walking away from the camera with subtle
  natural body sway and gentle arm movement, the back of his shirt stays facing the
  camera the whole time, soft ambient lighting, realistic handheld camera with slight
  drift, no cuts or scene changes. Audio: faint ambient background chatter and distant noises.`
- Script: `h3_i2v.py` (single) + `batch_h3.py` (sequential).
- **Do NOT use the `ref2va` model** — the fl2va `ImageToVideo` (first frame) IS the
  reference-to-video. `MiniMaxH3ReferenceToVideo` needs a 21GB `ref2va` download that is unnecessary.

### Step 6 — Sounds + deliver
- ffmpeg audio overlay (one variant per sound in `shirtthatsfunny/sounds/`):
  `ffmpeg -i base.mp4 -i sound.mp3 -map 0:v -map 1:a -c:v copy out.mp4`.
- Push every still + video + variant to the Victus subfolder.

---

## 4. Key files (Mac: `~/shirtthatsfunny_work/`)

| File | Purpose |
|---|---|
| `shirt_specs.json` | 17 shirts: text, emphasis, graphic, colors, placement, setting |
| `title_map.json` | reel_id → folder title (e.g. `reel_1605827544408370` → "Gay Test Spider-Man") |
| `references/reel_<id>.jpg` | person+shirt reference per reel |
| `reels/reel_<id>.mp4` | downloaded reels |
| `jobs/reel_<id>.json` | Kontext job files |
| `h3jobs/reel_<id>.json` | H3 job files |
| `kontext_gen.py` | single Kontext job submitter (deployed to 5060 Ti) |
| `batch_kontext.py` | sequential Kontext batch runner |
| `h3_i2v.py` | single H3 job submitter (deployed to 3090) |
| `batch_h3.py` | sequential H3 batch runner |
| `output/stills/` | pulled Kontext stills |
| `output/` | pulled videos |

Also: skill `shirt-video-pipeline` (business category) + `h3` skill (mlops) + `flux-kontext-compositing` skill (mlops).

---

## 5. Shirt inventory (17)

| # | Title (folder) | Text (back) | Colors | Setting |
|---|---|---|---|---|
| 1 | Walk A Mile In My Shoes | Some of you should walk a mile in my shoes… FANTASTIC | black/white | farmers market |
| 2 | Wiener Party | It's not a party until the wiener comes out | white/black | kitchen |
| 3 | Faster Than Dialing 911 | .22 .380 9mm .40 .45… dialing 911 | white/red | outdoor rally |
| 4 | I Love Trump | I love Trump because he pisses off… | black/white | US flag |
| 5 | Wife Thinks Im Sexy | After all these years my wife still thinks I'm sexy | black/white | bar |
| 6 | Gay Test Spider-Man | Gay test! If you see Spider-Man… | black/white | store |
| 7 | Real Women Marry Assholes | *(couple)* Real women marry assholes / I'm the asshole she married | white+black | driveway |
| 8 | Refuse To Argue | I refuse to argue with people who should have been swallowed | black/white | fence |
| 9 | Fucking Wizard | I'm not sure how you have your foot in your mouth… | black/white | grocery |
| 10 | You Might Be Drunk | You might be drunk | black/white | bar |
| 11 | Kevin Bacon Die | 20 years ago we had Johnny Cash, Bob Hope and Steve Jobs… | white/black | stadium |
| 12 | Think Before I Act | I was taught to think before I act… | black/white | outdoor dining |
| 13 | Tugs On My Worm | I like it when she bends over… tugs on my worm | black/white | fair |
| 14 | Embrace Her Mistakes | I told my wife she should embrace her mistakes… | black/white | VFW hall |
| 15 | Two Faults | My wife says I have two faults… | black/white | park |
| 16 | Same Gender Since Birth | Not to brag… same gender since birth | black/white | hobby store |
| 17 | Spoiled Husband | I am a spoiled husband… sunshine and hurricane | brown/white | community center |

---

## 6. Pitfalls (learned the hard way)

1. **5060 Ti (16GB) needs the fp8 text encoder.** `t5xxl_fp16` (~9.8GB) + Kontext fp8
   (~11GB) ≈ 21GB → OOM/hang. Use `t5xxl_fp8_e4m3fn` (~5GB).
2. **Kontext guidance** — FluxGuidance 3.5 default; text-heavy shirts drift to a generic
   grey shirt. Bump guidance (4.0+) or add realism cues carefully. The Spider-Man shirt
   (big graphic) transfers cleanly; dense small text is the hard case.
3. **scp → Windows Victus: no literal quotes in the destination.** Pass the path unquoted
   as a single arg — spaces survive. Create subfolder first via `ssh host 'mkdir "C:/path"'`.
4. **ComfyUI `/history` is GET-only** (POST = 405).
5. **H3 reference = first frame, not a separate `ref2va` model.** Don't download `ref2va`.
6. **Folder-watcher cron collides with manual batches.** The `shirt-video-watcher` cron
   (id `b61528e8bc65`) fires every 5m and re-submits H3 jobs — pause it before manual
   batch runs, and note it may ALSO run on the second Mac Mini (`benjamins-mac-mini-1`),
   causing duplicate jobs on the 3090.
7. **3090 ComfyUI is a `systemd --user` service** (auto-restarts). Kill via
   `ss -tlnp | grep :8188` → `kill -9 <pid>`.
8. **Both GPU boxes flap under heavy render load** — SSH may time out during denoise;
   retry with backoff rather than assuming the box is down (ping works even when SSH lags).

---

## 7. Pending / next steps

- [ ] H3 video batch for all 17 stills (currently blocked by the duplicate cron queue jam).
- [ ] Sound variants overlay + full Victus push of videos.
- [ ] **WooCommerce products** (17) on `cms.shirtthatsfunny.com` — needs WooCommerce REST API keys (consumer key/secret).
- [ ] Homepage video loops on `shirtthatsfunny.com` (Next.js on Hetzner `144.76.78.158`).
- [ ] Printful upload integration (needs API token).
- [ ] Canva MCP OAuth (`hermes mcp login canva`) for design edits.
- [ ] Re-fetch 2 failed reels (`1Bsbvvk1zA`, `1672z91Yg8i`).
- [ ] Resolve the duplicate agent on `benjamins-mac-mini-1` (pause/stop its `shirt-video-watcher` cron).
