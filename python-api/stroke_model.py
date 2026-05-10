# import os
# import shutil
# import tempfile
# from pathlib import Path

# import cloudinary
# import cloudinary.uploader
# import torch
# from dotenv import load_dotenv
# from fastapi import HTTPException, UploadFile

# from final_model_v2 import predict

# # ── Load .env ─────────────────────────────────────────────────────────────────
# load_dotenv()

# # ── Cloudinary Config ─────────────────────────────────────────────────────────
# cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
# api_key    = os.environ.get("CLOUDINARY_API_KEY")
# api_secret = os.environ.get("CLOUDINARY_API_SECRET")

# print(
#     f"[Cloudinary] cloud_name={cloud_name} | "
#     f"api_key={'SET' if api_key else 'MISSING'} | "
#     f"api_secret={'SET' if api_secret else 'MISSING'}"
# )

# cloudinary.config(
#     cloud_name=cloud_name,
#     api_key=api_key,
#     api_secret=api_secret,
# )

# # ── Paths ─────────────────────────────────────────────────────────────────────
# BASE_DIR        = Path(__file__).resolve().parent
# CLASSIFIER_PATH = BASE_DIR / "best_classifier.pt"
# SEGMENTER_PATH  = BASE_DIR / "best_segmentation_model.pth"

# # ✅ STROKE_OUTPUT_DIR hata diya — ab system temp dirs use ho rahe hain
# #    isliye startup pe koi folder create nahi hoga


# # ── Cloudinary Upload Helper ──────────────────────────────────────────────────
# def upload_image_to_cloudinary(local_path: str, public_id: str) -> str | None:
#     """Upload a local image to Cloudinary, return secure_url or None."""
#     try:
#         p = Path(local_path)
#         if not p.exists():
#             print(f"[Cloudinary] ❌ File not found: {local_path}")
#             return None

#         print(f"[Cloudinary] ⬆ Uploading: {p.name}")
#         response = cloudinary.uploader.upload(
#             str(p),
#             public_id=public_id,
#             folder="stroke_outputs",
#             overwrite=True,
#             resource_type="image",
#         )
#         url = response.get("secure_url")
#         print(f"[Cloudinary] ✅ Done → {url}")
#         return url

#     except Exception:
#         import traceback
#         print(f"[Cloudinary] ❌ Upload failed for '{public_id}':")
#         print(traceback.format_exc())
#         return None


# # ── Main Prediction Function ──────────────────────────────────────────────────
# async def stroke_predict_file(
#     file: UploadFile,
#     report_id: int | None = None,
# ):
#     """
#     1. Save uploaded file to system temp dir
#     2. Run classifier + segmentation model (output also in temp dir)
#     3. Upload result/overlay images to Cloudinary
#     4. Delete ALL local temp files (finally block)
#     5. Return result with Cloudinary URLs
#     """

#     # ── Validation ────────────────────────────────────────────────────────────
#     if not file:
#         raise HTTPException(status_code=400, detail="File is required.")

#     filename   = file.filename or ""
#     lower_name = filename.lower()

#     if not any(lower_name.endswith(ext) for ext in [".png", ".jpg", ".jpeg"]):
#         raise HTTPException(
#             status_code=400,
#             detail="Only PNG, JPG, and JPEG CT images are allowed.",
#         )

#     if not CLASSIFIER_PATH.exists():
#         raise HTTPException(
#             status_code=500,
#             detail=f"Classifier model not found: {CLASSIFIER_PATH}",
#         )

#     if not SEGMENTER_PATH.exists():
#         raise HTTPException(
#             status_code=500,
#             detail=f"Segmentation model not found: {SEGMENTER_PATH}",
#         )

#     # ✅ Both input and output go to system temp — nothing persists on disk
#     tmp_input_dir  = tempfile.mkdtemp(prefix="stroke_input_")
#     tmp_output_dir = tempfile.mkdtemp(prefix="stroke_output_")

