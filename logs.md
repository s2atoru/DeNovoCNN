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