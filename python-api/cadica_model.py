
import os
import uuid
import cv2
import tempfile
import shutil
import numpy as np
from fastapi import HTTPException
from pathlib import Path

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

from third_model_v2 import run_patient_inference

# ── Load .env ─────────────────────────────────────────────────────────────────
load_dotenv()

# ── Cloudinary Config ─────────────────────────────────────────────────────────
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
)
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "third_best_model_v1.pth")
SEQ_LEN    = 9
# ── Model globally load karo - ek baar sirf ──────────────────────────────────
_model = None

def get_model():
    global _model
    if _model is None:
        import torch
        from third_model_v2 import CNN_LSTM, device
        print("[CADICA] Loading model globally...")
        raw_model = CNN_LSTM()
        state_dict = torch.load(MODEL_PATH, map_location=device, weights_only=False)
        cleaned = {k.replace("_orig_mod.", ""): v for k, v in state_dict.items()}
        raw_model.load_state_dict(cleaned)
        raw_model.to(device).eval()
        _model = raw_model
        print("[CADICA] Model loaded globally ✅")
    return _model




# ── Cloudinary Upload Helper ──────────────────────────────────────────────────
def upload_to_cloudinary(local_path: str, public_id: str, folder: str) -> str | None:
    """Upload a local file to Cloudinary, return secure_url or None."""
    try:
        p = Path(local_path)
        if not p.exists():
            print(f"[Cloudinary] ❌ File not found: {local_path}")
            return None

        print(f"[Cloudinary] ⬆ Uploading: {p.name} → {folder}/{public_id}")
        response = cloudinary.uploader.upload(
            str(p),
            public_id=public_id,
            folder=folder,
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
def cadica_predict_multiple(
    video_files: list,
    save_gradcam: bool = False,
    report_id: int | None = None,
):
    """
    1. Extract frames from uploaded videos into temp dir (CADICA structure)
    2. Run patient-level inference
    3. Upload summary + gradcam images to Cloudinary
    4. Delete ALL local temp + output files
    5. Return result with Cloudinary URLs
    """

    if not os.path.exists(MODEL_PATH):
        raise HTTPException(
            status_code=500,
            detail=f"Model file not found: {MODEL_PATH}",
        )

    # ✅ Both input frames and model output go to temp dirs
    tmp_input_dir  = tempfile.mkdtemp(prefix="cadica_input_")
    tmp_output_dir = tempfile.mkdtemp(prefix="cadica_output_")
    patient        = "p1"

    try:
        # ── Extract frames from each video ────────────────────────────────────
        for idx, item in enumerate(video_files, start=1):
            filename    = item["filename"]
            video_bytes = item["bytes"]
            video_name  = f"v{idx}"

            # Save video bytes to temp file
            video_path = os.path.join(tmp_input_dir, f"upload_{idx}.mp4")
            with open(video_path, "wb") as f:
                f.write(video_bytes)

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not open video: {filename}. Send valid MP4/AVI.",
                )

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            print(f"[CADICA] {filename} total frames: {total_frames}")

            if total_frames < 1:
                cap.release()
                raise HTTPException(
                    status_code=400,
                    detail=f"Video has no frames: {filename}",
                )

            sampled_indices = set(
                np.linspace(0, total_frames - 1, SEQ_LEN, dtype=int).tolist()
            )
            print(f"[CADICA] {filename} sampling indices: {sorted(sampled_indices)}")

            # Create CADICA-like input folder structure inside temp
            input_dir = os.path.join(
                tmp_input_dir, "selectedVideos", patient, video_name, "input"
            )
            os.makedirs(input_dir, exist_ok=True)

            saved      = 0
            frame_idx  = 0

            while saved < SEQ_LEN:
                ret, frame = cap.read()
                if not ret:
                    break
                if frame_idx in sampled_indices:
                    cv2.imwrite(
                        os.path.join(input_dir, f"frame_{frame_idx:05d}.png"),
                        frame,
                        [cv2.IMWRITE_PNG_COMPRESSION, 1],
                    )
                    saved += 1
                frame_idx += 1

            cap.release()
            print(f"[CADICA] Saved {saved} frames for {video_name}")

            if saved == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"No frames extracted from: {filename}",
                )

        # ── Run inference ─────────────────────────────────────────────────────
        result = run_patient_inference(
            model_path=MODEL_PATH,
            dataset_root=tmp_input_dir,  # run_patient_inference looks for selectedVideos/ inside this
            patient=patient,
            threshold=0.3,
            out_dir=tmp_output_dir,   # ✅ temp dir — deleted in finally
            save_gradcam=save_gradcam,
        )

        # ── Upload summary image to Cloudinary ────────────────────────────────
        report_tag = report_id if report_id is not None else f"tmp_{uuid.uuid4().hex[:8]}"

        summary_local = os.path.join(tmp_output_dir, "p1_summary.png")
        result["summary_image_url"] = upload_to_cloudinary(
            summary_local,
            public_id=f"summary_{report_tag}",
            folder="cadica_outputs/summary",
        )

        # ── Upload gradcam images to Cloudinary ───────────────────────────────
        if save_gradcam:
            for video in result.get("per_video", []):
                video_name = video.get("video")
                if not video_name:
                    continue

                gradcam_local = os.path.join(
                    tmp_output_dir, patient, f"{patient}_{video_name}_gradcam.png"
                )
                cloud_url = upload_to_cloudinary(
                    gradcam_local,
                    public_id=f"gradcam_{report_tag}_{video_name}",
                    folder="cadica_outputs/gradcam",
                )
                # ✅ Replace local path with Cloudinary URL
                video["gradcam_img_url"] = cloud_url

        result["report_id"] = report_id
        return result

    except HTTPException:
        raise

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(e)}",
        )

    finally:
        # ✅ Delete ALL temp files — input frames + model output
        shutil.rmtree(tmp_input_dir,  ignore_errors=True)
        shutil.rmtree(tmp_output_dir, ignore_errors=True)
        print("[Cleanup] ✅ All CADICA temp files deleted")