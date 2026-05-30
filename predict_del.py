import os
import time

import numpy as np
import tensorflow as tf

print(f"TensorFlow version: {tf.__version__}")
print("CUDA version:", tf.sysconfig.get_build_info()["cuda_version"])
print("cuDNN version:", tf.sysconfig.get_build_info()["cudnn_version"])

# show dnm_images[0]
# import png images from dnm_dir and save as numpy array
from process_images import (
    load_images_from_directory,
    preprocess_images,
    save_predictions_distribution,
)

# snp_model = "models/snp"
# del_model = "models/del"
# ins_model = "models/ins"


# models_cfg = {
#     "snp_model": snp_model,
#     "del_model": del_model,
#     "ins_model": ins_model,
# }

# models_dict = load_models(models_cfg)

# model = models_dict["Deletion"]

model = tf.keras.models.load_model("models/del.h5")

model.summary()

IMAGE_DATA_DIR = "data/publish_images"

train_dir = os.path.join(IMAGE_DATA_DIR, "deletion", "train")

dnm_dir = os.path.join(train_dir, "DNM")
iv_dir = os.path.join(train_dir, "IV")

# images_dir = "images"

images_dir = dnm_dir

# import png images from images_dir and save as numpy array
images = load_images_from_directory(images_dir)

images_array_normalized = preprocess_images(images)
print(f"dtype of images_array_normalized: {images_array_normalized.dtype}")
print(f"show the shape of images_array_normalized: {images_array_normalized.shape}")

# make predictions using model for images_array_normalized
start_time = time.time()
predictions = model.predict(images_array_normalized)
end_time = time.time()

print(f"Time taken for prediction: {(end_time - start_time) / 60:.2f} minutes")

# save predictions in numpy
np.save("predictions_del_train.npy", predictions)

save_predictions_distribution(
    predictions, filename="distribution_of_predictions_del_train.png"
)
