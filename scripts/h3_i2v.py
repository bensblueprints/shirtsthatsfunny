#!/usr/bin/env python
"""MiniMax H3 image-to-video via local ComfyUI. Reads a job JSON file:

    {"image": "/abs/path.jpg", "prompt": "...", "length": 192,
     "prefix": "shirt_x", "seed": 42}

Prints one line: {"status":"success","video":"<abs path>"} or {"status":"error","error":...}
"""
import sys, os, json, time, shutil, urllib.request, uuid, glob

COMFY = "http://127.0.0.1:8188"
INPUT_DIR = "/home/ben/ComfyUI/input"
OUTPUT_DIR = "/home/ben/ComfyUI/output"


def adapt_canvas(width, height):
    BASE = 768
    MAX_PIXELS = 768 * 1344
    M = 32
    ratio = width / height
    if ratio >= 1.0:
        nom_w, nom_h = BASE * ratio, BASE
    else:
        nom_w, nom_h = BASE, BASE / ratio
    if nom_w * nom_h > MAX_PIXELS:
        s = (MAX_PIXELS / (nom_w * nom_h)) ** 0.5
        nom_w, nom_h = nom_w * s, nom_h * s
    return (max(M, round(nom_w / M) * M), max(M, round(nom_h / M) * M))


def post_json(path, payload):
    req = urllib.request.Request(COMFY + path, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=90))


def get_json(path):
    req = urllib.request.Request(COMFY + path)  # GET
    return json.load(urllib.request.urlopen(req, timeout=90))


def main():
    job = json.load(open(sys.argv[1]))
    image_path = job["image"]
    prompt = job["prompt"]
    length = int(job.get("length", 124))
    prefix = job.get("prefix", "shirt")
    seed = int(job.get("seed", 42))

    from PIL import Image
    with Image.open(image_path) as im:
        w, h = im.size
    canvas_w, canvas_h = adapt_canvas(w, h)

    ext = os.path.splitext(image_path)[1] or ".png"
    fname = prefix + "_" + uuid.uuid4().hex[:6] + ext
    shutil.copy(image_path, os.path.join(INPUT_DIR, fname))

    wf = {
        "1":  {"class_type": "LoadImage", "inputs": {"image": fname}},
        "2":  {"class_type": "UNETLoader", "inputs": {"unet_name": "minimax_h3_fl2va_pruned_int8_convrot.safetensors", "weight_dtype": "default"}},
        "3":  {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors", "type": "minimax", "device": "default"}},
        "4":  {"class_type": "VAELoader", "inputs": {"vae_name": "minimax_h3_video_vae_fp16.safetensors"}},
        "5":  {"class_type": "VAELoader", "inputs": {"vae_name": "minimax_h3_audio_vae_fp32.safetensors"}},
        "6":  {"class_type": "MiniMaxH3ImageToVideo", "inputs": {"clip": ["3", 0], "vae": ["4", 0], "prompt": prompt, "width": canvas_w, "height": canvas_h, "length": length, "first_frame": ["1", 0]}},
        "7":  {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "8":  {"class_type": "BasicGuider", "inputs": {"model": ["2", 0], "conditioning": ["6", 0]}},
        "9":  {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "res_multistep"}},
        "10": {"class_type": "BasicScheduler", "inputs": {"model": ["2", 0], "scheduler": "simple", "steps": 20, "denoise": 1.0}},
        "11": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["7", 0], "guider": ["8", 0], "sampler": ["9", 0], "sigmas": ["10", 0], "latent_image": ["6", 1]}},
        "12": {"class_type": "VAEDecode", "inputs": {"samples": ["11", 0], "vae": ["4", 0]}},
        "13": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["11", 0], "vae": ["5", 0]}},
        "14": {"class_type": "CreateVideo", "inputs": {"images": ["12", 0], "audio": ["13", 0], "fps": 24, "bit_depth": 8}},
        "15": {"class_type": "SaveVideo", "inputs": {"video": ["14", 0], "filename_prefix": prefix, "format": "auto", "codec": "auto"}},
    }

    r = post_json("/prompt", {"prompt": wf})
    if "node_errors" in r and r["node_errors"]:
        print(json.dumps({"status": "error", "error": str(r["node_errors"])})); sys.exit(1)
    pid = r["prompt_id"]

    deadline = time.time() + 7200
    while time.time() < deadline:
        try:
            h = get_json("/history/" + pid)
        except Exception:
            time.sleep(10); continue
        if pid in h:
            st = h[pid].get("status", {})
            ss = st.get("status_str")
            if ss == "success":
                pat = os.path.join(OUTPUT_DIR, "**", prefix + "*")
                cands = [p for p in glob.glob(pat, recursive=True) if os.path.isfile(p)]
                if cands:
                    newest = max(cands, key=os.path.getmtime)
                    print(json.dumps({"status": "success", "video": newest}))
                else:
                    print(json.dumps({"status": "success", "video": "", "outputs": h[pid].get("outputs", {})}))
                sys.exit(0)
            if ss == "error":
                print(json.dumps({"status": "error", "error": "comfy error", "status_detail": st})); sys.exit(1)
        time.sleep(10)

    print(json.dumps({"status": "error", "error": "timeout after 2h"})); sys.exit(1)


if __name__ == "__main__":
    main()
