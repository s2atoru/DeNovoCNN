# Training specification

Training code is **not present** in this repo (`main.py --mode=train` is a `pass`; there
is no `models.py`, no `.compile()`/`.fit()`). The spec below is taken from the paper
(Khazeeva et al., NAR 2022, gkac511) and its Supplement (`docs/references/`), so a
`models.py` + `train` flow can be re-implemented from it. Image encoding and
`denovonet/augmentation.py` already match this spec.

## Architecture (Suppl. Fig 2)

9 × 2D conv (96 filters, 3×3, ReLU, same padding); batch-norm + Squeeze-and-Excitation
block after every 3rd conv; global max pooling concatenated with global average pooling
before a sigmoid output (DNM probability). Three separate models (substitution / deletion
/ insertion).

## Hyperparameters (Suppl. Table 2)

| Param | Substitution | Deletion | Insertion |
|---|---|---|---|
| conv features | 96 | 96 | 96 |
| kernel | 3×3 | 3×3 | 3×3 |
| L1 (last layer) | 3.1e-7 | 3.1e-7 | 3.1e-7 |
| batch size | 64 | 64 | 32 |
| learning rate | 0.00046 | 0.0025 | 0.0026 |
| LR decay | 0.5 every 10 epochs | same | same |
| optimizer | Adam | AdamW | AdamW |
| weight decay | – | 1.1e-6 | 7.3e-8 |
| max epochs / early-stop patience | 100 / 40 | 100 / 40 | 100 / 40 |

Loss: binary cross-entropy. Hyperparameters were tuned with Hyperband.

## Training procedure

Train the substitution model first from random init, then initialize the insertion and
deletion models from the trained substitution weights (transfer learning). Early-stop on
validation loss (patience 40), keep the best epoch. Reference training time
(GTX TITAN X 12GB): subs ~17.6h, del ~1.7h, ins ~1.5h.

## Data augmentation (implemented in `denovonet/augmentation.py`)

Random brightness [0.3, 1], read shuffling, reduced-coverage simulation (drop random
reads), and on-the-fly multi-nucleotide SNP generation.

## Dataset construction (Suppl. Fig 1, Table 1)

6,067 trios → IGV manual labelling into DNM/IV/UN (UN discarded) → 5,616 trios; 70/15/15
split. Train: 8,517 DNM / 40,590 IV; validation: 1,357 DNM / 7,110 IV; test: 1,564 DNM /
8,410 IV. Supplemented with difficult-region examples (interim model) and 2 artificial
unrelated-parent trios (+1,005 DNMs, train only). The labelled training dataset is
published separately: `Genome-Bioinformatics-RadboudUMC/DeNovoCNN_training_dataset`.

## Test performance (Suppl. Table 5)

Total ROC-AUC 0.9988, recall 96.74%, precision 96.55% (substitutions best, deletions
weakest: precision 87.64%).
