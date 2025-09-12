import os
import tempfile
from typing import List, Tuple
from PIL import Image

def _server_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

def get_uploads_dir() -> str:
    path = os.path.join(_server_root(), "uploads")
    os.makedirs(path, exist_ok=True)
    return path

def get_generated_dir() -> str:
    path = os.path.join(_server_root(), "uploads", "generated")
    os.makedirs(path, exist_ok=True)
    return path

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tif", ".tiff", ".webp"}

def _is_allowed_image(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXT

def load_images(paths: List[str]) -> Tuple[List[Image.Image], List[str]]:
    """
    Opens and normalizes images for PDF (converts to RGB).
    Returns (images, errors)
    """
    imgs = []
    errs = []
    for p in paths:
        try:
            im = Image.open(p)
            # Convert to RGB for PDF (handles RGBA/LA/P modes)
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            else:
                # Some L (grayscale) images save fine; keep as is
                pass
            imgs.append(im)
        except Exception as e:
            errs.append(f"{os.path.basename(p)}: {e}")
    return imgs, errs

def images_to_pdf(image_paths: List[str]) -> Tuple[str, List[str]]:
    """
    Convert list of image paths to a single PDF file.
    Returns (output_path, errors)
    """
    if not image_paths:
        raise ValueError("No images provided")

    imgs, errs = load_images(image_paths)
    if not imgs:
        raise ValueError("No valid images to convert")

    out_dir = get_generated_dir()
    out_name = f"images_{next(tempfile._get_candidate_names())}.pdf"
    out_path = os.path.join(out_dir, out_name)

    first, rest = imgs[0], imgs[1:]
    first.save(out_path, "PDF", save_all=True, append_images=rest)
    # Close images to release handles on Windows
    for im in imgs:
        try:
            im.close()
        except:
            pass

    return out_path, errs