#     try:
#         # ── Save uploaded file to temp ────────────────────────────────────────
#         content = await file.read()

#         if not content:
#             raise HTTPException(status_code=400, detail="Uploaded file is empty.")

#         suffix     = Path(filename).suffix or ".png"
#         input_path = Path(tmp_input_dir) / f"input{suffix}"

#         with open(input_path, "wb") as f:
#             f.write(content)

#         # ── Run model ─────────────────────────────────────────────────────────
#         device = "cuda" if torch.cuda.is_available() else "cpu"
#         print(f"[Model] Running on {device} | report_id={report_id}")

#         result = predict(
#             img_path=str(input_path),
#             classifier_path=str(CLASSIFIER_PATH),
#             segmenter_path=str(SEGMENTER_PATH),
#             out_dir=tmp_output_dir,  # ✅ temp dir — auto deleted in finally
#             device=device,
#         )

#         print(f"[Model] result_image  = {result.get('result_image')}")
#         print(f"[Model] overlay_image = {result.get('overlay_image')}")

#         # ── Upload output images to Cloudinary ────────────────────────────────
#         report_tag    = report_id if report_id is not None else "tmp"
#         result_image  = result.get("result_image")
#         overlay_image = result.get("overlay_image")

#         result["result_image_url"] = (
#             upload_image_to_cloudinary(result_image, f"result_{report_tag}")
#             if result_image else None
#         )

#         result["overlay_image_url"] = (
#             upload_image_to_cloudinary(overlay_image, f"overlay_{report_tag}")
#             if overlay_image else None
#         )

#         result["report_id"] = report_id
#         result["device"]    = device

#         return result

#     except HTTPException:
#         raise

#     except Exception as e:
#         import traceback
#         print(traceback.format_exc())
#         raise HTTPException(
#             status_code=500,
#             detail=f"Stroke inference failed: {str(e)}",
#         )

#     finally:
#         # ✅ Hamesha cleanup — chahe success ho ya failure
#         shutil.rmtree(tmp_input_dir,  ignore_errors=True)
#         shutil.rmtree(tmp_output_dir, ignore_errors=True)
#         print("[Cleanup] ✅ All temp files deleted")

import gc
import os
import shutil
import tempfile
from pathlib import Path

import cloudinary
import cloudinary.uploader
import torch
from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile

from final_model_v2 import ClassifierCNN, UNet, predict

# ── Load .env ─────────────────────────────────────────────────────────────────
load_dotenv()

# ── Cloudinary Config ─────────────────────────────────────────────────────────
cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
api_key    = os.environ.get("CLOUDINARY_API_KEY")
api_secret = os.environ.get("CLOUDINARY_API_SECRET")

print(
    f"[Cloudinary] cloud_name={cloud_name} | "
    f"api_key={'SET' if api_key else 'MISSING'} | "
    f"api_secret={'SET' if api_secret else 'MISSING'}"
)

cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR        = Path(__file__).resolve().parent
CLASSIFIER_PATH = BASE_DIR / "best_classifier.pt"
SEGMENTER_PATH  = BASE_DIR / "best_segmentation_model.pth"

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL MODEL INSTANCES
# Loaded ONCE at startup via load_models() — never reloaded per request
# ─────────────────────────────────────────────────────────────────────────────
DEVICE = torch.device("cpu")

_classifier: ClassifierCNN | None = None
_segmenter:  UNet          | None = None


