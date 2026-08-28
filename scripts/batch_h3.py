#!/usr/bin/env python
"""Batch-run h3_i2v.py over job files in shirt_pipeline/h3jobs/.
Sequential (H3 pegs the 3090). Prints a summary line per job."""
import subprocess, glob, os, time, json

JOBS = sorted(glob.glob("/home/ben/shirt_pipeline/h3jobs/*.json"))
print(f"batch: {len(JOBS)} jobs", flush=True)
results = []
for j in JOBS:
    name = os.path.basename(j)
    t0 = time.time()
    r = subprocess.run(["/home/ben/ComfyUI/venv/bin/python",
                        "/home/ben/shirt_pipeline/h3_i2v.py", j],
                       capture_output=True, text=True)
    dt = time.time() - t0
    print(f"[{name}] rc={r.returncode} {dt/60:.1f}m {r.stdout.strip()}", flush=True)
    results.append((name, r.returncode, r.stdout.strip()))
print("=== H3 BATCH DONE ===", flush=True)
ok = sum(1 for _, rc, _ in results if rc == 0)
print(f"{ok}/{len(results)} succeeded", flush=True)
