# import sys
# print("STARTED — args:", sys.argv)

# =============================================================================
# 🏥 CADICA PATIENT-LEVEL INFERENCE — WEIGHTED AVERAGE AGGREGATION
# =============================================================================
#
# Runs inference on ALL videos of a patient and aggregates results using
# a confidence-weighted average probability to determine patient-level
# lesion status. Noisy/uncertain videos (prob close to 0.5) contribute
# very little; confident videos dominate the final verdict.
#
# IMPORTANT — ground truth scope in CADICA:
#   ✓ Frame-level  : bounding boxes in groundtruth/pX_vY_000ZZ.txt
#   ✓ Video-level  : lesionVideos.txt / nonlesionVideos.txt
#   ✗ Patient-level: does NOT exist in the dataset
#
#   Per-video predictions are evaluated against video-level GT.
#   The patient-level verdict is a clinical output only — there is
#   no dataset label to compare it against.
#
# Usage:
#   python THIRD_MODEL_V2.py \
#       --model   "C:/path/to/best_model.pth" \
#       --dataset "C:/path/to/CADICA" \
#       --patient p1
#
# Output:
#   - Per-video GT label vs prediction printed to terminal
#   - Per-video accuracy summary  (video-level GT is valid)
#   - Patient-level verdict       (clinical output, no GT to compare)
#   - Per-video Grad-CAM figures  → ./patient_output/pX/
#   - Patient summary figure      → ./patient_output/pX_summary.png
# =============================================================================

import os
import cv2
import torch
import numpy as np
import argparse
import torch.nn as nn
import torchvision.models as models
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.gridspec as gridspec
from pathlib import Path
from dataclasses import dataclass
from typing import List, Tuple, Optional

# -----------------------------------------------------------------------------
# ⚙️  GLOBAL CONFIG
# -----------------------------------------------------------------------------
SEQ_LEN   = 9
IMG_SIZE  = 224
THRESHOLD = 0.3
MEAN      = np.array([0.485, 0.456, 0.406])
STD       = np.array([0.229, 0.224, 0.225])
device    = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# -----------------------------------------------------------------------------
# 🧠  MODEL
# -----------------------------------------------------------------------------
class CNN_LSTM(nn.Module):
    def __init__(self):
        super().__init__()
        self.cnn = models.mobilenet_v2(weights=None)
        self.cnn.classifier[1] = nn.Linear(1280, 128)
        self.lstm = nn.LSTM(128, 64, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C, H, W = x.shape
        x        = x.view(B * T, C, H, W)
        features = self.cnn(x)
        features = features.view(B, T, -1)
        lstm_out, _ = self.lstm(features)
        x = torch.mean(lstm_out, dim=1)
        return self.fc(x)






# -----------------------------------------------------------------------------
# 📂  CADICA PATH RESOLVER
# -----------------------------------------------------------------------------
class CADICAVideo:
    """Resolves all filesystem paths for one pX / vY video."""

    def __init__(self, dataset_root: str, patient: str, video: str):
        self.root        = Path(dataset_root)
        self.patient     = patient
        self.video       = video
        self.patient_dir = self.root / "selectedVideos" / patient
        self.video_dir   = self.patient_dir / video
        self.input_dir   = self.video_dir / "input"
        self.gt_dir      = self.video_dir / "groundtruth"
        self._validate()

    def _validate(self):
        if not self.patient_dir.exists():
            avail = [d.name for d in (self.root / "selectedVideos").iterdir()
                     if d.is_dir()]
            raise FileNotFoundError(
                f"Patient '{self.patient}' not found.\nAvailable: {avail}"
            )
        if not self.video_dir.exists():
            avail = [d.name for d in self.patient_dir.iterdir() if d.is_dir()]
            raise FileNotFoundError(
                f"Video '{self.video}' not found for {self.patient}.\n"
                f"Available: {avail}"
            )
        if not self.input_dir.exists():
            raise FileNotFoundError(
                f"'input/' folder missing in: {self.video_dir}"
            )

    def get_ground_truth_label(self) -> str:
        """
        Returns the VIDEO-level ground truth label.
        'LESION', 'NO LESION', or 'UNKNOWN'.
        This is the finest patient-related label CADICA provides.
        There is NO patient-level label in this dataset.
        """
        def _read(name: str) -> set:
            p = self.patient_dir / name
            return set(p.read_text().splitlines()) if p.exists() else set()
        if self.video in _read("lesionVideos.txt"):    return "LESION"
        if self.video in _read("nonlesionVideos.txt"): return "NO LESION"
        return "UNKNOWN"

    def get_keyframe_ids(self) -> List[str]:
        txt = self.video_dir / f"{self.patient}_{self.video}_selectedFrames.txt"
        if not txt.exists():
            return []
        return [l.strip() for l in txt.read_text().splitlines() if l.strip()]

    def get_all_frames(self) -> List[str]:
        frames = sorted(
            f.name for f in self.input_dir.iterdir()
            if f.suffix.lower() == ".png"
        )
        if not frames:
            raise FileNotFoundError(f"No PNG frames in: {self.input_dir}")
        return frames

    def get_bboxes_for_frame(self, frame_name: str) -> List[Tuple[int,int,int,int]]:
        if not self.gt_dir.exists():
            return []
        gt_file = self.gt_dir / f"{Path(frame_name).stem}.txt"
        if not gt_file.exists():
            return []
        bboxes = []
        for line in gt_file.read_text().splitlines():
            parts = line.strip().replace(",", " ").split()
            if len(parts) >= 4:
                try:
                    bboxes.append(tuple(int(p) for p in parts[:4]))
                except ValueError:
                    continue
        return bboxes


# -----------------------------------------------------------------------------
# 🖼️  PREPROCESSING
# -----------------------------------------------------------------------------
def preprocess_frame(img_bgr: np.ndarray) -> torch.Tensor:
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (IMG_SIZE, IMG_SIZE))
    img = img.astype(np.float32) / 255.0
    img = (img - MEAN) / STD
    return torch.tensor(img).permute(2, 0, 1).float()


