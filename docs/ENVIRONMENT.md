# Environment, GPU and Docker

Operational notes for running DeNovoCNN on this machine. Source: `logs.md`, the Linux
setup guide (`docs/references/DeNovoCNNの環境構築（Linux）.md`), and local verification.

## Conda environments

Several envs coexist (different TF versions for different purposes):

| conda env | TensorFlow | Python | Notes |
|---|---|---|---|
| `tensorflow_env` | 2.3.0 | 3.8 | Upstream `environment.yml` |
| `tensorflow_env_bioconda` | 2.3.1 | 3.8 | Env named in the Linux setup doc; built from `environment_bioconda.yml` |
| `tensorflow_env_bioconda_py39` | 2.15.0 | 3.9 | For GPU runs (yml says 2.5.3 but the actual install is 2.15.0) |
| `tensorflow_env_bioconda_py38` | 2.4.4 | 3.8 | |
| `py311_tf25` | 2.15.1 | 3.11 | |

External tools required: `bcftools`, `bgzip`, `tabix`. Reference data used by the setup
doc: GIAB AshkenazimTrio (HG002/3/4, GRCh37).

## TensorFlow / Keras compatibility

- Models load via Keras 2 (`.h5` and pre-TF-2.5 SavedModel). **Keras 3 (bundled from
  TF 2.16+) makes `.h5` legacy** and breaks loading. To keep Keras 2, **pin TensorFlow ≤ 2.15**.
- Verified working: TF **2.15.0, 2.15.1, 2.16.2, 2.17.1**. Not working: **2.18.1, 2.19.0**.
- CUDA pairing: TF 2.15.1 → CUDA 12.2; TF 2.16.0-rc0 → CUDA 12.3. (Setup-doc target was CUDA 11.8.)
- Loading the SavedModel dirs emits `WARNING: SavedModel saved prior to TF 2.5 detected` — expected, safe.
- `.h5` files are regenerated from the SavedModels via `make-new-keras-model.ipynb`.

## GPU execution and Docker

- **TF 2.3.1 (base env) is CPU-only here.** It requires CUDA 10.1/cuDNN 7 (absent), and
  this machine's GPUs (4× NVIDIA RTX 6000 Ada, compute capability 8.9) need CUDA ≥ 11.8 —
  so TF 2.3.1 cannot use them. `dataset.py` explicitly disables GPU for this reason.
- **GPU runs go through Docker** (preferred direction going forward, per `logs.md`).
  Main image: `tensorflow/build:2.15-python3.11`. Other images tried:
  `tensorflow/tensorflow:latest-gpu`, locally-built `denovocnn` (from the repo
  `Dockerfile`, `FROM continuumio/miniconda3`).
  ```bash
  docker run --rm --gpus '"device=0"' -it \
    -v $(pwd):/app -v $(pwd)/output:/output -v <DATA_DIR>:/input \
    tensorflow/build:2.15-python3.11 /bin/bash
  ```
  Inside the container, `run_docker.sh` calls `apply_denovocnn.sh` with `/input` and `/output` paths.
- Alternatively, run on the host with the py39 env by exporting its libs:
  `export LD_LIBRARY_PATH=$CONDA_PREFIX/lib:$LD_LIBRARY_PATH` (for `tensorflow_env_bioconda_py39`).
- Driver caveat: `moonshot-gpu1` supports up to CUDA 12.2, so TF 2.15.1 is the practical choice there.

## Performance notes (~1000 variants/batch)

- Image generation: ~2 min (n_jobs=1), ~4 sec (n_jobs=128).
- Inference on prepared images: CPU ~0.46 min vs **GPU (TF 2.15) ~0.05 min** (~10× faster).
- Full run ~30 min at n_jobs=60; split into 1000-image chunks ~5 min each.
- Bottleneck: predicting row-by-row. Planned faster path: (1) prepare images in parallel
  on CPU, (2) split by variant type, (3) batch each variant type to the GPU.
