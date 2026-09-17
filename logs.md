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

### 3モデル（snp/ins/del）のCPU/GPU推論スループット比較

`predict_del.py`（deletionモデルのみ）と同じ手法を、`data/publish_images/<type>/train/DNM`
を使ってsubstitution/insertion/deletionの3モデルに拡張して計測。

- CPU: conda env `py311_tf25`（TF2.15.1、`CUDA_VISIBLE_DEVICES=""`）
- GPU: `denovocnn-gpu` Dockerイメージ（`--gpus '"device=0"'`）

| モデル | 画像数 | CPU (s/1000枚) | GPU (s/1000枚) | 速度比 |
|---|---|---|---|---|
| Substitution | 6,179 | 25.06 | 1.82 | 約13.8倍 |
| Insertion | 988 | 24.71 | 1.97 | 約12.5倍 |
| Deletion | 1,350 | 25.24 | 1.90 | 約13.3倍 |

3モデルとも CPU 約25秒/1000枚 → GPU 約1.9秒/1000枚 で、約13倍のGPU高速化。CPU側の値は
既存ログの「画像をmodelで処理した場合は1000枚約0.46分」（≒27.6秒/1000枚、deletionのみ）と
ほぼ一致。あくまで`model.predict()`のみの時間で、画像生成・trioパイプライン全体は含まない。

### test setで論文（Suppl. Table 5）の性能を再現できるか検証

`data/publish_images/<type>/test/{DNM,IV}`の画像数を数えたところ、論文の報告値
（test: 1,564 DNM / 8,410 IV、内訳 subs 1309/7322・ins 85/494・del 170/594）と完全一致 —
つまりこのローカルデータはpublished test setそのもの。そこで`models/{snp,ins,del}.h5`で
推論し、Suppl. Table 5（ROC AUC/Accuracy/Recall/Specificity/F1/Precision/混同行列）を
再現できるか検証するスクリプト `eval_test_performance.py` を作成（リポジトリに追加）。

**注意点（ハマったポイント）**: raw sigmoid出力をそのまま「DNM確率」として使うと、
指標が論文とほぼ完全に反転した値になった（AUC ≈ 0.0005 など）。原因は
`denovonet/dataset_o.py:439` の `prediction_dnm = 1.0 - prediction[0, 0]` —
**モデルの生出力はP(IV)であり、DNM確率は `1 - raw_output`**。これを踏まえてスクリプトを
修正した後は、以下の通り論文の混同行列・各指標と完全一致した。

| Metric | Total | Substitutions | Insertions | Deletions |
|---|---|---|---|---|
| ROC AUC | 0.9988 | 0.9995 | 0.9957 | 0.9842 |
| Accuracy | 0.9895 | 0.9932 | 0.9827 | 0.9529 |
| Recall | 0.9674 | 0.9771 | 0.9176 | 0.9176 |
| Specificity | 0.9936 | 0.9960 | 0.9939 | 0.9630 |
| F1 | 0.9665 | 0.9775 | 0.9398 | 0.8966 |
| Precision | 0.9655 | 0.9778 | 0.9630 | 0.8764 |
| TP/FP/TN/FN | 1513/54/8356/51 | 1279/29/7293/30 | 78/3/491/7 | 156/22/572/14 |

（論文Suppl. Table 5と全項目・混同行列とも完全一致。`.h5`への書き換え後モデルが
published test performanceを正しく再現していることを確認できた。）

実行方法:
```bash
python eval_test_performance.py
# or: EVAL_OUT=<path> python eval_test_performance.py
```