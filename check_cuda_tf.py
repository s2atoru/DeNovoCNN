import multiprocessing

import tensorflow as tf

cpu_count = multiprocessing.cpu_count()
print(f"使用可能なCPUの数: {cpu_count}")

print(f"TensorFlow version: {tf.__version__}")

print("CUDA version:", tf.sysconfig.get_build_info()["cuda_version"])
print("cuDNN version:", tf.sysconfig.get_build_info()["cudnn_version"])

gpus = tf.config.list_physical_devices("GPU")
if gpus:
    print("CUDAが利用可能です。使用中のGPU:")
    for gpu in gpus:
        print(f"  - {gpu.name}")
else:
    print("CUDAは利用できません。")
