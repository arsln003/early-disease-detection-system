

import os
import re
import math
import warnings

os.environ["CUDA_VISIBLE_DEVICES"] = ""

warnings.filterwarnings(
    "ignore",
    message=".*tie_word_embeddings.*",
    category=UserWarning,
)

import torch
import torch.nn.functional as F
from transformers import (
    AutoTokenizer,
    AutoModel,
    AutoModelForSeq2SeqLM,
)
from pydantic import BaseModel


# ==========================================================
# INPUT SCHEMA
# gender: 1 = male, 2 = female
# ==========================================================
class CardioInput(BaseModel):
    age: int
    gender: int       # 1 = male, 2 = female
    height: float     # cm
    weight: float     # kg
    ap_hi: float      # systolic BP mmHg
    ap_lo: float      # diastolic BP mmHg
    cholesterol: int  # 1=normal, 2=above normal, 3=well above normal
    gluc: int         # 1=normal, 2=above normal, 3=well above normal
    smoke: int        # 0/1
    alco: int         # 0/1
    active: int       # 0/1


# ==========================================================
# FEATURE ENGINEERING
# ==========================================================
def engineer_features(payload: dict) -> dict:
    payload["pulse_pressure"] = payload["ap_hi"] - payload["ap_lo"]
    payload["bmi"] = payload["weight"] / ((payload["height"] / 100) ** 2)
    payload["map"] = (2 * payload["ap_lo"] + payload["ap_hi"]) / 3
    payload["Lifestyle_Risk"] = int(
        -(payload["smoke"] * 0.5)
        - (payload["alco"] * 0.5)
        + (payload["active"] * 1)
    )
    return payload


# ==========================================================
# CHOLESTEROL CLASSIFIER
# ==========================================================
class CholesterolClassifier:
    @staticmethod
    def classify_total(chol_value: float) -> str:
        if chol_value < 200:
            return "Desirable"
        elif chol_value <= 239:
            return "Borderline High"
        else:
            return "High"


# ==========================================================
# CLINICAL SUMMARY GENERATOR
# ==========================================================
class ClinicalNarrativeGenerator:
    @staticmethod
    def generate(
        patient_data: dict,
        cvd_risk_level: str,
        stroke_risk_level: str,
    ) -> str:
        text = f"The patient is {patient_data['age']} years old. "
        text += (
            "The patient is male. "
            if patient_data["gender"] == 1
            else "The patient is female. "
        )

        bmi = patient_data["bmi"]
        if bmi >= 30:
            text += "The patient is obese. "
        elif bmi >= 25:
            text += "The patient is overweight. "

        text += (
            f"Blood pressure is {patient_data['ap_hi']}/"
            f"{patient_data['ap_lo']} mmHg. "
        )

        chol_map   = {1: 180, 2: 220, 3: 260}
        total_chol = chol_map.get(patient_data["cholesterol"], 200)
        text += (
            f"Estimated cholesterol level is "
            f"{CholesterolClassifier.classify_total(total_chol)}. "
        )

        if patient_data["cholesterol"] >= 2:
            text += "Cholesterol is elevated. "
        if patient_data["gluc"] >= 2:
            text += "Glucose is elevated. "
        if patient_data["smoke"]:
            text += "The patient is a smoker. "
        if not patient_data["active"]:
            text += "Physical activity is low. "

        text += (
            f"Predicted 10-year cardiovascular risk is {cvd_risk_level}. "
            f"Predicted 10-year stroke risk is {stroke_risk_level}."
        )
        return text


