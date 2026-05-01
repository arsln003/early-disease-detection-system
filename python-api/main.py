

from fastapi import FastAPI,UploadFile, Query,File, HTTPException
# from ocr_model import ocr
# from cardio_model import predict, CardioInput
# from cadica_model import cadica_predict
# from fastapi import FastAPI, UploadFile, File
# from PIL import Image
# from pdf2image import convert_from_bytes
from pydantic import BaseModel

# import these AFTER app is defined — lazy loading
from ocr_model import ocr
from cardio_model import predict, CardioInput
from cadica_model import cadica_predict
from typing import List


# # Define the request schema for CADICA
# class CadicaRequest(BaseModel):
#     save_gradcam: bool = False


app = FastAPI()

@app.get("/")
def home():
    return {"message": "Unified API is running"}


@app.post("/cadica/test")
async def cadica_test(file: UploadFile = File(...)):
    content = await file.read()
    return {
        "filename": file.filename,
        "size_kb": len(content) / 1024,
        "received": True
    }


# OCR Model
@app.post("/ocr")
async def ocr_endpoint(file: UploadFile):
    return await ocr(file)

# Cardiovascular Prediction Model
@app.post("/predict")
def cardio_predict(data: CardioInput):
    return predict(data)

# ── CADICA predict ────────────────────────────────────────────────────
# @app.post("/cadica/predict")
# async def cadica_predict_endpoint(
#     file: UploadFile = File(...),
#     save_gradcam: bool = False
# ):
#     video_bytes = await file.read()
#     if not video_bytes:
#         raise HTTPException(status_code=400, detail="Uploaded file is empty.")

#     from cadica_model import cadica_predict   # lazy import — loads model on first call
#     return cadica_predict(video_bytes, save_gradcam)


@app.post("/cadica/predict")
async def cadica_predict_endpoint(
    files: List[UploadFile] = File(...),
    save_gradcam: bool = False
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    from cadica_model import cadica_predict

    results = []

    for file in files:
        video_bytes = await file.read()

        if not video_bytes:
            results.append({
                "filename": file.filename,
                "error": "Uploaded file is empty."
            })
            continue

        try:
            result = cadica_predict(video_bytes, save_gradcam)

            results.append({
                "filename": file.filename,
                "result": result
            })

        except HTTPException as e:
            results.append({
                "filename": file.filename,
                "error": e.detail
            })

        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })

    return {
        "total_files": len(files),
        "results": results
    }


# @app.post("/cadica/predict")
# def cadica_predict_endpoint(
#     patient:      str  = Query(...,       description="Patient ID e.g. p1"),
#     save_gradcam: bool = Query(False,     description="Generate Grad-CAM figures"),
# ):
#     """
#     Runs patient-level inference on all videos belonging to the given patient.
#     The patient's videos must already exist inside the CADICA dataset folder.

#     Steps:
#       1. GET /cadica/patients  → pick a patient ID from the list
#       2. POST /cadica/predict?patient=p1
#     """
#     return cadica_predict(patient, save_gradcam)



