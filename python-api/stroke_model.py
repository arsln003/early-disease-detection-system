import os
import shutil
import tempfile
from pathlib import Path

import torch
from fastapi import HTTPException, UploadFile

from final_model_v2 import predict


BASE_DIR = Path(__file__).resolve().parent

CLASSIFIER_PATH = BASE_DIR / "best_classifier.pt"
SEGMENTER_PATH = BASE_DIR / "best_segmentation_model.pth"

STROKE_OUTPUT_DIR = BASE_DIR / "stroke_output"
STROKE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


async def stroke_predict_file(
    file: UploadFile,
    report_id: int | None = None,
):
    """
    Receives CT image file, runs stroke classification + segmentation,
    saves result/overlay images, and returns API-friendly response.
    """

    if not file:
        raise HTTPException(status_code=400, detail="File is required.")

    filename = file.filename or ""
    lower_name = filename.lower()

    allowed_extensions = [".png", ".jpg", ".jpeg"]

    if not any(lower_name.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Only PNG, JPG, and JPEG CT images are allowed.",
        )

    if not CLASSIFIER_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Classifier model not found: {CLASSIFIER_PATH}",
        )

    if not SEGMENTER_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Segmentation model not found: {SEGMENTER_PATH}",
        )

    tmp_dir = tempfile.mkdtemp(prefix="stroke_upload_")

    try:
        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty.",
            )

        suffix = Path(filename).suffix or ".png"
        input_path = Path(tmp_dir) / f"input{suffix}"

        with open(input_path, "wb") as f:
            f.write(content)

        folder_name = (
            f"stroke_report_{report_id}"
            if report_id is not None
            else f"stroke_temp_{next(tempfile._get_candidate_names())}"
        )

        output_dir = STROKE_OUTPUT_DIR / folder_name
        output_dir.mkdir(parents=True, exist_ok=True)

        device = "cuda" if torch.cuda.is_available() else "cpu"

        result = predict(
            img_path=str(input_path),
            classifier_path=str(CLASSIFIER_PATH),
            segmenter_path=str(SEGMENTER_PATH),
            out_dir=str(output_dir),
            device=device,
        )

        result_image = result.get("result_image")
        overlay_image = result.get("overlay_image")

        if result_image:
            result["result_image_url"] = (
                f"/stroke_output/{folder_name}/{Path(result_image).name}"
            )

        if overlay_image:
            result["overlay_image_url"] = (
                f"/stroke_output/{folder_name}/{Path(overlay_image).name}"
            )

        result["report_id"] = report_id
        result["device"] = device

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
        shutil.rmtree(tmp_dir, ignore_errors=True)