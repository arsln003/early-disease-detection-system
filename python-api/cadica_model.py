

# from fastapi import HTTPException
# import os
# from third_model_v2 import run_patient_inference

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
from third_model_v2 import run_patient_inference

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "third_best_model_v1.pth")
SEQ_LEN = 9


def cadica_predict_multiple(video_files: list, save_gradcam: bool = False,report_id: int | None = None):
    """
    Receives multiple uploaded videos.
    Converts them into CADICA-like structure:

    selectedVideos/
    └── p1/
        ├── v1/
        │   └── input/
        ├── v2/
        │   └── input/
        └── v3/
            └── input/

    Then runs patient-level inference once.
    """

    if not os.path.exists(MODEL_PATH):
        raise HTTPException(
            status_code=500,
            detail=f"Model file not found: {MODEL_PATH}"
        )

    tmp_dir = tempfile.mkdtemp(prefix="cadica_upload_")
    patient = "p1"

    try:
        for idx, item in enumerate(video_files, start=1):
            filename = item["filename"]
            video_bytes = item["bytes"]

            video_name = f"v{idx}"

            # Save uploaded video temporarily
            video_path = os.path.join(tmp_dir, f"upload_{idx}.mp4")

            with open(video_path, "wb") as f:
                f.write(video_bytes)

            # Open video
            cap = cv2.VideoCapture(video_path)

            if not cap.isOpened():
                raise HTTPException(
                    status_code=400,
                    detail=f"Could not open video: {filename}. Send valid MP4/AVI."
                )

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            print(f"[CADICA] {filename} total frames: {total_frames}")

            if total_frames < 1:
                cap.release()
                raise HTTPException(
                    status_code=400,
                    detail=f"Video has no frames: {filename}"
                )

            sampled_indices = set(
                np.linspace(0, total_frames - 1, SEQ_LEN, dtype=int).tolist()
            )

            print(
                f"[CADICA] {filename} sampling indices: "
                f"{sorted(sampled_indices)}"
            )

            # Create CADICA-like input folder
            input_dir = os.path.join(
                tmp_dir,
                "selectedVideos",
                patient,
                video_name,
                "input"
            )

            os.makedirs(input_dir, exist_ok=True)

            saved = 0
            frame_idx = 0

            while saved < SEQ_LEN:
                ret, frame = cap.read()

                if not ret:
                    break

                if frame_idx in sampled_indices:
                    frame_path = os.path.join(
                        input_dir,
                        f"frame_{frame_idx:05d}.png"
                    )

                    cv2.imwrite(
                        frame_path,
                        frame,
                        [cv2.IMWRITE_PNG_COMPRESSION, 1]
                    )

                    saved += 1

                frame_idx += 1

            cap.release()

            print(f"[CADICA] Saved {saved} frames for {video_name} → {input_dir}")

            if saved == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"No frames extracted from: {filename}"
                )
        folder_name = f"report_{report_id}" if report_id else f"report_temp_{uuid.uuid4().hex[:8]}"
        # Permanent output folder
        output_dir = os.path.join(BASE_DIR, "patient_output",folder_name)
        os.makedirs(output_dir, exist_ok=True)

        # Run inference only once for all uploaded videos
        result = run_patient_inference(
            model_path=MODEL_PATH,
            dataset_root=tmp_dir,
            patient=patient,
            threshold=0.3,
            out_dir=output_dir,
            save_gradcam=save_gradcam,
        )

        # Add browser-friendly URLs for images
        if save_gradcam:
            result["summary_image_url"] = f"/patient_output/{folder_name}/p1_summary.png"

            for video in result.get("per_video", []):
                video_name = video.get("video")

                if video_name:
                    video["gradcam_img_url"] = (
                        f"/patient_output/{folder_name}/p1/p1_{video_name}_gradcam.png"
                    )

        return result

    except HTTPException:
        raise

    except Exception as e:
        import traceback
        print(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {str(e)}"
        )

    finally:
        # Only temp uploaded videos/frames are deleted.
        # Grad-CAM output stays safe in patient_output folder.
        shutil.rmtree(tmp_dir, ignore_errors=True)