def load_models():
    """
    Called ONCE at FastAPI startup (lifespan hook in main.py).
    Loads both models into RAM and keeps them there for all requests.
    This is the key fix for Render free tier OOM crashes.
    """
    global _classifier, _segmenter

    if not CLASSIFIER_PATH.exists():
        raise RuntimeError(f"Classifier not found: {CLASSIFIER_PATH}")
    if not SEGMENTER_PATH.exists():
        raise RuntimeError(f"Segmenter not found: {SEGMENTER_PATH}")

    print("[Model] Loading classifier...")
    _classifier = ClassifierCNN(num_classes=3).to(DEVICE)
    _classifier.load_state_dict(
        torch.load(str(CLASSIFIER_PATH), map_location=DEVICE)
    )
    _classifier.eval()
    print("[Model] ✅ Classifier ready")

    print("[Model] Loading segmenter...")
    _segmenter = UNet(in_ch=3, num_classes=3).to(DEVICE)
    _segmenter.load_state_dict(
        torch.load(str(SEGMENTER_PATH), map_location=DEVICE)
    )
    _segmenter.eval()
    print("[Model] ✅ Segmenter ready")

    gc.collect()
    print("[Model] ✅ Both models loaded — memory cleaned")


def get_models():
    if _classifier is None or _segmenter is None:
        raise RuntimeError("Models not loaded — load_models() must run at startup")
    return _classifier, _segmenter


# ── Cloudinary Upload Helper ──────────────────────────────────────────────────
def upload_image_to_cloudinary(local_path: str, public_id: str) -> str | None:
    try:
        p = Path(local_path)
        if not p.exists():
            print(f"[Cloudinary] ❌ File not found: {local_path}")
            return None

        print(f"[Cloudinary] ⬆ Uploading: {p.name}")
        response = cloudinary.uploader.upload(
            str(p),
            public_id=public_id,
            folder="stroke_outputs",
            overwrite=True,
            resource_type="image",
        )
        url = response.get("secure_url")
        print(f"[Cloudinary] ✅ Done → {url}")
        return url

    except Exception:
        import traceback
        print(f"[Cloudinary] ❌ Upload failed for '{public_id}':")
        print(traceback.format_exc())
        return None


# ── Main Prediction Function ──────────────────────────────────────────────────
async def stroke_predict_file(
    file: UploadFile,
    report_id: int | None = None,
):
    if not file:
        raise HTTPException(status_code=400, detail="File is required.")

    filename   = file.filename or ""
    lower_name = filename.lower()

    if not any(lower_name.endswith(ext) for ext in [".png", ".jpg", ".jpeg"]):
        raise HTTPException(
            status_code=400,
            detail="Only PNG, JPG, and JPEG CT images are allowed.",
        )

    # ✅ Get models from memory — no torch.load() here
    classifier, segmenter = get_models()

    tmp_input_dir  = tempfile.mkdtemp(prefix="stroke_input_")
    tmp_output_dir = tempfile.mkdtemp(prefix="stroke_output_")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        suffix     = Path(filename).suffix or ".png"
        input_path = Path(tmp_input_dir) / f"input{suffix}"

        with open(input_path, "wb") as f:
            f.write(content)

        print(f"[Model] Running inference | report_id={report_id}")

        # ✅ Pass pre-loaded models directly — fast, no reload
        result = predict(
            img_path=str(input_path),
            out_dir=tmp_output_dir,
            classifier_model=classifier,
            segmenter_model=segmenter,
            device="cpu",
        )

        report_tag    = report_id if report_id is not None else "tmp"
        result_image  = result.get("result_image")
        overlay_image = result.get("overlay_image")

        result["result_image_url"] = (
            upload_image_to_cloudinary(result_image, f"result_{report_tag}")
            if result_image else None
        )
        result["overlay_image_url"] = (
            upload_image_to_cloudinary(overlay_image, f"overlay_{report_tag}")
            if overlay_image else None
        )

        result["report_id"] = report_id
        result["device"]    = "cpu"

        return result

    except HTTPException:
        raise

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Stroke inference failed: {str(e)}",
        )

    finally:
        shutil.rmtree(tmp_input_dir,  ignore_errors=True)
        shutil.rmtree(tmp_output_dir, ignore_errors=True)
        gc.collect()
        print("[Cleanup] ✅ Temp files deleted + memory cleared")