import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from pathlib import Path
from PIL import Image
from torchvision import models
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# ─────────────────────────────────────────────────────────────────────────────
# COLORMAP  (identical to training)
# ─────────────────────────────────────────────────────────────────────────────
SEG_COLORS = np.array([
    [0,   0,   0  ],   # 0 background
    [0,   128, 0  ],   # 1 ischemia
    [255, 140, 0  ],   # 2 hemorrhage
], dtype=np.uint8)

CLASS_NAMES = ["No Stroke", "Ischemia", "Hemorrhage"]


# ─────────────────────────────────────────────────────────────────────────────
# CLASSIFIER  (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class ClassifierCNN(nn.Module):
    def __init__(self, num_classes=3):
        super().__init__()
        backbone = models.resnet50(weights=None)
        in_feat  = backbone.fc.in_features
        backbone.fc = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(in_feat, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
        )
        self.model = backbone

    def forward(self, x):
        return self.model(x)


# ─────────────────────────────────────────────────────────────────────────────
# UNET  (100% identical to training — do NOT change anything)
# ─────────────────────────────────────────────────────────────────────────────

class DoubleConv(nn.Module):
    def __init__(self, in_ch, out_ch, dropout=0.0):
        super().__init__()
        layers = [
            nn.Conv2d(in_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        ]
        if dropout > 0:
            layers.append(nn.Dropout2d(dropout))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


class UNet(nn.Module):
    def __init__(self, in_ch=3, num_classes=3):
        super().__init__()
        self.d1 = DoubleConv(in_ch, 64)
        self.p1 = nn.MaxPool2d(2)
        self.d2 = DoubleConv(64,  128)
        self.p2 = nn.MaxPool2d(2)
        self.d3 = DoubleConv(128, 256)
        self.p3 = nn.MaxPool2d(2)
        self.d4 = DoubleConv(256, 512)
        self.p4 = nn.MaxPool2d(2)
        self.b  = DoubleConv(512, 1024, dropout=0.3)
        self.u4 = nn.ConvTranspose2d(1024, 512, 2, 2)
        self.c4 = DoubleConv(1024, 512, dropout=0.2)
        self.u3 = nn.ConvTranspose2d(512,  256, 2, 2)
        self.c3 = DoubleConv(512,  256)
        self.u2 = nn.ConvTranspose2d(256,  128, 2, 2)
        self.c2 = DoubleConv(256,  128)
        self.u1 = nn.ConvTranspose2d(128,   64, 2, 2)
        self.c1 = DoubleConv(128,   64)
        self.head = nn.Conv2d(64, num_classes, 1)

    def forward(self, x):
        e1 = self.d1(x)
        e2 = self.d2(self.p1(e1))
        e3 = self.d3(self.p2(e2))
        e4 = self.d4(self.p3(e3))
        b  = self.b(self.p4(e4))
        d  = self.c4(torch.cat([self.u4(b),  e4], dim=1))
        d  = self.c3(torch.cat([self.u3(d),  e3], dim=1))
        d  = self.c2(torch.cat([self.u2(d),  e2], dim=1))
        d  = self.c1(torch.cat([self.u1(d),  e1], dim=1))
        return self.head(d)


# ─────────────────────────────────────────────────────────────────────────────
# PREPROCESSING  (identical to training __getitem__)
# ─────────────────────────────────────────────────────────────────────────────

def preprocess(img_path, img_size=256):
    """
    Must match training exactly:
      - convert('L')  grayscale
      - resize with default (NEAREST in PIL when no filter given)
      - divide by 255
      - stack to 3-channel
    Always pass the raw CT from /PNG — never the overlay image.
    """
    img_np = np.array(
        Image.open(img_path).convert('L')
             .resize((img_size, img_size)),   # no filter = matches training
        dtype=np.float32) / 255.0

    img_t = torch.from_numpy(
        np.stack([img_np]*3, axis=0)).unsqueeze(0)   # (1,3,H,W)

    return img_np, img_t


# ─────────────────────────────────────────────────────────────────────────────
# VISUALISE & SAVE
# ─────────────────────────────────────────────────────────────────────────────

def visualise_and_save(img_np, seg_mask, pred_class, confidence,
                       img_path, out_dir):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = Path(img_path).stem

    # RGBA overlay — only lesion pixels coloured, background fully transparent
    H, W = seg_mask.shape
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    for cls_id, color in enumerate(SEG_COLORS):
        if cls_id == 0:
            continue
        m = seg_mask == cls_id
        rgba[m, :3] = color
        rgba[m,  3] = 160           # ~63% opacity

    # ── 3-panel figure ───────────────────────────────────────────────────────
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.5))
    fig.suptitle(
        f"Prediction: {CLASS_NAMES[pred_class]}  ({confidence*100:.1f}%)",
        fontsize=13, fontweight='bold')

    # Panel 1 — raw CT
    axes[0].imshow(img_np, cmap='gray', vmin=0, vmax=1)
    axes[0].set_title('Input CT', fontsize=10)
    axes[0].axis('off')

    # Panel 2 — pure segmentation mask on black background
    axes[1].imshow(SEG_COLORS[seg_mask])
    axes[1].set_title('Segmentation mask', fontsize=10)
    axes[1].axis('off')

    # Panel 3 — CT with semi-transparent lesion overlay
    axes[2].imshow(img_np, cmap='gray', vmin=0, vmax=1)
    axes[2].imshow(rgba)
    axes[2].set_title('CT + lesion overlay', fontsize=10)
    axes[2].axis('off')

    legend_handles = [
        mpatches.Patch(color=np.array([0,   128,   0])/255, label='Ischemia'),
        mpatches.Patch(color=np.array([255, 140,   0])/255, label='Hemorrhage'),
    ]
    fig.legend(handles=legend_handles, loc='lower center',
               ncol=2, fontsize=10, frameon=False, bbox_to_anchor=(0.5, 0))
    plt.tight_layout(rect=[0, 0.06, 1, 1])

    fig_path = out_dir / f"{stem}_result.png"
    plt.savefig(fig_path, dpi=150, bbox_inches='tight')
    # plt.show()
    plt.close(fig)
    print(f"✅  Saved → {fig_path}")

    # Flat blend PNG — 40% CT + 60% lesion colour, only over lesion pixels
    ct_rgb = np.stack([img_np * 255]*3, axis=-1).astype(np.uint8)
    for cls_id, color in enumerate(SEG_COLORS):
        if cls_id == 0:
            continue
        m = seg_mask == cls_id
        ct_rgb[m] = (0.4 * ct_rgb[m] + 0.6 * color).astype(np.uint8)

    overlay_path = out_dir / f"{stem}_overlay.png"
    Image.fromarray(ct_rgb).save(overlay_path)
    print(f"✅  Saved → {overlay_path}")


