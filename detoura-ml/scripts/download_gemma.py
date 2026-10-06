"""
DETOURA - Gemma Model Downloader
Downloads lightweight, instruction-tuned Gemma 2B GGUF model for local CPU/GPU inference.
"""

import os
import sys
import time
from pathlib import Path
import urllib.request

REPO_ID = "bartowski/gemma-2-2b-it-GGUF"
FILENAME = "gemma-2-2b-it-Q4_K_M.gguf"
DOWNLOAD_URL = f"https://huggingface.co/{REPO_ID}/resolve/main/{FILENAME}"

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
TARGET_PATH = MODELS_DIR / FILENAME


def download_progress(block_num, block_size, total_size):
    downloaded = block_num * block_size
    if total_size > 0:
        percent = min(100.0, downloaded * 100.0 / total_size)
        mb_down = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        sys.stdout.write(
            f"\r[DETOURA GEMMA] Downloading {FILENAME}: {percent:.1f}% ({mb_down:.1f}/{mb_total:.1f} MB)"
        )
        sys.stdout.flush()
    else:
        mb_down = downloaded / (1024 * 1024)
        sys.stdout.write(f"\r[DETOURA GEMMA] Downloading {FILENAME}: {mb_down:.1f} MB")
        sys.stdout.flush()


def download_model(force: bool = False) -> Path:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if TARGET_PATH.exists() and not force:
        size_mb = TARGET_PATH.stat().st_size / (1024 * 1024)
        if size_mb > 1000:  # Valid downloaded model is ~1629 MB
            print(f"[DETOURA GEMMA] Model already exists at {TARGET_PATH} ({size_mb:.1f} MB). Skipping download.")
            return TARGET_PATH
        else:
            print(f"[DETOURA GEMMA] Existing model file is incomplete ({size_mb:.1f} MB). Re-downloading...")

    print(f"[DETOURA GEMMA] Target location: {TARGET_PATH}")
    print(f"[DETOURA GEMMA] Fetching from Hugging Face: {DOWNLOAD_URL}")

    # Try huggingface_hub first if installed for faster chunked download
    try:
        from huggingface_hub import hf_hub_download
        print("[DETOURA GEMMA] Using huggingface_hub for fast multi-threaded download...")
        start_t = time.time()
        downloaded_path = hf_hub_download(
            repo_id=REPO_ID,
            filename=FILENAME,
            local_dir=str(MODELS_DIR),
        )
        dur = time.time() - start_t
        print(f"\n[DETOURA GEMMA] Download completed in {dur:.1f}s: {downloaded_path}")
        return Path(downloaded_path)
    except Exception as e:
        print(f"[DETOURA GEMMA] hf_hub_download notice ({e}), falling back to direct stream download...")

    # Fallback to direct urllib with progress bar
    temp_path = TARGET_PATH.with_suffix(".tmp")
    req = urllib.request.Request(
        DOWNLOAD_URL,
        headers={"User-Agent": "Detoura-Gemma-Downloader/1.0"}
    )

    start_t = time.time()
    try:
        urllib.request.urlretrieve(DOWNLOAD_URL, str(temp_path), reporthook=download_progress)
        print()
        if temp_path.exists():
            if TARGET_PATH.exists():
                
                TARGET_PATH.unlink()
            temp_path.rename(TARGET_PATH)
            dur = time.time() - start_t
            size_mb = TARGET_PATH.stat().st_size / (1024 * 1024)
            print(f"[DETOURA GEMMA] Download complete ({size_mb:.1f} MB in {dur:.1f}s): {TARGET_PATH}")
            return TARGET_PATH
    except Exception as ex:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
        raise RuntimeError(f"Failed to download Gemma model: {ex}")


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    try:
        path = download_model(force=force_flag)
        print(f"SUCCESS: Gemma model ready at {path}")
        sys.exit(0)
    except Exception as err:
        print(f"ERROR: {err}", file=sys.stderr)
        sys.exit(1)
