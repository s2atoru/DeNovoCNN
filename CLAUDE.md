# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

DeNovoCNN calls de novo mutations (DNMs) from trio sequencing data (child + father + mother BAM/CRAM files). It encodes genomic pileup regions as RGB images and classifies them with CNNs — one model each for SNPs (Substitutions), Insertions, and Deletions.

## Environment setup

```bash
conda env create -f environment.yml
conda activate tensorflow_env
```

Python 3.8, TensorFlow 2.3. External tools required: `bcftools`, `bgzip`, `tabix`.

Several conda envs coexist on this machine (different TF versions for different purposes):

| conda env | TensorFlow | Python | Notes |
|---|---|---|---|
| `tensorflow_env_bioconda` | 2.3.1 | 3.8 | Env named in the Linux setup doc; built from `environment_bioconda.yml` |
| `tensorflow_env_bioconda_py39` | 2.15.0 | 3.9 | For GPU runs (yml says 2.5.3 but the actual install is 2.15.0) |
| `tensorflow_env_bioconda_py38` | 2.4.4 | 3.8 | |
| `py311_tf25` | 2.15.1 | 3.11 | |

The setup doc (Japanese) is `docs/references/DeNovoCNNの環境構築（Linux）.md`; it uses the GIAB AshkenazimTrio (HG002/3/4, GRCh37) data and `tensorflow_env_bioconda`.

## TensorFlow / Keras compatibility

- The models load via Keras 2 (`.h5` and pre-TF-2.5 SavedModel). **Keras 3 (bundled from TF 2.16+) makes `.h5` legacy** and breaks loading. To keep Keras 2, **pin TensorFlow ≤ 2.15** (`logs.md`).
- Verified working: TF **2.15.0, 2.15.1, 2.16.2, 2.17.1**. Not working: **2.18.1, 2.19.0**.
- CUDA pairing: TF 2.15.1 → CUDA 12.2; TF 2.16.0-rc0 → CUDA 12.3. (Setup-doc target was CUDA 11.8.)
- Loading the SavedModel dirs emits `WARNING: SavedModel saved prior to TF 2.5 detected` — expected, safe.
- `.h5` files are regenerated from the SavedModels via `make-new-keras-model.ipynb`.

## GPU execution and Docker

- **TF 2.3.1 (base env) is CPU-only here.** It requires CUDA 10.1/cuDNN 7 (absent), and this machine's GPUs (4× NVIDIA RTX 6000 Ada, compute capability 8.9) need CUDA ≥ 11.8 — so TF 2.3.1 cannot use them. `dataset.py` explicitly disables GPU for this reason.
- **GPU runs go through Docker** (preferred direction going forward, per `logs.md`). Main image: `tensorflow/build:2.15-python3.11`. Other images tried: `tensorflow/tensorflow:latest-gpu`, locally-built `denovocnn` (from the repo `Dockerfile`, `FROM continuumio/miniconda3`).
  ```bash
  docker run --rm --gpus '"device=0"' -it \
    -v $(pwd):/app -v $(pwd)/output:/output -v <DATA_DIR>:/input \
    tensorflow/build:2.15-python3.11 /bin/bash
  ```
  Inside the container, `run_docker.sh` calls `apply_denovocnn.sh` with `/input` and `/output` paths.
- Alternatively, run on the host with the py39 env by exporting its libs:
  `export LD_LIBRARY_PATH=$CONDA_PREFIX/lib:$LD_LIBRARY_PATH` (for `tensorflow_env_bioconda_py39`).
- Driver caveat (logs.md): `moonshot-gpu1` supports up to CUDA 12.2, so TF 2.15.1 is the practical choice there.

## Performance notes (logs.md, ~1000 variants/batch)

- Image generation: ~2 min (n_jobs=1), ~4 sec (n_jobs=128).
- Inference on prepared images: CPU ~0.46 min vs **GPU (TF 2.15) ~0.05 min** (~10× faster).
- Full run ~30 min at n_jobs=60; split into 1000-image chunks ~5 min each.
- Bottleneck: predicting row-by-row. Planned faster path: (1) prepare images in parallel on CPU, (2) split by variant type, (3) batch each variant type to the GPU.

