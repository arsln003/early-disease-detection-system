

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
    prompt = f"""
You are a strict medical report data extraction engine.

Your task is to extract patient/report values from the given OCR text and return them in a clean JSON object.

You must return ONLY these exact JSON keys:

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

Do not add any extra keys.
Do not add explanation.
Do not add markdown.
Return only valid JSON.

YOUR ONLY JOB:
Find each field's label in the text. If found, extract its value.
If not found, return null. That is all. Nothing else.
Do NOT think. Do NOT infer. Do NOT complete missing data.
Do NOT use medical knowledge to fill gaps.
You are a text scanner, not a doctor.

ABSOLUTE RULES — NEVER BREAK THESE:
- null means the label was not found in the text. Nothing else.
- A missing field is always null. Never 0, never 1, never any default.
- Do NOT infer any field from any other field.
- Do NOT use medical logic (e.g. high BP does not mean cardio = 1).
- Do NOT assume lifestyle habits from demographics.
- Do NOT fill a field just because it would "make sense" medically.
- Each field lives or dies by its own label being present in the text.
- If you are even 1% unsure — return null.

FIELD DEFINITIONS:

1. age
Labels: Age, Patient Age, Years, Age in years
Return numeric age in years.
Example: "45 years" -> 45
Label not in text -> null

2. gender
Labels: Gender, Sex, Male, Female, M, F, Man, Woman
Return: 1 for Female/F/Woman, 2 for Male/M/Man
Label not in text -> null

3. height
Labels: Height, Patient Height, Height cm, Stature
Return centimeters as number. "1.70 m" -> 170, "5ft 7in" -> 170
Label not in text -> null

4. weight
Labels: Weight, Patient Weight, Body Weight, Weight kg
Return kilograms as decimal. "78.5 kg" -> 78.5
Label not in text -> null

5. ap_hi
Labels: Systolic, Systolic BP, Systolic Blood Pressure, Upper BP, BP Systolic
Also: "BP: 120/80" -> 120 is ap_hi
Return numeric value only.
Label not in text -> null

6. ap_lo
Labels: Diastolic, Diastolic BP, Diastolic Blood Pressure, Lower BP, BP Diastolic
Also: "BP: 120/80" -> 80 is ap_lo
Return numeric value only.
Label not in text -> null

7. cholesterol
Labels: Cholesterol, Cholesterol Level, Serum Cholesterol, Total Cholesterol, Lipid Level, Lipid Profile
Return ONLY 1, 2, or 3:
- 1 = normal / within range / desirable
- 2 = above normal / borderline / slightly high / elevated
- 3 = well above normal / high / very high
If numeric mg/dL: below 200 -> 1, 200-239 -> 2, 240+ -> 3
Label not in text -> null

8. gluc
Labels: Glucose, Blood Glucose, Sugar, Sugar Level, Blood Sugar, Fasting Glucose, RBS, FBS
Return ONLY 1, 2, or 3:
- 1 = normal / within range
- 2 = above normal / borderline / slightly high / elevated
- 3 = well above normal / high / very high
If numeric mg/dL: below 100 -> 1, 100-125 -> 2, 126+ -> 3
Label not in text -> null

9. smoke
Labels: Smoking, Smoking Status, Smoker, Tobacco Use, Cigarette Use
Return: 1 = smoker, 0 = non-smoker
Label not in text -> null

10. alco
Labels: Alcohol, Alcohol Intake, Drinking, Alcohol Use, Drinks Alcohol
Return: 1 = drinks, 0 = does not drink
Label not in text -> null

11. active
Labels: Activity, Physical Activity, Exercise, Active, Active Lifestyle, Regular Exercise
Return: 1 = active, 0 = inactive
Label not in text -> null

12. cardio
Labels: Cardio, Cardiovascular Disease, Heart Disease, Cardiac Disease, Cardiac History, CVD, Heart Problem
Return: 1 = diagnosed/present, 0 = no history/absent
Label not in text -> null

BEFORE YOU RESPOND — CHECK EACH FIELD:
Ask yourself for every single field:
"Did I physically see this field's label in the report text?"
- YES, I saw the label -> extract value
- NO, I did not see the label -> null

There is no third option.
Seeing high blood pressure does NOT mean you saw "cardio".
Seeing age/gender does NOT mean you saw "smoking".
Every field needs its OWN label. Period.

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