# ==========================================================
# FRAMINGHAM 2008 CVD RISK  (D'Agostino et al. Circulation 2008)
# FRAMINGHAM STROKE PROFILE (D'Agostino et al. Stroke 1994)
# Both return 10-year risk as a percentage.
# ==========================================================
class CardiovascularRiskCalculator:

    CHOL_MAP = {1: 185, 2: 220, 3: 260}
    HDL_MAP  = {1: 55,  2: 48,  3: 42}

    @staticmethod
    def framingham_cvd(patient_data: dict) -> float:
        age        = patient_data["age"]
        sbp        = patient_data["ap_hi"]
        total_chol = CardiovascularRiskCalculator.CHOL_MAP.get(
            patient_data["cholesterol"], 200
        )
        hdl_chol   = CardiovascularRiskCalculator.HDL_MAP.get(
            patient_data["cholesterol"], 50
        )
        smoke      = patient_data["smoke"]
        diabetes   = 1 if patient_data["gluc"] >= 2 else 0
        bp_treated = 0
        male       = (patient_data["gender"] == 1)

        if male:
            lsum = (
                3.06117 * math.log(age)
                + 1.12370 * math.log(total_chol)
                - 0.93263 * math.log(hdl_chol)
                + 1.93303 * math.log(sbp) * bp_treated
                + 1.99881 * math.log(sbp) * (1 - bp_treated)
                + 0.65451 * smoke
                + 0.57367 * diabetes
            )
            baseline_surv = 0.88936
            mean_coef     = 23.9802
        else:
            lsum = (
                2.32888 * math.log(age)
                + 1.20904 * math.log(total_chol)
                - 0.70833 * math.log(hdl_chol)
                + 2.76157 * math.log(sbp) * bp_treated
                + 2.82263 * math.log(sbp) * (1 - bp_treated)
                + 0.52873 * smoke
                + 0.69154 * diabetes
            )
            baseline_surv = 0.94833
            mean_coef     = 26.1931

        risk = (1 - baseline_surv ** math.exp(lsum - mean_coef)) * 100
        return round(min(max(risk, 0.1), 100.0), 2)

    @staticmethod
    def framingham_stroke(patient_data: dict) -> float:
        age      = patient_data["age"]
        sbp      = patient_data["ap_hi"]
        smoke    = patient_data["smoke"]
        diabetes = 1 if patient_data["gluc"] >= 2 else 0
        af       = 0
        lvh      = 1 if (sbp >= 150 and age > 50) else 0
        male     = (patient_data["gender"] == 1)

        if male:
            lsum = (
                0.05  * age + 0.029 * sbp
                + 0.775 * smoke + 0.801 * diabetes
                + 0.624 * af   + 0.619 * lvh
            )
            baseline_10yr = 0.8832
            mean_sum      = 6.77
        else:
            lsum = (
                0.074 * age + 0.022 * sbp
                + 0.557 * smoke + 0.822 * diabetes
                + 0.530 * af   + 0.701 * lvh
            )
            baseline_10yr = 0.8791
            mean_sum      = 7.77

        risk = (1 - baseline_10yr ** math.exp(lsum - mean_sum)) * 100
        return round(min(max(risk, 0.1), 100.0), 2)


# ==========================================================
# RULE-BASED DISEASE ENGINE  (CAD + STROKE focus)
# ==========================================================
class RuleBasedDiseaseEngine:

    def detect_diseases(
        self,
        patient_data: dict,
        cvd_score: float,
        stroke_score: float,
    ) -> list:
        diseases   = []
        ap_hi      = patient_data["ap_hi"]
        ap_lo      = patient_data["ap_lo"]
        age        = patient_data["age"]
        smoker     = patient_data["smoke"]
        bmi        = patient_data["bmi"]
        gluc       = patient_data["gluc"]
        chol_map   = {1: 180, 2: 220, 3: 260}
        total_chol = chol_map.get(patient_data["cholesterol"], 200)

        if ap_hi >= 140 or ap_lo >= 90:
            diseases.append("Hypertension")
        if patient_data["cholesterol"] >= 2:
            diseases.append("Dyslipidemia")
        if total_chol >= 200:
            diseases.append("Atherosclerosis")
        if age > 45 and (total_chol >= 200 or smoker):
            diseases.append("Coronary Artery Disease")
        if cvd_score >= 7.5:
            diseases.append("High Cardiovascular Risk")

        stroke_rules = (
            (ap_hi >= 130 and total_chol >= 240)
            or (ap_hi >= 140 and age >= 55)
            or (ap_hi >= 130 and gluc >= 2)
        )
        if stroke_score >= 10 or stroke_rules:
            diseases.append("Stroke Risk")

        if ap_hi >= 160:
            diseases.append("Heart Failure Risk")
        if ap_hi >= 150 and age > 50:
            diseases.append("Left Ventricular Hypertrophy")
        if total_chol >= 220 and smoker:
            diseases.append("Peripheral Artery Disease")
        if bmi >= 30 and gluc >= 2 and ap_hi >= 130:
            diseases.append("Metabolic Syndrome")

        return list(set(diseases))


