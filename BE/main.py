import os
from collections import Counter

import torch
from torch.utils.data import DataLoader, WeightedRandomSampler

from src.dataset.dataset import PlantDataset, DiseaseDataset, get_transforms
from src.models.plant_model import PlantCNN
from src.models.disease_model import DiseaseCNN
from src.train.train_plant import train_plant
from src.train.train_disease import train_disease
from src.evaluate.evaluate import evaluate_plant, evaluate_disease


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

DATA_DIR = "C:\\Users\\User1\\Desktop\\dataset"
BATCH_SIZE = 32

EPOCHS_P = 15
EPOCHS_D = 30

# MODURI POSIBILE:
# "full_train"      -> antrenează plante + boli, apoi evaluează
# "train_plant"     -> antrenează doar modelul de plante
# "train_disease"   -> antrenează doar modelele de boli
# "evaluate"        -> doar încarcă modelele salvate și evaluează
MODE = "evaluate"


def safe_name(name):
    return name.replace(" ", "_").replace("/", "_").replace("\\", "_")


def compute_class_weights(samples, num_classes, device):

    counts = torch.zeros(num_classes, dtype=torch.float32)

    for _, label in samples:
        counts[label] += 1

    total = counts.sum()

    weights = total / (num_classes * counts)
    weights[counts == 0] = 0.0

    return weights.to(device)


def create_weighted_sampler(samples):

    labels = [label for _, label in samples]
    class_counts = Counter(labels)

    sample_weights = [1.0 / class_counts[label] for label in labels]

    return WeightedRandomSampler(
        weights=sample_weights,
        num_samples=len(sample_weights),
        replacement=True
    )


def print_class_distribution(dataset, name):
    labels = [label for _, label in dataset.samples]
    counts = Counter(labels)

    print(f"\nDistribuție clase pentru {name}:")
    for class_idx, count in sorted(counts.items()):
        class_name = dataset.idx_to_class[class_idx]
        print(f"  {class_name}: {count} imagini")


def check_train_val_classes(train_ds, val_ds, name):
    train_classes = set(train_ds.class_to_idx.keys())
    val_classes = set(val_ds.class_to_idx.keys())

    missing_in_val = train_classes - val_classes
    missing_in_train = val_classes - train_classes

    if missing_in_val:
        print(f"\nATENȚIE: pentru {name}, aceste clase lipsesc din VAL: {missing_in_val}")

    if missing_in_train:
        print(f"\nATENȚIE: pentru {name}, aceste clase lipsesc din TRAIN: {missing_in_train}")

    if not missing_in_val and not missing_in_train:
        print(f"\nClase train/val corecte pentru {name}.")


def build_plant_loaders():
    train_ds = PlantDataset(f"{DATA_DIR}/train", get_transforms(True))
    val_ds = PlantDataset(f"{DATA_DIR}/val", get_transforms(False))

    check_train_val_classes(train_ds, val_ds, "PLANT")

    print_class_distribution(train_ds, "PLANT TRAIN")
    print_class_distribution(val_ds, "PLANT VAL")

    train_sampler = create_weighted_sampler(train_ds.samples)

    train_loader = DataLoader(
        train_ds,
        batch_size=BATCH_SIZE,
        sampler=train_sampler,
        num_workers=0
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )

    return train_ds, val_ds, train_loader, val_loader


def build_disease_loaders(plant_name):
    train_ds = DiseaseDataset(f"{DATA_DIR}/train", plant_name, get_transforms(True))
    val_ds = DiseaseDataset(f"{DATA_DIR}/val", plant_name, get_transforms(False))

    check_train_val_classes(train_ds, val_ds, f"DISEASE - {plant_name}")

    print_class_distribution(train_ds, f"{plant_name} DISEASE TRAIN")
    print_class_distribution(val_ds, f"{plant_name} DISEASE VAL")

    train_sampler = create_weighted_sampler(train_ds.samples)

    train_loader = DataLoader(
        train_ds,
        batch_size=BATCH_SIZE,
        sampler=train_sampler,
        num_workers=0
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=0
    )

    return train_ds, val_ds, train_loader, val_loader


def train_full():
    os.makedirs("models", exist_ok=True)

    # ===== PLANT =====
    train_plant_ds, val_plant_ds, train_plant_loader, val_plant_loader = build_plant_loaders()

    num_plants = len(train_plant_ds.class_to_idx)
    plant_model = PlantCNN(num_plants)

    plant_weights = compute_class_weights(train_plant_ds.samples, num_plants, DEVICE)

    print("\n===== TRAINING PLANT CNN =====")
    train_plant(
        plant_model,
        train_plant_loader,
        val_plant_loader,
        EPOCHS_P,
        DEVICE,
        plant_weights
    )

    plant_model.load_state_dict(torch.load("models/plant_model.pt", map_location=DEVICE))
    plant_model.to(DEVICE)

    print("\n===== FINAL EVALUATION PLANT CNN =====")
    evaluate_plant(plant_model, val_plant_loader, DEVICE, val_plant_ds.classes)

    # ===== DISEASE =====
    print("\n===== TRAINING DISEASE CNN MODELS =====")

    for plant_name in train_plant_ds.class_to_idx.keys():
        print(f"\nTraining disease CNN for {plant_name}")

        train_ds, val_ds, train_loader, val_loader = build_disease_loaders(plant_name)

        num_diseases = len(train_ds.class_to_idx)

        if num_diseases < 2:
            print(f"Se sare peste {plant_name}: are mai puțin de 2 clase de boli.")
            continue

        disease_model = DiseaseCNN(num_diseases)

        disease_weights = compute_class_weights(train_ds.samples, num_diseases, DEVICE)

        train_disease(
            disease_model,
            train_loader,
            val_loader,
            EPOCHS_D,
            DEVICE,
            disease_weights,
            plant_name
        )

        model_path = f"models/{safe_name(plant_name)}_disease.pt"

        disease_model.load_state_dict(
            torch.load(model_path, map_location=DEVICE)
        )
        disease_model.to(DEVICE)

        print(f"Final evaluation for best {plant_name} disease CNN:")
        evaluate_disease(disease_model, val_loader, DEVICE, plant_name, val_ds.classes)