def sample_frames(all_frames: List[str], seq_len: int):
    indices = np.linspace(0, len(all_frames) - 1, seq_len, dtype=int)
    return [all_frames[i] for i in indices], indices.tolist()


# -----------------------------------------------------------------------------
# 🔥  GRAD-CAM
# -----------------------------------------------------------------------------
class GradCAM:
    def __init__(self, model: CNN_LSTM):
        self.model       = model
        self.gradients   = None
        self.activations = None
        target = model.cnn.features[-1]
        target.register_forward_hook(self._save_act)
        target.register_full_backward_hook(self._save_grad)

    def _save_act(self, m, i, o):    self.activations = o.detach()
    def _save_grad(self, m, gi, go): self.gradients   = go[0].detach()

    def compute(self, frame_tensor: torch.Tensor) -> np.ndarray:
        self.model.zero_grad()
        for p in self.model.parameters(): p.requires_grad_(True)
        x   = frame_tensor.unsqueeze(0).unsqueeze(0).to(device)
        out = self.model(x)
        out.backward()
        weights = self.gradients.mean(dim=(2, 3), keepdim=True)
        cam     = torch.relu((weights * self.activations).sum(dim=1).squeeze())
        cam     = cam.cpu().numpy()
        if cam.max() > 0:
            cam /= cam.max()
        return cv2.resize(cam, (IMG_SIZE, IMG_SIZE))


# -----------------------------------------------------------------------------
# 📊  FRAME IMPORTANCE
# -----------------------------------------------------------------------------
def compute_frame_importance(model: CNN_LSTM,
                              seq_tensor: torch.Tensor) -> np.ndarray:
    model.zero_grad()
    for p in model.parameters(): p.requires_grad_(True)
    x = seq_tensor.to(device)
    B, T, C, H, W = x.shape
    feats = model.cnn(x.view(B * T, C, H, W)).view(B, T, -1)
    feats.retain_grad()
    lstm_out, _ = model.lstm(feats)
    model.fc(torch.mean(lstm_out, dim=1)).backward()
    imp = feats.grad[0].abs().mean(dim=1).cpu().detach().numpy()
    if imp.max() > 0:
        imp /= imp.max()
    return imp