# ==========================================================
# BIOBERT SEMANTIC RETRIEVER  (uses [CLS] cosine similarity)
# ==========================================================
class BioBERTSemanticRetriever:

    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained(
            "dmis-lab/biobert-base-cased-v1.2"
        )
        self.model = AutoModel.from_pretrained(
            "dmis-lab/biobert-base-cased-v1.2"
        )
        self.model.eval()

        self.knowledge_base = {
            "Hypertension": (
                "Persistent elevated blood pressure above 140/90 mmHg. "
                "Causes arterial wall damage and increases cardiac workload. "
                "Recommended tests: ECG, ambulatory BP monitoring, "
                "renal function panel."
            ),
            "Dyslipidemia": (
                "Abnormal lipid levels (elevated LDL, total cholesterol "
                "or triglycerides, or low HDL) increasing cardiovascular risk. "
                "Recommended tests: fasting full lipid profile."
            ),
            "Atherosclerosis": (
                "Cholesterol plaque buildup inside arterial walls causing "
                "progressive narrowing and reduced tissue perfusion. "
                "Recommended tests: lipid profile, CT angiography, ABI."
            ),
            "Coronary Artery Disease": (
                "Reduced coronary blood flow due to atherosclerotic narrowing "
                "of coronary arteries, leading to myocardial ischemia. "
                "Recommended tests: ECG, Troponin, Echocardiography, "
                "stress test, coronary CT angiography."
            ),
            "Stroke Risk": (
                "Elevated risk of ischemic or hemorrhagic cerebrovascular "
                "accident. Key risk factors include hypertension, dyslipidemia, "
                "diabetes, and advanced age. "
                "Recommended tests: carotid Doppler ultrasound, MRI brain, "
                "CT scan, coagulation profile, echocardiography, HbA1c."
            ),
            "High Cardiovascular Risk": (
                "10-year Framingham CVD risk >= 7.5%, indicating intermediate "
                "to high probability of myocardial infarction, stroke or "
                "cardiovascular death. "
                "Recommended: statin therapy assessment, aspirin evaluation, "
                "comprehensive cardiac workup."
            ),
            "Heart Failure Risk": (
                "Possible reduced cardiac output due to sustained pressure "
                "overload or ischemic damage. "
                "Recommended tests: BNP/NT-proBNP, Echocardiography, "
                "chest X-ray."
            ),
            "Left Ventricular Hypertrophy": (
                "Heart muscle thickening caused by chronic pressure overload "
                "from hypertension. Increases risk of arrhythmia and HF. "
                "Recommended tests: ECG, Echocardiography."
            ),
            "Peripheral Artery Disease": (
                "Reduced blood flow to the limbs due to peripheral arterial "
                "atherosclerosis. "
                "Recommended tests: ankle-brachial index, Doppler ultrasound."
            ),
            "Metabolic Syndrome": (
                "Cluster of obesity, hypertension and glucose abnormalities "
                "that markedly raises cardiovascular and diabetes risk. "
                "Recommended tests: fasting glucose, HbA1c, lipid panel, "
                "waist circumference."
            ),
        }

        self._kb_keys       = list(self.knowledge_base.keys())
        self._kb_embeddings = self._encode_batch(
            [f"{k}: {v}" for k, v in self.knowledge_base.items()]
        )

    def _encode_batch(self, texts: list) -> torch.Tensor:
        inputs = self.tokenizer(
            texts, return_tensors="pt", padding=True,
            truncation=True, max_length=128,
        )
        with torch.no_grad():
            out = self.model(**inputs)
        cls = out.last_hidden_state[:, 0, :]
        return F.normalize(cls, dim=-1)

    def retrieve_relevant_evidence(self, disease: str) -> str:
        if disease in self.knowledge_base:
            return self.knowledge_base[disease]
        query_emb = self._encode_batch([disease])
        scores    = (query_emb @ self._kb_embeddings.T).squeeze(0)
        best_idx  = int(scores.argmax())
        return self.knowledge_base[self._kb_keys[best_idx]]


