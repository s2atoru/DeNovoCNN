## 2025/05/02

### docker on IBM cloud server
- docker run --cpus="6" -it --rm -v /ac/home/toki/IGVimage_classification:/ac/home/toki/IGVimage_classification nvcr.io/nvidia/tensorflow:22.04-tf1-py3

### genome hg19
- wget http://igenomes.illumina.com.s3-website-us-east-1.amazonaws.com/Homo_sapiens/UCSC/hg19/Homo_sapiens_UCSC_hg19.tar.gz

### samtoolsをインストール

- baiファイルをbamファイルから作成
  - make-bam-index-files.ipynb

- apply_denovocnn.sh
  - VCFの処理をコメントアウト（original: apply_denovocnn.sh_o）

- keras 3.0以下を使う必要がある。
  - tensoflow 2.15以下
  - その場合cuda 11.8

- /home/sugimoto/miniconda3/envs/tensorflow_env_bioconda_py39/lib

- export LD_LIBRARY_PATH=/home/sugimoto/miniconda3/envs/tensorflow_env_bioconda_py39/lib:$LD_LIBRARY_PATH

- main.py n_jobs = -1
- dataset.py
  ```python
  # GPU を無効化して CPU のみを使用
  tf.config.set_visible_devices([], "GPU")
  print("Num GPUs Available: ", len(tf.config.list_physical_devices("GPU")))
  # n_jobs = 60
  n_jobs = 60
  ```
- WARNING:tensorflow:SavedModel saved prior to TF 2.5 detected when loading Keras model. Please ensure that you are saving the model with model.save() or tf.keras.models.save_model(), *NOT* tf.saved_model.save(). To confirm, there should be a file named "keras_metadata.pb" in the SavedModel directory.

- 全部の実行時間は30分程度（n_jobs 60）
- 100（1000枚）に分けた場合は約5分 (n_jobs 60)
- 画像の作成、1000枚約2分 n_jobs 1
- 画像の作成、1000枚約4秒 n_jobs 128

- 画像をmodelで処理した場合は1000枚約0.46分

- tensorflow 2.15 gpu  約1000枚　推論 0.05分

- datasetの各行ごとに処理しているから遅い
  1. 画像を準備（cpu並列）
  2. variant_typeごとに分ける
  3. variant_typeごとにgpuに投げる

## Docker
- docker run --rm --gpus '"device=0"' -it -v $(pwd):/app -v $(pwd)/output:/output -v /home1/sugimoto/denovo/:/input denovocnn /bin/bash

docker run --rm --gpus '"device=0"' -it -v $(pwd):/app -v $(pwd)/output:/output -v /home1/sugimoto/denovo/:/input  tensorflow/tensorflow:latest-gpu /bin/bash

- gpuは早くなるかどうかは不明
- まとめてモデルに代入することにより速度は速くなる
- process_images.py
- prediction.ipynb

- https://www.tensorflow.org/install/source#gpu
- https://hub.docker.com/r/tensorflow/build

- dockerで動く tensorflow 2.15.0, 2.15.1, 2.16.2, 2.17.1
  - 2.18.1, 2.19.0は動かない

- ldconfig -p | grep libcudnn, libcudart, libcublas

- 今後は基本はDockerを作る方向で

- tensorflowモデルをh5に変換
  - make-new-keras-model.ipynb
  - del.h5, ins.h5, snp.h5

- docker run --rm --gpus '"device=0"' -it -v $(pwd):/app -v $(pwd)/output:/output -v /home1/sugimoto/denovo/:/input  tensorflow/build:2.15-python3.11 /bin/bash

- tensorflow 2.15.1 cuda 12.2, 2.16.0-rc0 cuda 12.3
- moonshot-gpu1はcuda 12.2まで（dirverのバージョンの問題）

- main.py →　make_image, dataset.py → dataset_image.py

## 2026/09/17

### dataset_o.py と現在のモデルファイルの互換性確認

`models/{snp,ins,del}`（元SavedModel）、`.h5`（書き換え後）、`_new`（書き換え後SavedModel）を
`tf.keras.models.load_model()` でロードできるか、各conda環境で確認：

| モデル形式 | TF2.3.1 | TF2.4.4 | TF2.15.0/2.15.1 |
|---|---|---|---|
| 元SavedModel(`models/snp`等) | OK | OK | OK（`prior to TF2.5`警告のみ） |
| `.h5` | `keepdims`エラーでNG | 同エラーでNG | OK |
| `_new`（SavedModel） | opがグラフ非互換でNG | `keras_metadata.pb`のJSON解析失敗でNG | OK |

固定シードで元SavedModel/`.h5`/`_new`の予測値を比較 → snp/ins/del全て完全一致（重みは正しく引き継がれている）。

### dataset_o.py のGPU無効化を解除

`Dataset.apply_model()` にあった
```python
tf.config.set_visible_devices([], "GPU")
```
を削除（`dataset.py`側の同等行は今回は未修正、別途要判断）。

### Dockerfile.gpu を作成・ビルド検証

`tensorflow/build:2.15-python3.11` は実はTF未同梱（ビルド用イメージ）。TF2.15.1 + pysam +
opencv-python-headless + pandas + Pillow + bcftools/tabix を焼き込んだ `Dockerfile.gpu` を作成。

```bash
docker build -f Dockerfile.gpu -t denovocnn-gpu .
docker run --rm --gpus all denovocnn-gpu:latest ...
```

GPU4基認識、`dataset_o.py`の`load_models()`→`predict()`まで完走を確認。

### CPU vs GPU の予測値の差

固定シード入力でCPU実行とGPU実行を比較 → 完全一致はしない（Substitution/Deletionは1e-6〜1e-5、
Insertionは1e-4〜2e-4オーダーの差）。3桁丸め後のDNM判定（閾値0.5）には通常影響しないが、
0.5付近の境界事例は理論上ひっくり返り得る。詳細は`docs/ENVIRONMENT.md`「CPU vs GPU numerical
consistency」に記載。

### ディスク容量が逼迫（/dev/sda4 100%使用・空き0）→ 整理

- `denovocnn:latest`（12.8GB）削除 — リポジトリのDockerfileから再現不可能な孤立イメージ
  （実体はnvidia/cuda:11.0.3+TF2.4.4、現行GPU非対応・書き換え後モデル非対応）
- `docker builder prune`で未参照ビルドキャッシュ削除（約10GB）
- `tensorflow/tensorflow:latest-gpu`（7.49GB）削除 — 未使用、`denovocnn-gpu`に置き換え済み
- 壊れたconda env `bioconda`・未完成の`tensorflow_env_forge`を削除（計約3.2GB、
  `import tensorflow`がそもそも失敗する状態だった）
- `/home/sugimoto/cuda_12.6.0_560.28.03_linux.run`（4.1GB）削除 — CUDA 12.6は
  `/usr/local/cuda-12.6`に導入済みでインストーラは不要
- `/opt/intel`（Intel oneAPI Base+HPC Toolkit、19GB）を`apt purge`で削除
  — このプロジェクト・Python環境では使われていないことを確認（numpy/scipyはOpenBLAS、
  mkl/intel系パッケージなし）。apt repo設定は残しているので`apt install intel-basekit
  intel-hpckit`で再導入可能
- `~/ray_results`（27GB、Ray Tuneの学習結果）を`/home1/sugimoto/archives/`へ
  `tar + pigz`で圧縮アーカイブ（sha256チェックサム付き）してから元ディレクトリを削除

結果: `/dev/sda4` 空き 0 → 43GB（70%使用）まで回復。