# -----------------------------------------------------------------------------
# 🔢  WEIGHTED AVERAGE AGGREGATION
# -----------------------------------------------------------------------------
@dataclass
class VideoResult:
    """Everything produced for one video."""
    patient:            str
    video:              str
    probability:        float
    prediction:         str
    confidence:         float
    gt_label:           str       # video-level GT from lesionVideos.txt
    sampled_frames:     List[str]
    frame_importance:   List[float]
    grad_cams:          List[np.ndarray]
    bboxes_per_frame:   List[list]
    gradcam_image_path: Optional[str] = None
    weight:             float = 0.0


def compute_video_weight(prob: float) -> float:
    """
    Confidence weight = 2 × |prob − 0.5|   ∈ [0, 1]

    prob=0.95  →  weight=0.90   very confident LESION
    prob=0.34  →  weight=0.32   uncertain, treated as noise
    prob=0.51  →  weight=0.02   pure noise, almost no influence
    prob=0.05  →  weight=0.90   very confident NO LESION
    """
    return 2.0 * abs(prob - 0.5)


def weighted_average_verdict(video_results: List[VideoResult],
                             threshold: float = THRESHOLD) -> dict:
    """
    Aggregates per-video probabilities into one patient-level probability
    using confidence-weighted averaging.

    NOTE: The returned verdict is a CLINICAL OUTPUT only.
    CADICA does not provide a patient-level ground truth label,
    so this verdict cannot be marked correct or incorrect.
    """
    weighted_sum = 0.0
    total_weight = 0.0
    weight_log   = []

    for r in video_results:
        w             = compute_video_weight(r.probability)
        r.weight      = w
        weighted_sum += r.probability * w
        total_weight += w
        weight_log.append((r.video, r.probability, w))

    # fallback if every video is maximally uncertain (edge case)
    if total_weight < 1e-6:
        weighted_avg = sum(r.probability for r in video_results) / len(video_results)
    else:
        weighted_avg = weighted_sum / total_weight

    verdict    = "LESION" if weighted_avg >= threshold else "NO LESION"
    confidence = weighted_avg if verdict == "LESION" else 1.0 - weighted_avg

    most_suspicious = max(video_results, key=lambda r: r.probability)

    return {
        "weighted_avg_prob":     weighted_avg,
        "verdict":               verdict,
        "confidence":            confidence,
        "most_suspicious_video": most_suspicious.video,
        "most_suspicious_prob":  most_suspicious.probability,
        "weight_log":            weight_log,
    }


def compute_video_accuracy(video_results: List[VideoResult]) -> dict:
    """
    Computes per-video classification accuracy against video-level GT.
    This is the only level at which CADICA provides ground truth.
    Patient-level accuracy is NOT computed — no such label exists.
    """
    evaluable = [r for r in video_results if r.gt_label != "UNKNOWN"]
    correct   = [r for r in evaluable if r.prediction == r.gt_label]

    # break down by class
    lesion_videos    = [r for r in evaluable if r.gt_label == "LESION"]
    nolesion_videos  = [r for r in evaluable if r.gt_label == "NO LESION"]
    lesion_correct   = [r for r in lesion_videos  if r.prediction == r.gt_label]
    nolesion_correct = [r for r in nolesion_videos if r.prediction == r.gt_label]

    return {
        "total_evaluable":       len(evaluable),
        "total_correct":         len(correct),
        "overall_accuracy":      len(correct) / len(evaluable) if evaluable else 0.0,
        "lesion_recall":         len(lesion_correct)   / len(lesion_videos)   if lesion_videos   else None,
        "nolesion_specificity":  len(nolesion_correct) / len(nolesion_videos) if nolesion_videos else None,
        "lesion_total":          len(lesion_videos),
        "nolesion_total":        len(nolesion_videos),
        "lesion_correct":        len(lesion_correct),
        "nolesion_correct":      len(nolesion_correct),
    }


