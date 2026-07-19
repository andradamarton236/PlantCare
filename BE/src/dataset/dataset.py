import os
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms


IMG_SIZE = 224
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".bmp", ".webp")


def is_image_file(filename):
    return filename.lower().endswith(IMAGE_EXTENSIONS)


def get_transforms(train=True):

    if train:
        return transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(IMG_SIZE, scale=(0.75, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.2),
            transforms.RandomRotation(25),
            transforms.ColorJitter(
                brightness=0.25,
                contrast=0.25,
                saturation=0.25,
                hue=0.05
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.5, 0.5, 0.5],
                std=[0.5, 0.5, 0.5]
            )
        ])

    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.5, 0.5, 0.5],
            std=[0.5, 0.5, 0.5]
        )
    ])


class PlantDataset(Dataset):

    def __init__(self, root, transform=None):
        self.root = root
        self.transform = transform
        self.samples = []

        self.classes = sorted([
            plant for plant in os.listdir(root)
            if os.path.isdir(os.path.join(root, plant))
        ])

        self.class_to_idx = {
            plant: idx for idx, plant in enumerate(self.classes)
        }

        self.idx_to_class = {
            idx: plant for plant, idx in self.class_to_idx.items()
        }

        for plant in self.classes:
            plant_path = os.path.join(root, plant)
            plant_label = self.class_to_idx[plant]

            for disease in sorted(os.listdir(plant_path)):
                disease_path = os.path.join(plant_path, disease)

                if not os.path.isdir(disease_path):
                    continue

                for img in sorted(os.listdir(disease_path)):
                    if is_image_file(img):
                        self.samples.append((os.path.join(disease_path, img), plant_label))

        if len(self.samples) == 0:
            raise RuntimeError(f"Nu s-au găsit imagini în folderul: {root}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]

        img = Image.open(path).convert("RGB")

        if self.transform:
            img = self.transform(img)

        return img, label


class DiseaseDataset(Dataset):

    def __init__(self, root, plant_name, transform=None):
        self.root = root
        self.plant_name = plant_name
        self.transform = transform
        self.samples = []

        plant_path = os.path.join(root, plant_name)

        if not os.path.isdir(plant_path):
            raise RuntimeError(f"Nu există folderul pentru planta {plant_name}: {plant_path}")

        self.classes = sorted([
            disease for disease in os.listdir(plant_path)
            if os.path.isdir(os.path.join(plant_path, disease))
        ])

        self.class_to_idx = {
            disease: idx for idx, disease in enumerate(self.classes)
        }

        self.idx_to_class = {
            idx: disease for disease, idx in self.class_to_idx.items()
        }

        for disease in self.classes:
            disease_path = os.path.join(plant_path, disease)
            disease_label = self.class_to_idx[disease]

            for img in sorted(os.listdir(disease_path)):
                if is_image_file(img):
                    self.samples.append((os.path.join(disease_path, img), disease_label))

        if len(self.samples) == 0:
            raise RuntimeError(f"Nu s-au găsit imagini pentru planta {plant_name} în {root}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]

        img = Image.open(path).convert("RGB")

        if self.transform:
            img = self.transform(img)

        return img, label
