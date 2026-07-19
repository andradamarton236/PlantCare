import torch
from PIL import Image

from src.dataset.dataset import get_transforms


def predict(image_path, plant_model, disease_models, plant_classes, disease_classes, device):

    transform = get_transforms(train=False)

    img = Image.open(image_path).convert("RGB")
    img = transform(img).unsqueeze(0).to(device)

    plant_model.eval()

    with torch.no_grad():
        plant_out = plant_model(img)
        plant_prob = torch.softmax(plant_out, dim=1)
        plant_idx = plant_prob.argmax(1).item()

    plant_name = plant_classes[plant_idx]
    plant_conf = plant_prob[0][plant_idx].item()

    disease_model = disease_models[plant_name]
    disease_model.eval()

    with torch.no_grad():
        disease_out = disease_model(img)
        disease_prob = torch.softmax(disease_out, dim=1)
        disease_idx = disease_prob.argmax(1).item()

    disease_name = disease_classes[plant_name][disease_idx]
    disease_conf = disease_prob[0][disease_idx].item()

    print(f"Plantă: {plant_name} ({plant_conf:.2f})")
    print(f"Boală: {disease_name} ({disease_conf:.2f})")

    return plant_name, disease_name, plant_conf, disease_conf