# -----------------------------------------------------------------------------
# 🖨️  PER-VIDEO GRAD-CAM FIGURE
# -----------------------------------------------------------------------------
def _draw_bboxes(img_rgb: np.ndarray, bboxes: list,
                 orig_w: int, orig_h: int) -> np.ndarray:
    out = img_rgb.copy()
    sx, sy = IMG_SIZE / orig_w, IMG_SIZE / orig_h
    for (x, y, w, h) in bboxes:
        x1, y1 = int(x * sx), int(y * sy)
        x2, y2 = int((x + w) * sx), int((y + h) * sy)
        cv2.rectangle(out, (x1, y1), (x2, y2), (255, 215, 0), 2)
        cv2.putText(out, "GT", (x1, max(y1 - 4, 0)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 215, 0), 1)
    return out


def save_video_gradcam(cadica: CADICAVideo,
                       result: VideoResult,
                       out_dir: str) -> str:
    os.makedirs(out_dir, exist_ok=True)
    T          = len(result.sampled_frames)
    importance = np.array(result.frame_importance)

    # title shows video-level GT vs prediction (valid comparison)
    gt_tag = ""
    if result.gt_label != "UNKNOWN":
        match = result.prediction == result.gt_label
        gt_tag = f"  |  GT: {result.gt_label}  {'✓' if match else '✗'}"

    fig = plt.figure(figsize=(T * 4, 8))
    fig.suptitle(
        f"Patient: {cadica.patient}  |  Video: {cadica.video}\n"
        f"Prediction: {result.prediction}  ({result.confidence:.1%})"
        f"{gt_tag}  |  Weight: {result.weight:.3f}",
        fontsize=11, fontweight="bold",
        color="red" if result.prediction == "LESION" else "green",
    )

    gs           = gridspec.GridSpec(3, T, figure=fig, hspace=0.4, wspace=0.08)
    keyframe_ids = cadica.get_keyframe_ids()

    for i, fname in enumerate(result.sampled_frames):
        img_bgr        = cv2.imread(str(cadica.input_dir / fname))
        orig_h, orig_w = img_bgr.shape[:2]
        img_rgb        = cv2.cvtColor(
            cv2.resize(img_bgr, (IMG_SIZE, IMG_SIZE)), cv2.COLOR_BGR2RGB
        )
        is_top = (i == importance.argmax())
        is_key = Path(fname).stem.split("_")[-1] in keyframe_ids
        bboxes = result.bboxes_per_frame[i]

        # Row 0 — original frame + GT bounding boxes
        ax0 = fig.add_subplot(gs[0, i])
        ax0.imshow(_draw_bboxes(img_rgb, bboxes, orig_w, orig_h))
        lbl = f"F{i+1}\nImp:{importance[i]:.2f}"
        if is_key: lbl += "\n[Key]"
        ax0.set_title(lbl, fontsize=7,
                      color="darkred" if is_top else "black",
                      fontweight="bold" if is_top else "normal")
        ax0.axis("off")

        # Row 1 — Grad-CAM overlay
        hm  = cv2.applyColorMap(
            (result.grad_cams[i] * 255).astype(np.uint8), cv2.COLORMAP_JET
        )
        hm  = cv2.cvtColor(hm, cv2.COLOR_BGR2RGB)
        ov  = np.clip(img_rgb / 255.0 * 0.5 + hm / 255.0 * 0.5, 0, 1)
        ax1 = fig.add_subplot(gs[1, i])
        ax1.imshow(ov)
        ax1.set_title("Grad-CAM", fontsize=7)
        ax1.axis("off")
        if is_top:
            for sp in ax1.spines.values():
                sp.set_edgecolor("red"); sp.set_linewidth(2)

    # Row 2 — frame importance bar chart
    ax2    = fig.add_subplot(gs[2, :])
    colors = ["crimson" if j == importance.argmax() else "steelblue"
              for j in range(T)]
    ax2.bar(range(1, T + 1), importance, color=colors, edgecolor="black")
    ax2.set_xlabel("Sampled frame index", fontsize=9)
    ax2.set_ylabel("Importance", fontsize=9)
    ax2.set_title("Per-frame attribution", fontsize=9)
    ax2.set_xticks(range(1, T + 1))
    ax2.set_xticklabels(
        [f"F{j+1}\n{n}" for j, n in enumerate(result.sampled_frames)],
        fontsize=6,
    )
    ax2.set_ylim(0, 1.1)
    if any(result.bboxes_per_frame):
        ax2.legend(
            handles=[mpatches.Patch(color="gold", label="Gold = GT annotation")],
            loc="upper right", fontsize=8,
        )

    out_path = os.path.join(out_dir, f"{cadica.patient}_{cadica.video}_gradcam.png")
    plt.savefig(out_path, dpi=120, bbox_inches="tight")
    plt.close()
    return out_path


