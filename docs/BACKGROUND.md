# Background: why this fork diverges from upstream

Context reconstructed from conversation with the repo owner (2026-09-17). Explains
*why* the local changes exist, not just what they are — see `CLAUDE.md` for the
current architecture and `logs.md` for the raw work log.

## Goal

Run DeNovoCNN's pretrained SNP/Insertion/Deletion models on our own trio
sequencing data, to compare its de novo mutation calls against the performance
of our own in-house model.

## Two constraints that drove the fork

1. **License: Anaconda's default channel is not available to us.** Only
   Miniconda + community channels (conda-forge, bioconda) can be used.
2. **The original code targets an old TensorFlow (2.3.0).** This machine's
   GPUs (4x NVIDIA RTX 6000 Ada, driver 570.144) need CUDA >= 11.8, which
   TF 2.3.0 cannot use — so GPU execution requires a different TF version,
   which in turn requires either Docker or a separate host conda env.

## What was changed in response

### 1. Anaconda -> Miniconda/conda-forge

- `environment.yml`: dropped the `anaconda` and `defaults` channels, kept only
  `conda-forge` + `bioconda`.
- `docs/references/DeNovoCNNの環境構築（Linux）.md` (our own setup notes) records
  the matching conda config: `conda config --add channels conda-forge/bioconda`
  + `channel_priority strict`.
- That alone wasn't enough for every use case, so several alternate environment
  files were added, each pinned to a different TF version depending on purpose:

  | file | TensorFlow | Python | purpose |
  |---|---|---|---|
  | `environment.yml` | 2.3.0 | 3.8 | upstream baseline, CPU only here |
  | `environment_bioconda.yml` | 2.3.1 | 3.8 | bioconda-only rebuild of the baseline |
  | `environment_bioconda_py38.yml` | 2.4.4 | 3.8 | |
  | `environment_bioconda_py39.yml` | 2.15.0 (yml says 2.5.3) | 3.9 | GPU-capable |

  Details and verified TF/CUDA/driver combinations are in `docs/ENVIRONMENT.md`.

### 2. Old TensorFlow -> GPU execution path

- Base env TF 2.3.0 is CPU-only on this machine (CUDA 10.1/cuDNN7 required,
  absent; GPUs need CUDA >= 11.8). `dataset.py` explicitly disables the GPU
  for this env (`tf.config.set_visible_devices([], "GPU")`).
- Found that TF <= 2.15 keeps Keras 2 (`.h5` loading works); TF >= 2.16 bundles
  Keras 3 and breaks `.h5` loading. So TF 2.15.x was chosen as the GPU-capable,
  still-Keras-2-compatible target.
- **Docker is the documented primary path** for GPU runs: image
  `tensorflow/build:2.15-python3.11`, run with `--gpus`, driven by
  `run_docker.sh` inside the container.
  - A locally-built image `denovocnn:latest` also exists, built from an
    NVIDIA CUDA 11.0 + cuDNN 8.0.5.39 base (not the repo's checked-in
    `Dockerfile`, which is a plain `continuumio/miniconda3` build) with TF 2.4.4
    installed via `environment_bioconda_py38.yml`. This is an older/CPU-era
    experiment and does not match this machine's current GPU (needs CUDA
    >= 11.8) or the TF 2.15 GPU target.
- **Docker is not strictly required.** An alternative is running on the host
  directly in the `tensorflow_env_bioconda_py39` conda env (TF 2.15.0) with
  `export LD_LIBRARY_PATH=$CONDA_PREFIX/lib:$LD_LIBRARY_PATH`.

### 3. Model file rewrite (`.h5` <-> SavedModel)

`make-new-keras-model.ipynb` re-saves each pretrained model under TF 2.15:

```python
model = tf.keras.models.load_model("models/del")   # original upstream SavedModel
model.save("models/del_new")                        # re-saved SavedModel
model.save("models/del.h5")                          # legacy Keras-2 .h5 format
```

Done for `del`, `ins`, `snp`. The original upstream SavedModel dirs
(`models/del`, `models/ins`, `models/snp`) are left untouched; `_new` dirs and
`.h5` files are the versions re-saved so they stay loadable under TF 2.15
(Keras 2) instead of breaking under TF >= 2.16's Keras 3.

## Current gap vs. the goal

The above (conda/Docker/model-format work) makes GPU execution and model
loading possible, but **the prediction pipeline itself is mid-refactor and
does not currently produce predictions**:

- `apply_models_on_trio()` in `denovonet/dataset.py` only calls `save_images()`
  (dumps pileup PNGs to `images/`); the `apply_model()` / `save_dataset()`
  calls that would actually run inference and write probabilities are
  commented out.
- The original, complete predict flow is preserved in `denovonet/dataset_o.py`.
- `predict_del.py` + `process_images.py` are a prototype for the intended
  split design (load saved PNGs -> normalize -> batch `model.predict` on GPU),
  but are standalone scripts, not wired into `main.py`'s `--mode=predict`.

**To actually run predictions on our data and compare against our own model,
one of these still needs to happen:**
1. Use `dataset_o.py`'s original flow (verify it works with the re-saved
   `models/*.h5` / `*_new` models), or
2. Restore/finish the `apply_model()` / `save_dataset()` calls in the current
   `dataset.py`, with the GPU-disable line fixed for the GPU-capable envs.
