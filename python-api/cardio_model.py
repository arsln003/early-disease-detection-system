from pydantic import BaseModel
import joblib
import pandas as pd

# Load model and scaler
model = joblib.load("best_cardiovascular_model.pkl")
scaler = joblib.load("scaler.pkl")

# Exact feature order used during training
FEATURE_ORDER = [
    "age", "gender", "height", "weight", "ap_hi", "ap_lo", "cholesterol", "gluc", "smoke", "alco", "active", 
    "pulse_pressure", "bmi", "map", "Lifestyle_Risk"
]

FEATURES_TO_SCALE = [
    "age", "height", "weight", "ap_hi", "ap_lo", "pulse_pressure", "bmi", "map",
]

class CardioInput(BaseModel):
    age: int
    gender: int
    height: float
    weight: float
    ap_hi: float
    ap_lo: float
    cholesterol: int
    gluc: int
    smoke: int
    alco: int
    active: int

def predict(data: CardioInput):
    payload = data.dict()

    # Feature engineering
    payload["pulse_pressure"] = payload["ap_hi"] - payload["ap_lo"]
    payload["bmi"] = payload["weight"] / ((payload["height"] / 100) ** 2)
    payload["map"] = (2 * payload["ap_lo"] + payload["ap_hi"]) / 3
    payload["Lifestyle_Risk"] = int(-(payload["smoke"] * 0.5) - (payload["alco"] * 0.5) + (payload["active"] * 1))

    # DataFrame in exact model order
    df = pd.DataFrame([payload])
    df = df[FEATURE_ORDER]

    # Apply scaler
    df[FEATURES_TO_SCALE] = scaler.transform(df[FEATURES_TO_SCALE])

    # Prediction
    prediction = int(model.predict(df)[0])

    # Probability if available
    probability = None
    if hasattr(model, "predict_proba"):
        probability = float(model.predict_proba(df)[0][1])

    return {"prediction": prediction, "probability": probability}