def train_only_plant():
    os.makedirs("models", exist_ok=True)

    train_plant_ds, val_plant_ds, train_plant_loader, val_plant_loader = build_plant_loaders()

    num_plants = len(train_plant_ds.class_to_idx)
    plant_model = PlantCNN(num_plants)

    plant_weights = compute_class_weights(train_plant_ds.samples, num_plants, DEVICE)

    print("\n===== TRAINING ONLY PLANT CNN =====")
    train_plant(
        plant_model,
        train_plant_loader,
        val_plant_loader,
        EPOCHS_P,
        DEVICE,
        plant_weights
    )

    plant_model.load_state_dict(torch.load("models/plant_model.pt", map_location=DEVICE))
    plant_model.to(DEVICE)

    print("\n===== FINAL EVALUATION PLANT CNN =====")
    evaluate_plant(plant_model, val_plant_loader, DEVICE, val_plant_ds.classes)


def train_only_disease():
    os.makedirs("models", exist_ok=True)

    train_plant_ds, _, _, _ = build_plant_loaders()

    print("\n===== TRAINING ONLY DISEASE CNN MODELS =====")

    for plant_name in train_plant_ds.class_to_idx.keys():
        print(f"\nTraining disease CNN for {plant_name}")

        train_ds, val_ds, train_loader, val_loader = build_disease_loaders(plant_name)

        num_diseases = len(train_ds.class_to_idx)

        if num_diseases < 2:
            print(f"Se sare peste {plant_name}: are mai puțin de 2 clase de boli.")
            continue

        disease_model = DiseaseCNN(num_diseases)

        disease_weights = compute_class_weights(train_ds.samples, num_diseases, DEVICE)

        train_disease(
            disease_model,
            train_loader,
            val_loader,
            EPOCHS_D,
            DEVICE,
            disease_weights,
            plant_name
        )

        model_path = f"models/{safe_name(plant_name)}_disease.pt"

        disease_model.load_state_dict(
            torch.load(model_path, map_location=DEVICE)
        )
        disease_model.to(DEVICE)

        print(f"Final evaluation for best {plant_name} disease CNN:")
        evaluate_disease(disease_model, val_loader, DEVICE, plant_name, val_ds.classes)


def evaluate_all():
    train_plant_ds, val_plant_ds, _, val_plant_loader = build_plant_loaders()

    num_plants = len(train_plant_ds.class_to_idx)
    plant_model = PlantCNN(num_plants)

    if not os.path.exists("models/plant_model.pt"):
        print("Modelul plant_model.pt nu există în folderul models/")
    else:
        plant_model.load_state_dict(torch.load("models/plant_model.pt", map_location=DEVICE))
        plant_model.to(DEVICE)

        print("\n===== EVALUATING PLANT CNN =====")
        evaluate_plant(plant_model, val_plant_loader, DEVICE, val_plant_ds.classes)

    print("\n===== EVALUATING DISEASE CNN MODELS =====")

    for plant_name in train_plant_ds.class_to_idx.keys():
        model_path = f"models/{safe_name(plant_name)}_disease.pt"

        train_ds, val_ds, _, val_loader = build_disease_loaders(plant_name)
        num_diseases = len(train_ds.class_to_idx)

        if num_diseases < 2:
            print(f"Se sare peste {plant_name}: are mai puțin de 2 clase de boli.")
            continue

        disease_model = DiseaseCNN(num_diseases)

        if not os.path.exists(model_path):
            print(f"Modelul {model_path} nu există.")
            continue

        disease_model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        disease_model.to(DEVICE)

        evaluate_disease(disease_model, val_loader, DEVICE, plant_name, val_ds.classes)


def main():
    print(f"Device: {DEVICE}")
    print(f"Mode: {MODE}")

    if MODE == "full_train":
        train_full()
    elif MODE == "train_plant":
        train_only_plant()
    elif MODE == "train_disease":
        train_only_disease()
    elif MODE == "evaluate":
        evaluate_all()
    else:
        print("MODE invalid. Alege unul dintre:")
        print("full_train / train_plant / train_disease / evaluate")


if __name__ == "__main__":
    main()