# -----------------------------------------------------------------------------
# 📈  PATIENT SUMMARY FIGURE
# -----------------------------------------------------------------------------
def save_patient_summary(patient: str,
                         video_results: List[VideoResult],
                         aggregation: dict,
                         accuracy: dict,
                         out_dir: str) -> str:
    os.makedirs(out_dir, exist_ok=True)

    videos  = [r.video      for r in video_results]
    probs   = [r.probability for r in video_results]
    weights = [r.weight      for r in video_results]
    verdict = aggregation["verdict"]
    w_avg   = aggregation["weighted_avg_prob"]

    # bar colours: red=LESION prediction, blue=NO LESION prediction
    bar_colors = ["red" if r.prediction == "LESION" else "steelblue"
                  for r in video_results]

    # edge colours: gold=correct video prediction, black=incorrect, gray=unknown
    def edge_color(r: VideoResult):
        if r.gt_label == "UNKNOWN": return "gray"
        return "gold" if r.prediction == r.gt_label else "black"
    edge_colors = [edge_color(r) for r in video_results]

    fig, axes = plt.subplots(1, 2, figsize=(max(len(videos) * 2, 12), 6))

    # ── title: patient verdict (no CORRECT/INCORRECT — no patient-level GT) ──
    fig.suptitle(
        f"Patient {patient}  —  Weighted Average Aggregation\n"
        f"Patient verdict: {verdict}  ({aggregation['confidence']:.1%} confidence)\n"
        f"[No patient-level GT in CADICA — verdict is clinical output only]\n"
        f"Video-level accuracy: {accuracy['total_correct']}/{accuracy['total_evaluable']} correct  "
        f"|  Lesion recall: "
        f"{accuracy['lesion_correct']}/{accuracy['lesion_total']}  "
        f"|  Specificity: "
        f"{accuracy['nolesion_correct']}/{accuracy['nolesion_total']}",
        fontsize=11, fontweight="bold",
        color="red" if verdict == "LESION" else "green",
    )

    # Left — raw probabilities per video
    ax = axes[0]
    bars = ax.bar(videos, probs, color=bar_colors,
                  edgecolor=edge_colors, linewidth=2, alpha=0.85)
    ax.axhline(THRESHOLD, color="orange", linestyle="--",
               linewidth=1.5, label=f"Per-video threshold ({THRESHOLD})")
    ax.axhline(w_avg, color="purple", linestyle="-",
               linewidth=2, label=f"Weighted avg ({w_avg:.3f})")
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Raw probability (sigmoid output)")
    ax.set_title("Per-video probabilities\n"
                 "(red=LESION pred, blue=NO LESION pred,\n"
                 " gold edge=correct video pred, black edge=incorrect)")
    ax.legend(fontsize=8)
    for bar, p in zip(bars, probs):
        ax.text(bar.get_x() + bar.get_width() / 2,
                p + 0.02, f"{p:.3f}",
                ha="center", va="bottom", fontsize=8)
    ax.tick_params(axis="x", rotation=45)

    # Right — weights per video
    ax2 = axes[1]
    weight_colors = ["teal" if w > 0.5 else "lightblue" for w in weights]
    ax2.bar(videos, weights, color=weight_colors, edgecolor="black", alpha=0.85)
    ax2.axhline(0.5, color="orange", linestyle="--",
                linewidth=1.5, label="Confident threshold (0.5)")
    ax2.set_ylim(0, 1.05)
    ax2.set_ylabel("Confidence weight  (2 × |prob − 0.5|)")
    ax2.set_title("Per-video weights\n"
                  "(teal=confident, light blue=uncertain/noise)")
    ax2.legend(fontsize=8)
    for bar, w in zip(ax2.patches, weights):
        ax2.text(bar.get_x() + bar.get_width() / 2,
                 w + 0.02, f"{w:.2f}",
                 ha="center", va="bottom", fontsize=8)
    ax2.tick_params(axis="x", rotation=45)

    plt.tight_layout()
    out_path = os.path.join(out_dir, f"{patient}_summary.png")
    plt.savefig(out_path, dpi=140, bbox_inches="tight")
    plt.close()
    print(f"\n📊  Patient summary saved → {out_path}")
    return out_path


