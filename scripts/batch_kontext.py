#!/usr/bin/env python
"""Batch-run kontext_gen.py over all job files in shirt_pipeline/jobs/.
Sequential (16GB card = one at a time). Prints a summary line per job."""
import subprocess, glob, os, time, sys

JOBS = sorted(glob.glob("/home/benji/shirt_pipeline/jobs/*.json"))
print(f"batch: {len(JOBS)} jobs", flush=True)
results = []
for j in JOBS:
    name = os.path.basename(j)
    t0 = time.time()
    r = subprocess.run(["/home/benji/ComfyUI/venv/bin/python",
                        "/home/benji/shirt_pipeline/kontext_gen.py", j],
                       capture_output=True, text=True)
    dt = time.time() - t0
    out = r.stdout.strip()
    print(f"[{name}] rc={r.returncode} {dt:.0f}s {out}", flush=True)
    results.append((name, r.returncode, out))
print("=== BATCH DONE ===", flush=True)
ok = sum(1 for _, rc, _ in results if rc == 0)
print(f"{ok}/{len(results)} succeeded", flush=True)