# ==========================================================
# TEMPLATE EXPLANATION BUILDER
# ----------------------------------------------------------
# Replaces BioGPT.  BioGPT was generating PubMed abstract
# titles ("A case report and review of literature") instead
# of clinical explanations because it is a LITERATURE model
# trained on biomedical papers, not on clinical notes.
#
# This builder assembles a structured, patient-specific
# clinical explanation by combining:
#   1. The disease mechanism (from BioBERT-retrieved evidence)
#   2. Confirmed patient risk factors that apply to this disease
#   3. The recommended diagnostic tests from the KB
#
# Output is deterministic, factually grounded, and auditable
# — important properties for a clinical FYP system.
# ==========================================================
class TemplateExplanationBuilder:

    # Risk factor sentences keyed by (factor, disease_group)
    # disease_group: "bp", "lipid", "gluc", "smoke", "age", "bmi"
    FACTOR_SENTENCES = {
        "bp": (
            "Blood pressure of {ap_hi}/{ap_lo} mmHg represents "
            "{bp_category}, directly contributing to {disease}."
        ),
        "lipid": (
            "Elevated cholesterol ({chol_category}) promotes "
            "arterial plaque formation relevant to {disease}."
        ),
        "gluc": (
            "Elevated glucose suggests insulin resistance or "
            "diabetes, a major risk amplifier for {disease}."
        ),
        "smoke": (
            "Active smoking accelerates endothelial damage "
            "and atherosclerosis, worsening {disease}."
        ),
        "bmi": (
            "BMI of {bmi:.1f} ({bmi_category}) contributes to "
            "haemodynamic stress and lipid dysregulation in {disease}."
        ),
        "age": (
            "Age {age} places the patient in a higher-risk demographic "
            "for {disease}, as vascular stiffness increases with age."
        ),
    }

    # Which factors are relevant for each disease
    DISEASE_FACTORS = {
        "Hypertension":            ["bp", "bmi", "age"],
        "Dyslipidemia":            ["lipid", "gluc", "bmi"],
        "Atherosclerosis":         ["lipid", "bp", "smoke", "age"],
        "Coronary Artery Disease": ["bp", "lipid", "smoke", "gluc", "age"],
        "Stroke Risk":             ["bp", "lipid", "gluc", "smoke", "age"],
        "High Cardiovascular Risk":["bp", "lipid", "gluc", "smoke", "bmi", "age"],
        "Heart Failure Risk":      ["bp", "bmi", "age"],
        "Left Ventricular Hypertrophy": ["bp", "age"],
        "Peripheral Artery Disease":    ["lipid", "smoke"],
        "Metabolic Syndrome":      ["bmi", "gluc", "bp"],
    }

    @staticmethod
    def _bp_category(ap_hi: float, ap_lo: float) -> str:
        if ap_hi >= 180 or ap_lo >= 120:
            return "hypertensive crisis"
        elif ap_hi >= 140 or ap_lo >= 90:
            return "stage 2 hypertension"
        elif ap_hi >= 130 or ap_lo >= 80:
            return "stage 1 hypertension"
        elif ap_hi >= 120:
            return "elevated blood pressure"
        else:
            return "normal blood pressure"

    @staticmethod
    def _chol_category(chol_code: int) -> str:
        return {1: "normal range", 2: "above-normal", 3: "well above normal"}.get(
            chol_code, "unknown"
        )

    @staticmethod
    def _bmi_category(bmi: float) -> str:
        if bmi >= 30:
            return "obese"
        elif bmi >= 25:
            return "overweight"
        else:
            return "normal weight"

    def build(
        self,
        disease: str,
        patient_data: dict,
        evidence: str,
    ) -> str:
        """
        Builds a 3-part explanation:
          Part 1: Disease mechanism (from BioBERT evidence, first sentence)
          Part 2: Patient-specific contributing factors
          Part 3: Recommended diagnostic tests (from evidence)
        """
        # Extract mechanism and tests from evidence
        evidence_sentences = [s.strip() for s in evidence.split(".") if s.strip()]
        mechanism   = evidence_sentences[0] + "." if evidence_sentences else ""
        tests_raw   = next(
            (s for s in evidence_sentences if "Recommended" in s), ""
        )
        tests_part  = (tests_raw + ".").strip() if tests_raw else ""

        # Build patient factor sentences
        factors     = self.DISEASE_FACTORS.get(disease, ["bp", "lipid"])
        factor_parts = []

        bp_cat   = self._bp_category(patient_data["ap_hi"], patient_data["ap_lo"])
        chol_cat = self._chol_category(patient_data["cholesterol"])
        bmi_val  = patient_data["bmi"]
        bmi_cat  = self._bmi_category(bmi_val)

        for factor in factors:
            # Only include factor if it is actually elevated/present
            if factor == "bp" and patient_data["ap_hi"] < 120 and patient_data["ap_lo"] < 80:
                continue
            if factor == "lipid" and patient_data["cholesterol"] < 2:
                continue
            if factor == "gluc" and patient_data["gluc"] < 2:
                continue
            if factor == "smoke" and patient_data["smoke"] == 0:
                continue
            if factor == "bmi" and bmi_val < 25:
                continue

            tmpl = self.FACTOR_SENTENCES[factor]
            sent = tmpl.format(
                ap_hi        = patient_data["ap_hi"],
                ap_lo        = patient_data["ap_lo"],
                bp_category  = bp_cat,
                chol_category= chol_cat,
                bmi          = bmi_val,
                bmi_category = bmi_cat,
                age          = patient_data["age"],
                disease      = disease,
            )
            factor_parts.append(sent)

        factors_text = (
            " ".join(factor_parts)
            if factor_parts
            else f"Multiple risk factors contribute to {disease} in this patient."
        )

        explanation = f"{mechanism} {factors_text}"
        if tests_part:
            explanation += f" {tests_part}"

        return explanation.strip()

    def rebuild_corrected(
        self,
        disease: str,
        patient_data: dict,
        evidence: str,
        hallucinations: list,
    ) -> str:
        """
        For the correction pipeline: same template build,
        but appends a note about which claims were removed.
        Since template output is already fact-grounded,
        this is mainly a safety path.
        """
        base = self.build(disease, patient_data, evidence)
        removed = "; ".join(hallucinations)
        return f"{base} [Correction applied: removed — {removed}]"