# -----------------------------------------------------------------------------
# 🎬  SINGLE-VIDEO INFERENCE  (internal — returns VideoResult)
# -----------------------------------------------------------------------------
def _infer_one_video(model: CNN_LSTM,
                     cadica: CADICAVideo,
                     threshold: float = THRESHOLD) -> VideoResult:
    all_frames             = cadica.get_all_frames()
    sampled_names, _       = sample_frames(all_frames, SEQ_LEN)

    tensors = []
    for fname in sampled_names:
        img = cv2.imread(str(cadica.input_dir / fname))
        if img is None:
            raise FileNotFoundError(str(cadica.input_dir / fname))
        tensors.append(preprocess_frame(img))
    seq_tensor = torch.stack(tensors).unsqueeze(0)   # (1, T, C, H, W)

    with torch.no_grad():
        prob = torch.sigmoid(model(seq_tensor.to(device))).item()

    prediction = "LESION" if prob >= threshold else "NO LESION"
    confidence = prob if prediction == "LESION" else 1.0 - prob
    importance = compute_frame_importance(model, seq_tensor)

    gcam      = GradCAM(model)
    grad_cams = [
        gcam.compute(preprocess_frame(cv2.imread(str(cadica.input_dir / f))))
        for f in sampled_names
    ]
    bboxes_per_frame = [cadica.get_bboxes_for_frame(f) for f in sampled_names]

    return VideoResult(
        patient           = cadica.patient,
        video             = cadica.video,
        probability       = prob,
        prediction        = prediction,
        confidence        = confidence,
        gt_label          = cadica.get_ground_truth_label(),
        sampled_frames    = sampled_names,
        frame_importance  = importance.tolist(),
        grad_cams         = grad_cams,
        bboxes_per_frame  = bboxes_per_frame,
        weight            = compute_video_weight(prob),
    )


# -----------------------------------------------------------------------------
# 🚀  PATIENT-LEVEL INFERENCE  (main entry point)
# -----------------------------------------------------------------------------
def run_patient_inference(
    model_path:   str,
    dataset_root: str,
    patient:      str,
    threshold:    float = THRESHOLD,
    out_dir:      str   = "patient_output",
    save_gradcam: bool  = True,
) -> dict:

    print(f"\n{'='*60}")
    print(f"  CADICA Patient Inference  |  {patient}")
    print(f"{'='*60}")
    print(f"  Device    : {device}")
    print(f"  Dataset   : {dataset_root}")
    print(f"  Threshold : {threshold}")

    # ── discover all video folders ────────────────────────────────────────────
    patient_dir = Path(dataset_root) / "selectedVideos" / patient
    if not patient_dir.exists():
        avail = [d.name for d in (Path(dataset_root) / "selectedVideos").iterdir()
                 if d.is_dir()]
        raise FileNotFoundError(
            f"Patient '{patient}' not found.\nAvailable patients: {avail}"
        )

    all_videos = sorted(
        d.name for d in patient_dir.iterdir()
        if d.is_dir() and not d.name.endswith(".txt")
    )
    print(f"\n  Videos found : {all_videos}  ({len(all_videos)} total)\n")

    # ── load model once ───────────────────────────────────────────────────────
    print("  Loading model …")
    # raw_model = CNN_LSTM()
    # state     = torch.load(model_path, map_location=device, weights_only=True)
    # cleaned   = {k.replace("_orig_mod.", ""): v for k, v in state.items()}
    # raw_model.load_state_dict(cleaned)
    # raw_model.to(device).eval()
    # print("  Model loaded.\n")
    # ✅ YAHI LAGAO
    import torch

