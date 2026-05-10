# from fastapi import FastAPI, UploadFile, File, HTTPException
# from fastapi.staticfiles import StaticFiles
# from fastapi.middleware.cors import CORSMiddleware
# from typing import List
# import os

# app = FastAPI(title="Unified Early Disease Detection API")

# # ── CORS ─────────────────────────────────────────────────────────────
# # Testing ke liye "*" okay hai. Production me specific frontend/backend URLs add karna.
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ── Base/static output folder ────────────────────────────────────────
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# OUTPUT_DIR = os.path.join(BASE_DIR, "patient_output")

# os.makedirs(OUTPUT_DIR, exist_ok=True)

# app.mount(
#     "/patient_output",
#     StaticFiles(directory=OUTPUT_DIR),
#     name="patient_output"
# )

# STROKE_OUTPUT_DIR = os.path.join(BASE_DIR, "stroke_output")
# os.makedirs(STROKE_OUTPUT_DIR, exist_ok=True)

# app.mount(
#     "/stroke_output",
#     StaticFiles(directory=STROKE_OUTPUT_DIR),
#     name="stroke_output"
# )


# @app.get("/")
# def home():
#     return {
#         "message": "Unified API is running successfully!",
#         "services": ["ocr", "cardio", "cadica", "stroke"]
#     }



# @app.get("/health")
# def health():
#     return {"status": "ok"}


# # ── OCR Model ────────────────────────────────────────────────────────
# @app.post("/ocr")
# async def ocr_endpoint(file: UploadFile = File(...)):
#     from ocr_model import ocr

#     return await ocr(file)


# # ── Cardiovascular Prediction Model ──────────────────────────────────
# @app.post("/predict")
# def cardio_predict(data: dict):
#     from cardio_model import predict, CardioInput

#     cardio_input = CardioInput(**data)
#     return predict(cardio_input)


# # ── CADICA Predict ───────────────────────────────────────────────────
# @app.post("/cadica/predict")
# async def cadica_predict_endpoint(
#     files: List[UploadFile] = File(...),
#     save_gradcam: bool = False,
#     report_id: int | None = None,
# ):
#     if not files:
#         raise HTTPException(status_code=400, detail="No files uploaded.")

#     from cadica_model import cadica_predict_multiple

#     video_files = []

#     for file in files:
#         video_bytes = await file.read()

#         if not video_bytes:
#             raise HTTPException(
#                 status_code=400,
#                 detail=f"Uploaded file is empty: {file.filename}"
#             )

#         video_files.append({
#             "filename": file.filename,
#             "bytes": video_bytes
#         })

#     result = cadica_predict_multiple(
#         video_files=video_files,
#         save_gradcam=save_gradcam,
#         report_id=report_id
#     )

#     return result


# # @app.post("/cadica/predict")
# # def cadica_predict_endpoint(
# #     patient:      str  = Query(...,       description="Patient ID e.g. p1"),
# #     save_gradcam: bool = Query(False,     description="Generate Grad-CAM figures"),
# # ):
# #     """
# #     Runs patient-level inference on all videos belonging to the given patient.
# #     The patient's videos must already exist inside the CADICA dataset folder.

# #     Steps:
# #       1. GET /cadica/patients  → pick a patient ID from the list
# #       2. POST /cadica/predict?patient=p1
# #     """
# #     return cadica_predict(patient, save_gradcam)



# @app.post("/stroke/predict")
# async def stroke_predict_endpoint(
#     file: UploadFile = File(...),
#     report_id: int | None = None,
# ):
#     from stroke_model import stroke_predict_file
#     return await stroke_predict_file(file=file, report_id=report_id)


import os
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# ─────────────────────────────────────────────────────────────────────────────
# LIFESPAN — models load hote hain ONCE at startup
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ✅ Font cache pehle build karo — import karte hi ho jaata hai
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(1, 1, figsize=(1, 1))
    plt.close(fig)
    print("[Startup] ✅ Matplotlib font cache ready")

    print("[Startup] Loading stroke models...")
    from stroke_model import load_models
    load_models()
    print("[Startup] ✅ All models ready")

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    print("[Shutdown] Server shutting down")


# ─────────────────────────────────────────────────────────────────────────────
# APP
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Unified Early Disease Detection API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static folders — only created if they exist (safe on clean deploy)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

_patient_output = os.path.join(BASE_DIR, "patient_output")
if os.path.exists(_patient_output):
    app.mount("/patient_output", StaticFiles(directory=_patient_output), name="patient_output")

_stroke_output = os.path.join(BASE_DIR, "stroke_output")
if os.path.exists(_stroke_output):
    app.mount("/stroke_output", StaticFiles(directory=_stroke_output), name="stroke_output")


# ─────────────────────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def home():
    return {
        "message": "Unified API is running successfully!",
        "services": ["ocr", "cardio", "cadica", "stroke"],
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# ── OCR ───────────────────────────────────────────────────────────────────────
@app.post("/ocr")
async def ocr_endpoint(file: UploadFile = File(...)):
    from ocr_model import ocr
    return await ocr(file)


# ── Cardiovascular ────────────────────────────────────────────────────────────
@app.post("/predict")
def cardio_predict(data: dict):
    from cardio_model import predict, CardioInput
    return predict(CardioInput(**data))


# ── CADICA ────────────────────────────────────────────────────────────────────
@app.post("/cadica/predict")
async def cadica_predict_endpoint(
    files: List[UploadFile] = File(...),
    save_gradcam: bool = False,
    report_id: int | None = None,
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    from cadica_model import cadica_predict_multiple

    video_files = []
    for file in files:
        video_bytes = await file.read()
        if not video_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"Uploaded file is empty: {file.filename}",
            )
        video_files.append({"filename": file.filename, "bytes": video_bytes})

    return cadica_predict_multiple(
        video_files=video_files,
        save_gradcam=save_gradcam,
        report_id=report_id,
    )


# ── Stroke ────────────────────────────────────────────────────────────────────
@app.post("/stroke/predict")
async def stroke_predict_endpoint(
    file: UploadFile = File(...),
    report_id: int | None = None,
):
    from stroke_model import stroke_predict_file
    return await stroke_predict_file(file=file, report_id=report_id)