# ==========================================================
# POST-GENERATION FACT-GROUNDING FILTER
# Safety net: strips any sentence contradicting patient facts.
# Template output should never trigger this, but it runs as
# a final guard on any free-text in the pipeline.
# ==========================================================
def fact_ground_explanation(explanation: str, patient_data: dict) -> str:
    if not explanation:
        return explanation

    sentences   = re.split(r'(?<=[.!?])\s+', explanation.strip())
    filtered    = []
    male        = (patient_data["gender"] == 1)
    non_smoker  = (patient_data["smoke"] == 0)
    no_diabetes = (patient_data["gluc"] < 2)

    for sent in sentences:
        s = sent.lower()

        if non_smoker:
            smoking_pos = bool(
                re.search(
                    r'\b(is a smoker|current smoker|active smoker'
                    r'|history of smoking|smoking history|smokes)\b', s
                )
                or (
                    re.search(r'\bsmoker\b', s)
                    and not re.search(r'\bnon.smoker\b', s)
                    and not re.search(r'\bnot a smoker\b', s)
                    and not re.search(r'\bno smoking\b', s)
                )
            )
            if smoking_pos:
                continue

        if male:
            if re.search(r'\b(she|her\b|woman|female patient)\b', s):
                continue
        else:
            if re.search(r'\b(he\b|his\b|man\b|male patient)\b', s):
                continue

        if no_diabetes:
            diabetes_pos = bool(
                re.search(r'\b(diabetes|diabetic)\b', s)
                and not re.search(
                    r'\b(no diabetes|non.diabetic|without diabetes)\b', s
                )
            )
            if diabetes_pos:
                continue

        filtered.append(sent)

    result = " ".join(filtered).strip()
    return (
        result
        if result
        else "[Explanation filtered — all sentences contained factual errors]"
    )


