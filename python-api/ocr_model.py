

from fastapi import UploadFile, File, HTTPException
from PIL import Image
import pytesseract
import pdfplumber
from pdf2image import convert_from_bytes
import numpy as np
from io import BytesIO
import cv2
import os
import json
import re
from google import genai
from dotenv import load_dotenv



load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Please add it in .env file.")

client = genai.Client(api_key=api_key)

# Preprocessing function
def preprocess_image(pil_img):
    img = np.array(pil_img)

    # PIL image RGB hoti hai, is liye RGB2GRAY better hai
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]
    return Image.fromarray(thresh)


def clean_json_response(text: str):
    """
    Gemini kabhi kabhi ```json ... ``` ke andar response deta hai.
    Yeh function usko clean karke dict me convert karega.
    """
    text = text.strip()

    text = re.sub(r"^```json", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"^```", "", text).strip()
    text = re.sub(r"```$", "", text).strip()

    try:
        return json.loads(text)
    except Exception:
        return {
            "raw_gemini_response": text
        }


def extract_text_from_pdf(content: bytes):
    text = ""

    # 1. Pehle normal PDF text extract try karo
    try:
        with pdfplumber.open(BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception:
        pass

    # 2. Agar scanned PDF hai, OCR fallback use karo
    if not text.strip():
        config = r"--oem 3 --psm 6"
        pages = convert_from_bytes(content, dpi=300)

        for page in pages:
            page = preprocess_image(page)
            text += pytesseract.image_to_string(page, config=config) + "\n"

    return text

def extract_with_gemini(raw_text: str):
    prompt = f"""You are a medical report text scanner. Your only job is to locate exact field labels in the text and copy their adjacent numeric values. Nothing else.

OUTPUT FORMAT — return only this JSON, no markdown, no explanation:
{{
  "age": null,
  "gender": null,
  "height": null,
  "weight": null,
  "ap_hi": null,
  "ap_lo": null,
  "cholesterol": null,
  "gluc": null,
  "smoke": null,
  "alco": null,
  "active": null,
  "cardio": null
}}

═══════════════════════════════════════════
IRON RULES — VIOLATION IS NOT PERMITTED
═══════════════════════════════════════════
RULE 1: null = label not found in text. Not a guess. Not a default. Not zero. null.
RULE 2: Every field stands alone. Finding one field never implies another field.
RULE 3: You are a text scanner. You have no medical knowledge. You cannot infer.
RULE 4: If unsure about any field → null. Uncertainty always resolves to null.
RULE 5: Do NOT output 0 as a default. 0 is a real value meaning "no/negative". Only write 0 if the report explicitly states it.
RULE 6: Seeing "hypertension" does NOT mean ap_hi/ap_lo are present. Seeing "diabetic" does NOT mean gluc is present. Seeing "smoker history" does NOT mean smoke=1. Only extract what is written as a labeled value.

═══════════════════════════════════════════
FIELD-BY-FIELD EXTRACTION RULES
═══════════════════════════════════════════

AGE → key: "age"
  Accept labels: Age, Patient Age, Age in years, DOB (calculate from report date if both present)
  Return: integer years only (e.g. "45 years" → 45, "45Y" → 45)
  No label found → null

GENDER → key: "gender"
  Accept labels: Gender, Sex, M/F, Male/Female, Man/Woman
  Return: 2 for Male/M/Man, 1 for Female/F/Woman
  No label found → null
  WARNING: Do NOT infer gender from patient name.

HEIGHT → key: "height"
  Accept labels: Height, Ht, Stature
  Return: integer centimeters (convert if needed: 1.70m → 170, 5ft7in → 170)
  No label found → null

WEIGHT → key: "weight"
  Accept labels: Weight, Wt, Body Weight
  Return: decimal kilograms (e.g. 78.5)
  No label found → null

AP_HI (systolic) → key: "ap_hi"
  Accept labels: Systolic, Systolic BP, Systolic Blood Pressure, SBP
  Also accept: "BP: 120/80" → ap_hi = 120
  Return: integer (the higher number in a BP reading)
  No label found → null
  WARNING: "Hypertension mentioned" is NOT a label. Do not extract a number for it.

AP_LO (diastolic) → key: "ap_lo"
  Accept labels: Diastolic, Diastolic BP, Diastolic Blood Pressure, DBP
  Also accept: "BP: 120/80" → ap_lo = 80
  Return: integer (the lower number in a BP reading)
  No label found → null

CHOLESTEROL → key: "cholesterol"
  Accept labels: Cholesterol, Total Cholesterol, Serum Cholesterol, Lipid Profile, LDL, HDL
  Return: the RAW numeric value exactly as written in the report (e.g. 215, 180.5)
  Do NOT convert to 1/2/3 categories. Return the actual number from the report.
  No label found → null
  WARNING: Do not write 1, 2, or 3 unless the report itself literally says "1", "2", or "3" next to the cholesterol label.

GLUC (glucose) → key: "gluc"
  Accept labels: Glucose, Blood Glucose, Blood Sugar, Fasting Glucose, FBS, RBS, HbA1c
  Return: the RAW numeric value exactly as written in the report (e.g. 95, 126.0)
  Do NOT convert to 1/2/3 categories. Return the actual number from the report.
  No label found → null
  WARNING: Do not write 1, 2, or 3 unless the report itself literally says "1", "2", or "3" next to the glucose label.

SMOKE → key: "smoke"
  Accept labels: Smoking, Smoking Status, Smoker, Tobacco Use, Cigarette
  Return: 1 if the label is present AND value indicates active smoking (yes/current/smoker/1)
          0 if the label is present AND value indicates non-smoking (no/never/non-smoker/0)
  No label found → null
  WARNING: "Ex-smoker" or "former smoker" → return 0. Past smoking is not current smoking.
  WARNING: A diagnosis of COPD or lung disease is NOT a smoking label.

ALCO → key: "alco"
  Accept labels: Alcohol, Alcohol Intake, Alcohol Use, Drinking Status
  Return: 1 if label present AND value indicates drinking (yes/current/1)
          0 if label present AND value indicates non-drinking (no/never/0)
  No label found → null
  WARNING: A diagnosis of liver disease is NOT an alcohol label.

ACTIVE → key: "active"
  Accept labels: Physical Activity, Activity Level, Exercise, Active, Lifestyle
  Return: 1 if label present AND value indicates active (yes/active/regular/1)
          0 if label present AND value indicates inactive (no/sedentary/0)
  No label found → null

CARDIO → key: "cardio"
  Accept labels: Cardiovascular Disease, CVD, Heart Disease, Cardiac Disease, Cardio
  Return: 1 if label present AND condition is diagnosed/present/yes/1
          0 if label present AND condition is absent/no/none/0
  No label found → null
  WARNING: Seeing high blood pressure does NOT mean cardio = 1.
  WARNING: Seeing chest pain or ECG results does NOT mean cardio = 1 unless the label explicitly says "Cardiovascular Disease: Yes".

═══════════════════════════════════════════
SELF-CHECK BEFORE YOU OUTPUT
═══════════════════════════════════════════
For every field you are about to write a non-null value, ask:
  "Did I see this field's exact label written in the report text?"
  YES → write the value
  NO  → write null

Then ask for cholesterol and gluc specifically:
  "Am I writing the raw number from the report, not a 1/2/3 category?"
  YES → proceed
  NO  → fix it

OCR REPORT TEXT:
\"\"\"
{raw_text}
\"\"\"
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return clean_json_response(response.text)

async def ocr(file: UploadFile = File(...)):
    # Sirf PDF allow karo
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF file only."
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Empty PDF file uploaded."
        )

    raw_text = extract_text_from_pdf(content)

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from this PDF."
        )

    gemini_fields = extract_with_gemini(raw_text)

    return {
        "fields": gemini_fields,
        "raw_text": raw_text
    }