# Initialize the model
    raw_model = CNN_LSTM()

# Standard model loading method (no need for distributed checkpointing)
    state_dict = torch.load(model_path, map_location=device)

# If the model state dict has different keys, clean them up
    cleaned = {k.replace("_orig_mod.", ""): v for k, v in state_dict.items()}

# Load the cleaned state dict into the model
    raw_model.load_state_dict(cleaned)

# Move model to device (GPU or CPU)
    raw_model.to(device).eval()

    print("  Model loaded.\n")




    # ── infer every video ─────────────────────────────────────────────────────
    video_results: List[VideoResult] = []
    patient_out = os.path.join(out_dir, patient)

    for video in all_videos:
        print(f"  ── {video} ──────────────────────────────")
        try:
            cadica = CADICAVideo(dataset_root, patient, video)
            result = _infer_one_video(raw_model, cadica, threshold)

            # video-level GT vs prediction  (valid comparison per CADICA readme)
            gt_tag = ""
            if result.gt_label != "UNKNOWN":
                match  = result.prediction == result.gt_label
                gt_tag = f"  {'✓' if match else '✗'}"

            print(f"     GT label   : {result.gt_label}{gt_tag}")
            print(f"     Prediction : {result.prediction}")
            print(f"     Prob       : {result.probability:.4f}")
            print(f"     Weight     : {result.weight:.4f}  "
                  f"({'confident' if result.weight > 0.5 else 'uncertain / treated as noise'})")

            if save_gradcam:
                path = save_video_gradcam(cadica, result, patient_out)
                result.gradcam_image_path = path
                print(f"     Grad-CAM   : {path}")

            video_results.append(result)

        except FileNotFoundError as e:
            print(f"     SKIPPED — {e}")
        except Exception as e:
            print(f"     ERROR    — {e}")

    if not video_results:
        raise RuntimeError(f"No videos could be processed for patient {patient}.")

    # ── weighted average aggregation ──────────────────────────────────────────
    print(f"\n{'─'*60}")
    print("  AGGREGATION — weighted average\n")
    aggregation = weighted_average_verdict(video_results, threshold)

    print("  Video          │ Prob   │ Weight │ Video GT  │ Prediction")
    print("  ───────────────┼────────┼────────┼───────────┼──────────────")
    for r in video_results:
        tag = "← noise" if r.weight < 0.3 else ""
        match_sym = ""
        if r.gt_label != "UNKNOWN":
            match_sym = " ✓" if r.prediction == r.gt_label else " ✗"
        print(f"  {r.video:<14} │ {r.probability:.4f} │ {r.weight:.4f} │"
              f" {r.gt_label:<9} │ {r.prediction}{match_sym}  {tag}")

    print(f"\n  Weighted avg probability : {aggregation['weighted_avg_prob']:.4f}")

    # ── per-video accuracy (only valid evaluation level in CADICA) ────────────
    accuracy = compute_video_accuracy(video_results)

    print(f"\n{'─'*60}")
    print(f"  VIDEO-LEVEL ACCURACY  (valid — GT exists per video)")
    print(f"  Overall   : {accuracy['total_correct']}/{accuracy['total_evaluable']} "
          f"({accuracy['overall_accuracy']:.1%})")
    if accuracy['lesion_recall'] is not None:
        print(f"  Recall    : {accuracy['lesion_correct']}/{accuracy['lesion_total']} "
              f"lesion videos correctly detected "
              f"({accuracy['lesion_recall']:.1%})")
    if accuracy['nolesion_specificity'] is not None:
        print(f"  Specificity: {accuracy['nolesion_correct']}/{accuracy['nolesion_total']} "
              f"non-lesion videos correctly rejected "
              f"({accuracy['nolesion_specificity']:.1%})")

    # ── patient verdict (clinical output only — no GT exists) ─────────────────
    verdict    = aggregation["verdict"]
    confidence = aggregation["confidence"]

    print(f"\n{'─'*60}")
    print(f"  PATIENT-LEVEL VERDICT  (clinical output — no GT in CADICA)")
    print(f"  🩺  Verdict          : {verdict}")
    print(f"  🎯  Confidence       : {confidence:.1%}")
    print(f"  🔍  Most suspicious  : {aggregation['most_suspicious_video']} "
          f"(prob={aggregation['most_suspicious_prob']:.4f})")
    print(f"  ℹ️   No patient-level ground truth exists in CADICA.")
    print(f"      Evaluate model performance using video-level accuracy above.")
    print(f"{'─'*60}\n")

    # ── patient summary figure ────────────────────────────────────────────────
    summary_path = save_patient_summary(
        patient       = patient,
        video_results = video_results,
        aggregation   = aggregation,
        accuracy      = accuracy,
        out_dir       = out_dir,
    )

    # ── return full result dict ───────────────────────────────────────────────
    return {
        "patient":               patient,
        "verdict":               verdict,
        "confidence":            confidence,
        "weighted_avg_prob":     aggregation["weighted_avg_prob"],
        "most_suspicious_video": aggregation["most_suspicious_video"],
        "most_suspicious_prob":  aggregation["most_suspicious_prob"],
        "videos_processed":      len(video_results),
        "videos_skipped":        len(all_videos) - len(video_results),
        # video-level accuracy — the only valid evaluation in CADICA
        "video_accuracy":        accuracy["overall_accuracy"],
        "video_correct":         accuracy["total_correct"],
        "video_evaluable":       accuracy["total_evaluable"],
        "lesion_recall":         accuracy["lesion_recall"],
        "nolesion_specificity":  accuracy["nolesion_specificity"],
        "summary_image":         summary_path,
        "per_video": [
            {
                "video":       r.video,
                "probability": r.probability,
                "weight":      r.weight,
                "prediction":  r.prediction,
                "gt_label":    r.gt_label,   # video-level GT
                "correct":     r.prediction == r.gt_label if r.gt_label != "UNKNOWN" else None,
                "gradcam_img": r.gradcam_image_path,
            }
            for r in video_results
        ],
    }


