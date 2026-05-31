import os

import matplotlib.pyplot as plt
import numpy as np
from PIL import Image


def load_images_from_directory(directory):
    images = []
    for filename in os.listdir(directory):
        if filename.endswith(".png"):
            img = Image.open(os.path.join(directory, filename))
            img_array = np.array(img)
            images.append(img_array)
    return images


def preprocess_images(images):
    images_array = np.array(images)
    images_array = images_array.astype("float32")
    images_array_normalized = images_array / 255.0
    return images_array_normalized


def save_predictions_distribution(
    predictions, filename="distribution_of_predictions.png"
):
    """
    Plot the distribution of predictions and save the plot as an image file.

    Parameters:
    - predictions (numpy.ndarray): Array of prediction values.
    - filename (str): The name of the file to save the plot. Default is "distribution_of_predictions.png".
    """
    plt.hist(predictions, bins=30)
    plt.title("Distribution of Predictions")
    plt.xlabel("Prediction Value")
    plt.ylabel("Frequency")
    plt.savefig(filename)
    plt.close()  # Close the plot to free memory
