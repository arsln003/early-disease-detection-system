

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

FIELD MEANINGS AND POSSIBLE REPORT LABELS:

1. age
Possible labels:
- Age
- Patient Age
- Years
- Age in years

Return numeric age only.
Example: "45 years" -> 45

2. gender
Possible labels:
- Gender
- Sex
- Male/Female
- M/F

Return:
- 1 for Male / M
- 2 for Female / F
- null if not clear

3. height
Possible labels:
- Height
- Patient Height
- Height cm
- Stature

Return height in centimeters as a number.
Examples:
- "170 cm" -> 170
- "1.70 m" -> 170
- "5 ft 7 in" -> 170 approximately only if clearly written

4. weight
Possible labels:
- Weight
- Patient Weight
- Body Weight
- Weight kg

Return weight in kilograms as a number.
Examples:
- "78.5 kg" -> 78.5
- "78 kg" -> 78

5. ap_hi
This means systolic blood pressure.
Possible labels:
- Systolic
- Systolic BP
- Systolic Blood Pressure
- Upper BP
- High BP
- BP Systolic
- Blood Pressure Systolic
- BP: 120/80, where 120 is ap_hi

Return numeric systolic value only.
Example:
- "Systolic: 120" -> 120
- "BP: 120/80" -> 120

6. ap_lo
This means diastolic blood pressure.
Possible labels:
- Diastolic
- Diastolic BP
- Diastolic Blood Pressure
- Lower BP
- Low BP
- BP Diastolic
- Blood Pressure Diastolic
- BP: 120/80, where 80 is ap_lo

Return numeric diastolic value only.
Example:
- "Diastolic: 80" -> 80
- "BP: 120/80" -> 80

7. cholesterol
Possible labels:
- Cholesterol
- Cholesterol Level
- Serum Cholesterol
- Total Cholesterol
- Lipid Level
- Lipid Profile

Return:
- 1 for normal
- 2 for above normal / borderline / slightly high / elevated
- 3 for well above normal / high / very high
- numeric value if the report clearly gives a numeric cholesterol value
- null if missing or unclear

Examples:
- "Cholesterol: Normal" -> 1
- "Cholesterol: Above Normal" -> 2
- "Cholesterol: High" -> 3
- "Total Cholesterol: 220" -> 220

8. gluc
This means glucose.
Possible labels:
- Glucose
- Blood Glucose
- Sugar
- Sugar Level
- Blood Sugar
- Fasting Glucose
- Random Blood Sugar
- RBS
- FBS

Return:
- 1 for normal
- 2 for above normal / borderline / slightly high / elevated
- 3 for well above normal / high / very high
- numeric value if the report clearly gives a numeric glucose value
- null if missing or unclear

Examples:
- "Glucose: Normal" -> 1
- "Blood Sugar: High" -> 3
- "Fasting Glucose: 110" -> 110

9. smoke
Possible labels:
- Smoking
- Smoking Status
- Smoker
- Tobacco Use
- Cigarette Use

Return:
- 1 for yes / smoker / current smoker / tobacco user
- 0 for no / non-smoker / never smoker / does not smoke
- null if missing or unclear

10. alco
This means alcohol intake.
Possible labels:
- Alcohol
- Alcohol Intake
- Drinking
- Alcohol Use
- Drinks Alcohol

Return:
- 1 for yes / drinks alcohol / alcohol user
- 0 for no / does not drink / non-alcoholic
- null if missing or unclear

11. active
This means physical activity.
Possible labels:
- Activity
- Physical Activity
- Exercise
- Active
- Active Lifestyle
- Regular Exercise

Return:
- 1 for yes / active / physically active / exercises regularly
- 0 for no / inactive / sedentary / no exercise
- null if missing or unclear

12. cardio
This means cardiovascular disease / heart disease status.
Possible labels:
- Cardio
- Cardiovascular Disease
- Heart Disease
- Cardiac Disease
- Cardiac History
- CVD
- Heart Problem

Return:
- 1 for yes / present / positive / diagnosed / history of heart disease
- 0 for no / absent / negative / no history
- null if missing or unclear

IMPORTANT EXTRACTION RULES:

1. Extract values only from the report text.
2. Do not guess values.
3. If a field is not found, return null.
4. If OCR text contains spelling mistakes, infer the field label only when the meaning is clearly obvious.
5. If two values conflict, choose the value closest to the correct field label.
6. If BP is written as "120/80", map 120 to ap_hi and 80 to ap_lo.
7. Do not confuse pulse/heart rate with blood pressure.
8. Do not confuse cholesterol with glucose.
9. Do not confuse activity with cardiac activity.
10. Do not return units like kg, cm, mmHg, years.
11. Return numbers as JSON numbers, not strings.
12. Return yes/no fields as 1 or 0, not "yes" or "no".
13. Gender must be returned as 1 for male and 2 for female.
14. The final response must be valid JSON only.

OCR REPORT TEXT:
\"\"\"
{raw_text}
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