# -----------------------------------------------------------------------------
# 🖥️  CLI
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="CADICA patient-level inference — weighted average aggregation"
    )
    parser.add_argument("--model",      required=True,
                        help="Path to trained model e.g. best_model.pth")
    parser.add_argument("--dataset",    required=True,
                        help="CADICA root folder")
    parser.add_argument("--patient",    required=True,
                        help="Patient ID e.g. p1")
    parser.add_argument("--threshold",  type=float, default=THRESHOLD,
                        help=f"Sigmoid threshold (default {THRESHOLD})")
    parser.add_argument("--out_dir",    default="patient_output",
                        help="Output folder for figures")
    parser.add_argument("--no_gradcam", action="store_true",
                        help="Skip per-video Grad-CAM figures (faster)")
    args = parser.parse_args()

    result = run_patient_inference(
        model_path   = args.model,
        dataset_root = args.dataset,
        patient      = args.patient,
        threshold    = args.threshold,
        out_dir      = args.out_dir,
        save_gradcam = not args.no_gradcam,
    )

    print("\n  Full result dict:")
    for k, v in result.items():
        if k != "per_video":
            print(f"    {k:30s}: {v}")
    print("\n  Per-video breakdown:")
    for v in result["per_video"]:
        correct_sym = ""
        if v["correct"] is not None:
            correct_sym = " ✓" if v["correct"] else " ✗"
        print(f"    {v['video']:<6} prob={v['probability']:.4f}  "
              f"weight={v['weight']:.4f}  pred={v['prediction']:<10}  "
              f"gt={v['gt_label']}{correct_sym}")