# ─────────────────────────────────────────────────────────────────────────────
# PREDICT
# ─────────────────────────────────────────────────────────────────────────────

def predict(img_path, classifier_path, segmenter_path, out_dir,
            img_size=256, device='cpu'):

    device = torch.device(device)
    img_np, img_t = preprocess(img_path, img_size)
    img_t = img_t.to(device)

    # ── 1. CLASSIFICATION ────────────────────────────────────────────────────
    clf = ClassifierCNN(num_classes=3).to(device)
    # clf.load_state_dict(torch.load(classifier_path, map_location=device))
    clf.load_state_dict(torch.load(classifier_path, map_location=device, weights_only=False))
    clf.eval()

    with torch.no_grad():
        probs      = torch.softmax(clf(img_t), dim=1)[0].cpu().numpy()
    pred_class = int(probs.argmax())
    confidence = float(probs.max())

    print(f"\n── CLASSIFICATION ──────────────────────────────────")
    print(f"   Predicted : {CLASS_NAMES[pred_class]}  ({confidence*100:.1f}%)")
    for name, p in zip(CLASS_NAMES, probs):
        print(f"   {name:12s}: {p*100:.1f}%")

    # ── 2. SEGMENTATION (only when stroke detected) ──────────────────────────
    seg_mask = np.zeros((img_size, img_size), dtype=np.uint8)

    if pred_class in (1, 2):

        # Load weights saved as 'best_segmentation_model_v4.pth' by training
        seg = UNet(in_ch=3, num_classes=3).to(device)
        # seg.load_state_dict(torch.load(segmenter_path, map_location=device))
        seg.load_state_dict(torch.load(segmenter_path, map_location=device, weights_only=False))
        seg.eval()

        with torch.no_grad():
            logits   = seg(img_t)                          # (1, 3, H, W)
            seg_mask = logits.argmax(1)[0].cpu().numpy()   # (H, W) → 0/1/2

        lesion_px  = int((seg_mask > 0).sum())
        lesion_pct = 100 * lesion_px / (img_size * img_size)
        classes_found = set(int(c) for c in np.unique(seg_mask))

        print(f"\n── SEGMENTATION ────────────────────────────────────")
        print(f"   Lesion pixels : {lesion_px}  ({lesion_pct:.2f}% of image)")
        print(f"   Classes found : {classes_found}")

    else:
        print("\n   No stroke detected — skipping segmentation.")

    # ── 3. VISUALISE & SAVE ──────────────────────────────────────────────────
    visualise_and_save(img_np, seg_mask, pred_class, confidence,
                       img_path, out_dir)

    # return seg_mask
    stem = Path(img_path).stem

    return {
        "prediction": CLASS_NAMES[pred_class],
        "prediction_class": pred_class,
        "confidence": confidence,
        "probabilities": {
            CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))
        },
        "segmentation_generated": pred_class in (1, 2),
        "result_image": str(Path(out_dir) / f"{stem}_result.png"),
        "overlay_image": str(Path(out_dir) / f"{stem}_overlay.png"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────────────────────

def run_inference(input_path):
    CLF = "C:/Users/DLL/OneDrive/Desktop/FYP/MODELS/COMBINED_MODEL/best_classifier.pt"
    SEG = "C:/Users/DLL/OneDrive/Desktop/FYP/MODELS/COMBINED_MODEL/best_segmentation_model_v4.pth"
    OUT = "C:/Users/DLL/OneDrive/Desktop/FYP/MODELS/COMBINED_MODEL/inference_result"

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"Using device: {device}")

    return predict(input_path, CLF, SEG, OUT, device=device)


# ─────────────────────────────────────────────────────────────────────────────
# CALL — always pass raw CT from /PNG folder, never the overlay
# ─────────────────────────────────────────────────────────────────────────────
# run_inference(
#     "C:/Users/DLL/OneDrive/Desktop/FYP/datasets/İNME VERİ SETİ/İskemi/PNG/10003.png"
# )