# ==========================================================
# FLAN-T5 VALIDATOR
# ==========================================================
class LLMValidator:

    def __init__(self):
        self.tokenizer = AutoTokenizer.from_pretrained(
            "google/flan-t5-base"
        )
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            "google/flan-t5-base"
        )
        self.model.eval()

    def validate(
        self, disease: str, patient_data: dict, explanation: str
    ) -> dict:
        short_expl = explanation[:200]

        prompt = (
            f"Is this medical explanation clinically correct? "
            f"Answer VALID or INVALID with a short reason.\n"
            f"Disease: {disease}\n"
            f"Patient: Age={patient_data['age']}, "
            f"BP={patient_data['ap_hi']}/{patient_data['ap_lo']}, "
            f"BMI={round(patient_data['bmi'], 2)}, "
            f"Smoker={'yes' if patient_data['smoke'] else 'no'}\n"
            f"Explanation: {short_expl}"
        )

        inputs = self.tokenizer(
            prompt, return_tensors="pt",
            truncation=True, max_length=256,
        )
        with torch.no_grad():
            outputs = self.model.generate(**inputs, max_new_tokens=60)

        validation_text = self.tokenizer.decode(
            outputs[0], skip_special_tokens=True
        ).strip()

        hallucinations = []
        expl_lower     = explanation.lower()

        smoking_pos = bool(
            re.search(
                r'\b(is a smoker|current smoker|active smoker'
                r'|history of smoking|smoking history|smokes)\b',
                expl_lower
            )
            or (
                re.search(r'\bsmoker\b', expl_lower)
                and not re.search(r'\bnon.smoker\b', expl_lower)
                and not re.search(r'\bnot a smoker\b', expl_lower)
            )
        )
        if smoking_pos and patient_data["smoke"] == 0:
            hallucinations.append(
                "Smoking positively asserted but patient is non-smoker."
            )

        obesity_pos = bool(
            re.search(r'\bobese\b', expl_lower)
            and not re.search(r'\b(non.obese|not obese)\b', expl_lower)
        )
        if obesity_pos and patient_data["bmi"] < 30:
            hallucinations.append("Obesity asserted but BMI < 30.")

        diabetes_pos = bool(
            re.search(r'\b(diabetes|diabetic)\b', expl_lower)
            and not re.search(
                r'\b(no diabetes|non.diabetic|without diabetes)\b',
                expl_lower,
            )
        )
        if diabetes_pos and patient_data["gluc"] < 2:
            hallucinations.append("Diabetes asserted without elevated glucose.")

        for term in ["tumor", "cancer", "kidney failure",
                     "infection", "liver disease"]:
            if term in expl_lower:
                hallucinations.append(f"Unsupported condition: {term}")

        vt_upper    = validation_text.upper().strip()
        llm_invalid = vt_upper.startswith("INVALID") or (
            "INVALID" in vt_upper
            and "VALID" not in vt_upper.replace("INVALID", "")
        )

        return {
            "is_valid":       not (llm_invalid or len(hallucinations) > 0),
            "llm_validation": validation_text,
            "hallucinations": hallucinations,
        }


