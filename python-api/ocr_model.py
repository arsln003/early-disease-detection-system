from fastapi import UploadFile, File
from PIL import Image
import pytesseract
import pdfplumber
from pdf2image import convert_from_bytes
import re
import numpy as np
from io import BytesIO
import cv2




# Preprocessing function
def preprocess_image(pil_img):
    img = np.array(pil_img)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)[1]
    return Image.fromarray(thresh)

# Field extraction
def extract_fields(text):
    field_map = {
        "Age": "age",
        "Gender": "gender",
        "Height": "height",
        "Weight": "weight",
        "Systolic": "ap_hi",
        "Diastolic": "ap_lo",
        "Cholesterol": "cholesterol",
        "Glucose": "gluc",
        "Smoking": "smoke",
        "Alcohol": "alco",
        "Activity": "active",
        "Cardio": "cardio"
    }

    fields = {}

    for text_field, key in field_map.items():
        pattern = rf"{text_field}\s*[:\t ]*\s*(\d+(?:[.,]\d+)?)"
        match = re.search(pattern, text, re.IGNORECASE)

        if match:
            value = match.group(1).replace(',', '.')
            if key == "weight":
                fields[key] = float(value)
            else:
                fields[key] = int(float(value))
        else:
            fields[key] = None

    return fields

# OCR processing function
async def ocr(file: UploadFile = File(...)):
    content = await file.read()
    text = ""
    config = r'--oem 3 --psm 6'

    if file.filename.lower().endswith(".pdf"):
        try:
            with pdfplumber.open(BytesIO(content)) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
        except:
            pass

        if not text.strip():
            pages = convert_from_bytes(content, dpi=300)
            for page in pages:
                page = preprocess_image(page)
                text += pytesseract.image_to_string(page, config=config)
    else:
        image = Image.open(BytesIO(content))
        image = preprocess_image(image)
        text = pytesseract.image_to_string(image, config=config)

    return {
        "fields": extract_fields(text),
        "raw_text": text
    }