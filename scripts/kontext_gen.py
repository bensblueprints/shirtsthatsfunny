#!/usr/bin/env python
"""FLUX Kontext generator on the 5060 Ti (localhost:8188).

Reads a job JSON file:
  {"reference": "/abs/path.jpg", "prompt": "...", "prefix": "shirt_x",
   "width": 832, "height": 1248, "seed": 42, "steps": 20, "guidance": 3.5}

Reproduces the shirt from the reference image onto a new person/scene via
ReferenceLatent, samples from empty latent (denoise=1.0), saves a PNG.
Prints {"status":"success","image":"<abs path>"} or {"status":"error",...}.
"""
import sys, os, json, time, shutil, urllib.request, uuid, glob

COMFY = "http://127.0.0.1:8188"
INPUT_DIR = "/home/benji/ComfyUI/input"
OUTPUT_DIR = "/home/benji/ComfyUI/output"


def post_json(path, payload):
    req = urllib.request.Request(COMFY + path, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=120))


def get_json(path):
    req = urllib.request.Request(COMFY + path)
    return json.load(urllib.request.urlopen(req, timeout=120))


def main():
    job = json.load(open(sys.argv[1]))
    ref_path = job["reference"]
    prompt = job["prompt"]
    prefix = job.get("prefix", "kontext")
    width = int(job.get("width", 832))
    height = int(job.get("height", 1248))
    seed = int(job.get("seed", 42))
    steps = int(job.get("steps", 20))
    guidance = float(job.get("guidance", 3.5))
    neg = job.get("negative", "cartoon, illustration, airbrushed, plastic skin, CGI, 3d render, oversaturated, smooth wax skin, deformed text, mangled text, extra fingers, bad anatomy")

    ext = os.path.splitext(ref_path)[1] or ".jpg"
    fname = prefix + "_ref_" + uuid.uuid4().hex[:6] + ext
    shutil.copy(ref_path, os.path.join(INPUT_DIR, fname))

    wf = {
        "1":  {"class_type": "LoadImage", "inputs": {"image": fname}},
        "2":  {"class_type": "FluxKontextImageScale", "inputs": {"image": ["1", 0]}},
        "3":  {"class_type": "VAELoader", "inputs": {"vae_name": "ae.safetensors"}},
        "4":  {"class_type": "VAEEncode", "inputs": {"pixels": ["2", 0], "vae": ["3", 0]}},
        "5":  {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-kontext-dev-fp8-e4m3fn.safetensors", "weight_dtype": "fp8_e4m3fn"}},
        "6":  {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux"}},
        "7":  {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["6", 0]}},
        "8":  {"class_type": "FluxGuidance", "inputs": {"conditioning": ["7", 0], "guidance": guidance}},
        "9":  {"class_type": "ReferenceLatent", "inputs": {"conditioning": ["8", 0], "latent": ["4", 0]}},
        "10": {"class_type": "CLIPTextEncode", "inputs": {"text": neg, "clip": ["6", 0]}},
        "11": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["10", 0]}},
        "12": {"class_type": "EmptySD3LatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "13": {"class_type": "KSampler", "inputs": {"model": ["5", 0], "positive": ["9", 0], "negative": ["11", 0], "latent_image": ["12", 0], "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "14": {"class_type": "VAEDecode", "inputs": {"samples": ["13", 0], "vae": ["3", 0]}},
        "15": {"class_type": "SaveImage", "inputs": {"images": ["14", 0], "filename_prefix": prefix}},
    }

    r = post_json("/prompt", {"prompt": wf})
    if "node_errors" in r and r["node_errors"]:
        print(json.dumps({"status": "error", "error": str(r["node_errors"])})); sys.exit(1)
    pid = r["prompt_id"]

    deadline = time.time() + 900
    while time.time() < deadline:
        try:
            h = get_json("/history/" + pid)
        except Exception:
            time.sleep(5); continue
        if pid in h:
            ss = h[pid].get("status", {}).get("status_str")
            if ss == "success":
                pat = os.path.join(OUTPUT_DIR, prefix + "*")
                cands = [p for p in glob.glob(pat) if os.path.isfile(p) and p.endswith(".png")]
                if cands:
                    newest = max(cands, key=os.path.getmtime)
                    print(json.dumps({"status": "success", "image": newest}))
                else:
                    print(json.dumps({"status": "success", "image": "", "outputs": h[pid].get("outputs", {})}))
                sys.exit(0)
            if ss == "error":
                print(json.dumps({"status": "error", "error": "comfy error", "detail": h[pid].get("status", {})})); sys.exit(1)
        time.sleep(5)

    print(json.dumps({"status": "error", "error": "timeout"})); sys.exit(1)


if __name__ == "__main__":
    main()
