

# from fastapi import HTTPException
# import os
# from THIRD_MODEL_V2 import run_patient_inference

# BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
# MODEL_PATH  = os.path.join(BASE_DIR, "third_best_model_v1.pth")
# DATASET_PATH = os.path.join(BASE_DIR, "CADICA")

# def cadica_predict(patient: str, save_gradcam: bool = False):
#     patient_path = os.path.join(DATASET_PATH, "selectedVideos", patient)

#     if not os.path.exists(patient_path):
#         # Show available patients in the error so it's easy to debug
#         try:
#             available = os.listdir(os.path.join(DATASET_PATH, "selectedVideos"))
#         except Exception:
#             available = []
#         raise HTTPException(
#             status_code=404,
#             detail=f"Patient '{patient}' not found. Available: {available}"
#         )

#     if not os.path.exists(MODEL_PATH):
#         raise HTTPException(
#             status_code=500,
#             detail=f"Model file not found: {MODEL_PATH}"
#         )

#     try:
#         result = run_patient_inference(
#             model_path   = MODEL_PATH,
#             dataset_root = DATASET_PATH,
#             patient      = patient,
#             save_gradcam = save_gradcam,
#         )
#         return result
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))









from fastapi import HTTPException
import os
import cv2
import tempfile
import shutil
import numpy as np
from THIRD_MODEL_V2 import run_patient_inference

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "third_best_model_v1.pth")
SEQ_LEN    = 9  # ← THIRD_MODEL_V2.py se match karo

def cadica_predict(video_file: bytes, save_gradcam: bool = False):

    tmp_dir = tempfile.mkdtemp(prefix="cadica_upload_")

    try:
        # ── 1. Write video bytes ──────────────────────────────────────────────
        video_path = os.path.join(tmp_dir, "upload.mp4")
        with open(video_path, "wb") as f:
            f.write(video_file)

        # ── 2. Open video & get info ──────────────────────────────────────────
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400,
                                detail="Could not open video. Send a valid MP4/AVI.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        print(f"[CADICA] Total frames in video: {total_frames}")

        if total_frames < 1:
            raise HTTPException(status_code=400, detail="Video has no frames.")

        # ── 3. Same logic as sample_frames() in THIRD_MODEL_V2 ───────────────
        # np.linspace — exactly same as model's sample_frames() function
        sampled_indices = set(
            np.linspace(0, total_frames - 1, SEQ_LEN, dtype=int).tolist()
        )
        print(f"[CADICA] Sampling frames at indices: {sorted(sampled_indices)}")

        # ── 4. Extract ONLY those 11 frames ──────────────────────────────────
        PATIENT   = "p_upload"
        VIDEO     = "v1"
        input_dir = os.path.join(
            tmp_dir, "selectedVideos", PATIENT, VIDEO, "input"
        )
        os.makedirs(input_dir, exist_ok=True)

        saved     = 0
        frame_idx = 0
        while saved < SEQ_LEN:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx in sampled_indices:
                path = os.path.join(input_dir, f"frame_{frame_idx:05d}.png")
                cv2.imwrite(path, frame, [cv2.IMWRITE_PNG_COMPRESSION, 1])
                saved += 1
            frame_idx += 1
        cap.release()

        print(f"[CADICA] Saved {saved} frames → {input_dir}")

        if saved == 0:
            raise HTTPException(status_code=400, detail="No frames extracted.")

        # ── 5. Run inference ──────────────────────────────────────────────────
        result = run_patient_inference(
            model_path   = MODEL_PATH,
            dataset_root = tmp_dir,
            patient      = PATIENT,
            threshold    = 0.3,
            out_dir      = os.path.join(tmp_dir, "output"),
            save_gradcam = save_gradcam,
        )

        # ── 6. Clean response ─────────────────────────────────────────────────
        result.pop("summary_image", None)
        for v in result.get("per_video", []):
            v.pop("gradcam_img", None)

        return result

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)






# from fastapi import HTTPException
# import os, tempfile, shutil, subprocess
# from THIRD_MODEL_V2 import run_patient_inference

# # ── BASE PATHS ─────────────────────────────────────────────
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# MODEL_PATH = os.path.join(BASE_DIR, "third_best_model_v1.pth")

# # 👉 YAHAN FRAMES PERMANENT SAVE HONGE
# BASE_SAVE_DIR = r"D:\project\early-disease-detection-system-main\python-api"


# def cadica_predict(video_file: bytes, save_gradcam: bool = False):

#     tmp_dir = tempfile.mkdtemp(prefix="cadica_upload_")

#     try:
#         # ── CADICA STRUCTURE ─────────────────────────────────
#         PATIENT = "p_upload"
#         VIDEO   = "v1"

#         input_dir = os.path.join(tmp_dir, "selectedVideos", PATIENT, VIDEO, "input")
#         os.makedirs(input_dir, exist_ok=True)

#         # ── 1. SAVE VIDEO ───────────────────────────────────
#         video_path = os.path.join(tmp_dir, "upload.mp4")
#         with open(video_path, "wb") as f:
#             f.write(video_file)

#         # ── 2. EXTRACT FRAMES USING FFMPEG ──────────────────
#         out_pattern = os.path.join(input_dir, "frame_%06d.png")

#         cmd = [
#             "ffmpeg",
#             "-i", video_path,
#             "-q:v", "1",
#             "-vsync", "0",
#             out_pattern,
#             "-y"
#         ]

#         proc = subprocess.run(cmd, capture_output=True, text=True)

#         if proc.returncode != 0:
#             print("[FFMPEG ERROR]:", proc.stderr)
#             raise HTTPException(status_code=400,
#                                 detail="ffmpeg video process nahi kar saka.")

#         extracted = sorted(os.listdir(input_dir))
#         total = len(extracted)

#         print(f"[CADICA] {total} frames extracted → {input_dir}")

#         if total == 0:
#             raise HTTPException(status_code=400,
#                                 detail="Video se koi frame extract nahi hua.")

#         # ── 3. SAVE FRAMES PERMANENTLY ──────────────────────
#         saved_frames_dir = os.path.join(
#             BASE_SAVE_DIR,
#             "saved_frames",
#             PATIENT,
#             VIDEO
#         )
#         os.makedirs(saved_frames_dir, exist_ok=True)

#         for f in extracted:
#             src = os.path.join(input_dir, f)
#             dst = os.path.join(saved_frames_dir, f)
#             shutil.copy2(src, dst)

#         print(f"[CADICA] Frames saved → {saved_frames_dir}")

#         # ── 4. RUN MODEL INFERENCE ──────────────────────────
#         result = run_patient_inference(
#             model_path   = MODEL_PATH,
#             dataset_root = tmp_dir,
#             patient      = PATIENT,
#             threshold    = 0.3,
#             out_dir      = os.path.join(tmp_dir, "output"),
#             save_gradcam = save_gradcam,
#         )

#         # ── 5. CLEAN RESPONSE ───────────────────────────────
#         result.pop("summary_image", None)

#         for v in result.get("per_video", []):
#             v.pop("gradcam_img", None)

#         # ── 6. ADD FRAME INFO IN RESPONSE ───────────────────
#         result["total_frames"] = total
#         result["frames_path"]  = saved_frames_dir

#         return result

#     except HTTPException:
#         raise

#     except Exception as e:
#         import traceback
#         print(traceback.format_exc())
#         raise HTTPException(
#             status_code=500,
#             detail=f"Inference failed: {str(e)}"
#         )

#     finally:
#         # TEMP FILES DELETE HO JAYENGE (SAFE)
#         shutil.rmtree(tmp_dir, ignore_errors=True)