## Running predictions

Via the shell wrapper (handles VCF preprocessing with bcftools):
```bash
./apply_denovocnn.sh \
  -w=<WORKING_DIR> \
  -cv=<CHILD_VCF> -fv=<FATHER_VCF> -mv=<MOTHER_VCF> \
  -cb=<CHILD_BAM> -fb=<FATHER_BAM> -mb=<MOTHER_BAM> \
  -sm=models/snp -im=models/ins -dm=models/del \
  -g=<REFERENCE_GENOME> \
  -o=predictions.csv
```

Or directly via Python with a pre-built variants list (TSV: Chromosome | Start | Reference | Variant | extra):
```bash
KERAS_BACKEND=tensorflow python main.py \
  --mode=predict \
  --variants_list=<VARIANTS_TSV> \
  --child_bam=<BAM> --father_bam=<BAM> --mother_bam=<BAM> \
  --snp_model=models/snp --ins_model=models/ins --del_model=models/del \
  --ref_genome=<FASTA> \
  --output_path=output.txt
```

Key flags:
- `--output_denovocnn_format=true` — output normalized variant coordinates (used for model testing)
- `--not_convert_to_inner_format` — skip shifting insertion positions to internal representation (use when input is already in internal format)

DNM threshold: probability >= 0.5.

## Code architecture

**Entry point**: `main.py` parses args and calls `apply_models_on_trio()` in `denovonet/dataset.py`.

**Image encoding pipeline** (`denovonet/variants.py`):
- `SingleVariant` — reads a BAM/CRAM at a genomic locus, iterates CIGAR operations, and produces two arrays: nucleotide encodings and base qualities. Window is `OVERHANG=20` bases to each side (41 total positions).
- `TrioVariant` — combines child/father/mother `SingleVariant` objects into a single RGB image (160 x 164 x 3): child=R, father=G, mother=B. Each nucleotide position expands to 4 columns (A/C/T/G one-hot), pixel value = base quality × mapping quality / 10.
- `TrioVariant.predict()` — normalizes image to [0,1] and runs inference.

**Dataset pipeline** (`denovonet/dataset.py`):
- `Dataset` — wraps a pandas DataFrame of variants. `standartize_variants()` normalizes alleles (trims shared prefix/suffix, computes `*_std` columns), classifies variant type (Substitution/Deletion/Insertion), and optionally shifts insertion positions by -1 for internal representation.
- `apply_models_on_trio()` — top-level function: reads variants TSV, builds `Dataset`, calls `apply_model()` in batches (default 1000) via `multiprocessing.Pool`, writes output TSV.
- Model loading: `load_models()` loads three `.h5` / SavedModel files into a dict keyed by variant type string.

**Constants** (`denovonet/settings.py`): `OVERHANG=20`, `IMAGE_HEIGHT=160`, `IMAGE_WIDTH=164` (4 channels × 41 positions).

**Encoders** (`denovonet/encoders.py`): `baseEncoder` maps nucleotides and CIGAR states (match, insertion, deletion) to integer codes used in pileup arrays.

**Models**: stored in `models/` as `.h5` files (`snp.h5`, `ins.h5`, `del.h5`) and as SavedModel directories (`snp_new/`, `ins_new/`, `del_new/`).

## Current state of dataset.py

`apply_models_on_trio()` currently has the `apply_model` and `save_dataset` calls commented out and instead calls `save_images()` to dump PNG files to an `images/` directory. GPU is also explicitly disabled (`tf.config.set_visible_devices([], "GPU")`). This is work-in-progress state — the original prediction flow is in `dataset_o.py`.

Planned split (logs.md): separate image generation from prediction — `main.py` → `make_image`, `dataset.py` → `dataset_image.py` — so images are built once (CPU) and prediction runs as a batched GPU step. Prediction-from-saved-images is prototyped in `predict_del.py` + `process_images.py` (load PNGs → `/255` → `model.predict` → save `.npy` + distribution plot); these are local additions, not in the upstream repo. Note `save_images()` writes all variant types flat into `images/` (the `Target` column is a dummy empty string), so re-prediction must re-route each image to the correct snp/ins/del model.
