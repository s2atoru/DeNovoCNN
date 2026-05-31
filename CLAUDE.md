# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

DeNovoCNN calls de novo mutations (DNMs) from trio sequencing data (child + father + mother BAM/CRAM files). It encodes genomic pileup regions as RGB images and classifies them with CNNs — one model each for SNPs (Substitutions), Insertions, and Deletions.

## Repository docs

- `docs/ENVIRONMENT.md` — conda envs, TF/Keras compatibility, GPU/Docker execution, performance notes.
- `docs/TRAINING.md` — training spec reconstructed from the paper (training code is not in the repo).
- `logs.md` — raw working log (benchmarks, Docker commands, env experiments).
- `docs/references/` — the paper (gkac511), its Supplement, and the Japanese Linux setup guide.

## Environment setup

```bash
conda env create -f environment.yml
conda activate tensorflow_env
```

Python 3.8, TensorFlow 2.3. External tools required: `bcftools`, `bgzip`, `tabix`.
The base env runs CPU-only on this machine; for GPU and TF-version details see `docs/ENVIRONMENT.md`.

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
