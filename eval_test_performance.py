"""
Reproduce Supplementary Table 5 (Khazeeva et al., NAR 2022, gkac511) using this repo's
models/{snp,ins,del}.h5 against data/publish_images/<type>/test/{DNM,IV}.

Local test-set image counts match the paper's reported test split exactly
(1,564 DNM / 8,410 IV total; per-type: subs 1309/7322, ins 85/494, del 170/594),
so this checks whether the converted .h5 models reproduce the published test
performance.

Run from the repo root, e.g.:
    python eval_test_performance.py
    EVAL_OUT=eval_test_performance_result.json python eval_test_performance.py
"""
import json
import os

import numpy as np
import tensorflow as tf

from process_images import load_images_from_directory, preprocess_images


def roc_auc(scores, labels):
    """Mann-Whitney U based ROC-AUC (ties get averaged ranks); no sklearn dependency."""
    scores = np.asarray(scores, dtype=float)
    labels = np.asarray(labels, dtype=int)
    order = np.argsort(scores)
    sorted_scores = scores[order]
    ranks_sorted = np.arange(1, len(scores) + 1, dtype=float)
    i = 0
    n = len(sorted_scores)
    while i < n:
        j = i
        while j + 1 < n and sorted_scores[j + 1] == sorted_scores[i]:
            j += 1
        if j > i:
            ranks_sorted[i : j + 1] = ranks_sorted[i : j + 1].mean()
        i = j + 1
    ranks = np.empty(n, dtype=float)
    ranks[order] = ranks_sorted
    n_pos = labels.sum()
    n_neg = n - n_pos
    sum_ranks_pos = ranks[labels == 1].sum()
    return (sum_ranks_pos - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)


def metrics_from_scores(scores, labels, threshold=0.5):
    scores = np.asarray(scores)
    labels = np.asarray(labels)
    preds = (scores >= threshold).astype(int)
    tp = int(np.sum((preds == 1) & (labels == 1)))
    fp = int(np.sum((preds == 1) & (labels == 0)))
    tn = int(np.sum((preds == 0) & (labels == 0)))
    fn = int(np.sum((preds == 0) & (labels == 1)))
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total
    recall = tp / (tp + fn) if (tp + fn) else float("nan")
    specificity = tn / (tn + fp) if (tn + fp) else float("nan")
    precision = tp / (tp + fp) if (tp + fp) else float("nan")
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall)
        else float("nan")
    )
    return {
        "roc_auc": roc_auc(scores, labels),
        "accuracy": accuracy,
        "recall": recall,
        "specificity": specificity,
        "f1": f1,
        "precision": precision,
        "TP": tp,
        "FP": fp,
        "TN": tn,
        "FN": fn,
    }


TARGETS = [
    ("Substitutions", "models/snp.h5", "data/publish_images/substitution/test"),
    ("Insertions", "models/ins.h5", "data/publish_images/insertion/test"),
    ("Deletions", "models/del.h5", "data/publish_images/deletion/test"),
]

if __name__ == "__main__":
    per_type = {}
    all_scores = []
    all_labels = []

    for name, model_path, test_dir in TARGETS:
        print(f"\n=== {name} ({model_path}) ===", flush=True)
        model = tf.keras.models.load_model(model_path)

        dnm_images = preprocess_images(
            load_images_from_directory(os.path.join(test_dir, "DNM"))
        )
        iv_images = preprocess_images(
            load_images_from_directory(os.path.join(test_dir, "IV"))
        )
        print(f"{name}: DNM={len(dnm_images)}, IV={len(iv_images)}", flush=True)

        # raw sigmoid output is P(IV); DNM probability is 1 - raw output
        # (see denovonet/dataset_o.py: prediction_dnm = 1.0 - prediction[0, 0])
        dnm_scores = 1.0 - model.predict(dnm_images, verbose=0).reshape(-1)
        iv_scores = 1.0 - model.predict(iv_images, verbose=0).reshape(-1)

        scores = np.concatenate([dnm_scores, iv_scores])
        labels = np.concatenate(
            [np.ones(len(dnm_scores), dtype=int), np.zeros(len(iv_scores), dtype=int)]
        )

        m = metrics_from_scores(scores, labels)
        per_type[name] = m
        print(json.dumps(m, indent=2), flush=True)

        all_scores.append(scores)
        all_labels.append(labels)

    total_metrics = metrics_from_scores(
        np.concatenate(all_scores), np.concatenate(all_labels)
    )
    result = {"Total": total_metrics, **per_type}

    out_path = os.environ.get("EVAL_OUT", "eval_test_performance_result.json")
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)

    print("\n=== Total ===", flush=True)
    print(json.dumps(total_metrics, indent=2), flush=True)
    print(f"\nWrote results to {out_path}", flush=True)