# ==========================================================
# MAIN CARDIO DECISION SUPPORT SYSTEM
# ==========================================================
class CardioDecisionSupportSystem:

    def __init__(self):
        self.narrative_gen  = ClinicalNarrativeGenerator()
        self.disease_engine = RuleBasedDiseaseEngine()
        self.biobert        = BioBERTSemanticRetriever()
        self.explainer      = TemplateExplanationBuilder()
        self.validator      = LLMValidator()

    def evaluate(self, patient_data: dict) -> dict:

        cvd_score    = CardiovascularRiskCalculator.framingham_cvd(patient_data)
        stroke_score = CardiovascularRiskCalculator.framingham_stroke(patient_data)

        # AHA/ACC thresholds
        if cvd_score < 7.5:
            cvd_level = "Low"
        elif cvd_score < 20:
            cvd_level = "Intermediate"
        else:
            cvd_level = "High"

        if stroke_score < 10:
            stroke_level = "Low"
        elif stroke_score < 20:
            stroke_level = "Intermediate"
        else:
            stroke_level = "High"

        clinical_summary = self.narrative_gen.generate(
            patient_data, cvd_level, stroke_level
        )

        diseases = self.disease_engine.detect_diseases(
            patient_data, cvd_score, stroke_score
        )

        verified_results = []

        for disease in diseases:
            # BioBERT retrieval
            evidence = self.biobert.retrieve_relevant_evidence(disease)

            # Template explanation (fact-grounded, no hallucination risk)
            explanation = self.explainer.build(disease, patient_data, evidence)
            explanation = fact_ground_explanation(explanation, patient_data)

            # FLAN-T5 validation
            validation = self.validator.validate(
                disease, patient_data, explanation
            )

            # Correction path (safety net — template rarely triggers this)
            if not validation["is_valid"] and validation["hallucinations"]:
                corrected = self.explainer.rebuild_corrected(
                    disease, patient_data, evidence,
                    validation["hallucinations"]
                )
                final_explanation = fact_ground_explanation(
                    corrected, patient_data
                )
            else:
                final_explanation = explanation

            verified_results.append({
                "disease":            disease,
                "retrieved_evidence": evidence,
                "validated":          validation["is_valid"],
                "hallucinations":     validation["hallucinations"],
                "llm_validation":     validation["llm_validation"],
                "final_explanation":  final_explanation,
            })

        return {
            "clinical_summary":        clinical_summary,
            "framingham_cvd_score":    cvd_score,
            "cvd_risk_level":          cvd_level,
            "framingham_stroke_score": stroke_score,
            "stroke_risk_level":       stroke_level,
            "detected_diseases":       diseases,
            "verified_results":        verified_results,
        }


# ==========================================================
# MAIN PREDICTION FUNCTION
# ==========================================================

SYSTEM = None

def analyze_patient(input_data: CardioInput) -> dict:
    global SYSTEM

    payload = input_data.model_dump()
    payload = engineer_features(payload)

    if SYSTEM is None:
        SYSTEM = CardioDecisionSupportSystem()

    return SYSTEM.evaluate(payload)


# ==========================================================
# MAIN PREDICTION FUNCTION
# ==========================================================
# def analyze_patient(input_data: CardioInput) -> dict:
#     payload = input_data.model_dump()
#     payload = engineer_features(payload)
#     system  = CardioDecisionSupportSystem()
#     return system.evaluate(payload)


# # ==========================================================
# # SAMPLE EXECUTION
# # ==========================================================
# if __name__ == "__main__":

#     patient = CardioInput(
#         age=61,
#         gender=2,       # 2 = female
#         height=178,
#         weight=95,
#         ap_hi=130,
#         ap_lo=90,
#         cholesterol=3,
#         gluc=3,
#         smoke=0,
#         alco=0,
#         active=1,
#     )

#     results = analyze_patient(patient)

#     print("\n============================")
#     print("CLINICAL SUMMARY")
#     print("============================")
#     print(results["clinical_summary"])

#     print("\n============================")
#     print("FRAMINGHAM CVD SCORE  (%)")
#     print("============================")
#     print(
#         results["framingham_cvd_score"],
#         f"→ {results['cvd_risk_level']} Risk"
#     )

#     print("\n============================")
#     print("FRAMINGHAM STROKE SCORE  (%)")
#     print("============================")
#     print(
#         results["framingham_stroke_score"],
#         f"→ {results['stroke_risk_level']} Risk"
#     )

#     print("\n============================")
#     print("DETECTED DISEASES")
#     print("============================")
#     print(results["detected_diseases"])

#     print("\n============================")
#     print("VERIFIED RESULTS")
#     print("============================")

#     for item in results["verified_results"]:
#         print("\n--------------------------------")
#         print("Disease:", item["disease"])
#         print("\nRetrieved Evidence:")
#         print(item["retrieved_evidence"])
#         print("\nValidated:", item["validated"])
#         print("\nHallucinations:", item["hallucinations"])
#         print("\nLLM Validation:", item["llm_validation"])
#         print("\nFinal Explanation:")
#         print(item["final_explanation"])