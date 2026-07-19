import os
import csv
import torch
import numpy as np
import matplotlib.pyplot as plt

from sklearn.metrics import confusion_matrix, classification_report


RESULTS_DIR = "results/evaluation"
os.makedirs(RESULTS_DIR, exist_ok=True)


def safe_name(name: str):
    return name.replace(" ", "_").replace("/", "_").replace("\\", "_")


def save_confusion_matrix(labels, preds, class_names, title, filename):
    cm = confusion_matrix(labels, preds)

    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation="nearest", cmap="Blues")
    plt.title(title)
    plt.colorbar()

    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45, ha="right")
    plt.yticks(tick_marks, class_names)

    threshold = cm.max() / 2 if cm.max() > 0 else 0

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(
                j,
                i,
                str(cm[i, j]),
                ha="center",
                va="center",
                color="white" if cm[i, j] > threshold else "black"
            )

    plt.ylabel("Clasa reală")
    plt.xlabel("Clasa prezisă")
    plt.tight_layout()

    path = os.path.join(RESULTS_DIR, filename)
    plt.savefig(path, dpi=300)
    plt.close()

    print(f"Matrice salvată: {path}")


def save_classification_report(labels, preds, class_names, filename):
    report = classification_report(
        labels,
        preds,
        target_names=class_names,
        output_dict=True,
        zero_division=0
    )

    path = os.path.join(RESULTS_DIR, filename)

    with open(path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["clasa", "precision", "recall", "f1-score", "support"])

        for class_name in class_names:
            values = report[class_name]
            writer.writerow([
                class_name,
                values["precision"],
                values["recall"],
                values["f1-score"],
                values["support"]
            ])

        writer.writerow([])
        writer.writerow(["accuracy", report["accuracy"], "", "", ""])
        writer.writerow(["macro avg", report["macro avg"]["precision"], report["macro avg"]["recall"], report["macro avg"]["f1-score"], report["macro avg"]["support"]])
        writer.writerow(["weighted avg", report["weighted avg"]["precision"], report["weighted avg"]["recall"], report["weighted avg"]["f1-score"], report["weighted avg"]["support"]])

    print(f"Raport salvat: {path}")


def save_per_class_accuracy_chart(preds, labels, class_names, title, filename):
    accuracies = []

    for idx, class_name in enumerate(class_names):
        total = sum(1 for label in labels if label == idx)
        correct = sum(1 for pred, label in zip(preds, labels) if label == idx and pred == label)

        acc = correct / total if total > 0 else 0
        accuracies.append(acc * 100)

    plt.figure(figsize=(10, 6))
    plt.bar(class_names, accuracies)
    plt.title(title)
    plt.ylabel("Acuratețe (%)")
    plt.xlabel("Clasă")
    plt.ylim(0, 100)
    plt.xticks(rotation=45, ha="right")

    for i, value in enumerate(accuracies):
        plt.text(i, value + 1, f"{value:.1f}%", ha="center", fontsize=8)

    plt.tight_layout()

    path = os.path.join(RESULTS_DIR, filename)
    plt.savefig(path, dpi=300)
    plt.close()

    print(f"Grafic acuratețe pe clase salvat: {path}")


def print_per_class_accuracy(preds, labels, class_names):
    correct_per_class = {class_name: 0 for class_name in class_names}
    total_per_class = {class_name: 0 for class_name in class_names}

    for pred, label in zip(preds, labels):
        class_name = class_names[label]
        total_per_class[class_name] += 1

        if pred == label:
            correct_per_class[class_name] += 1

    print("Acuratețe pe clase:")
    for class_name in class_names:
        total = total_per_class[class_name]
        correct = correct_per_class[class_name]

        if total == 0:
            print(f"  {class_name}: nu are imagini în validare")
        else:
            acc = correct / total
            print(f"  {class_name}: {acc:.4f} ({correct}/{total})")


def evaluate_plant(model, loader, device, class_names=None):
    model.eval()

    correct = 0
    total = 0

    all_preds = []
    all_labels = []

    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            labels = labels.to(device)

            out = model(imgs)
            _, pred = out.max(1)

            correct += (pred == labels).sum().item()
            total += labels.size(0)

            all_preds.extend(pred.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())

    acc = correct / total if total > 0 else 0.0

    print(f"\nPlant Accuracy: {acc:.4f}")

    if class_names is not None:
        print_per_class_accuracy(all_preds, all_labels, class_names)

        save_confusion_matrix(
            all_labels,
            all_preds,
            class_names,
            "Matrice de confuzie - PlantCNN",
            "confusion_matrix_plantcnn.png"
        )

        save_classification_report(
            all_labels,
            all_preds,
            class_names,
            "classification_report_plantcnn.csv"
        )

        save_per_class_accuracy_chart(
            all_preds,
            all_labels,
            class_names,
            "Acuratețe pe clase - PlantCNN",
            "per_class_accuracy_plantcnn.png"
        )

    return acc


def evaluate_disease(model, loader, device, plant_name, class_names=None):
    model.eval()

    correct = 0
    total = 0

    all_preds = []
    all_labels = []

    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            labels = labels.to(device)

            out = model(imgs)
            _, pred = out.max(1)

            correct += (pred == labels).sum().item()
            total += labels.size(0)

            all_preds.extend(pred.cpu().tolist())
            all_labels.extend(labels.cpu().tolist())

    acc = correct / total if total > 0 else 0.0

    print(f"\n{plant_name} Disease Accuracy: {acc:.4f}")

    if class_names is not None:
        print_per_class_accuracy(all_preds, all_labels, class_names)

        plant_file = safe_name(plant_name.lower())

        save_confusion_matrix(
            all_labels,
            all_preds,
            class_names,
            f"Matrice de confuzie - {plant_name} DiseaseCNN",
            f"confusion_matrix_{plant_file}_diseasecnn.png"
        )

        save_classification_report(
            all_labels,
            all_preds,
            class_names,
            f"classification_report_{plant_file}_diseasecnn.csv"
        )

        save_per_class_accuracy_chart(
            all_preds,
            all_labels,
            class_names,
            f"Acuratețe pe clase - {plant_name} DiseaseCNN",
            f"per_class_accuracy_{plant_file}_diseasecnn.png"
        )

    return acc


def evaluate_pipeline(plant_model, disease_models, loader, plant_classes, disease_classes, device):
    plant_model.eval()

    correct_plant = 0
    correct_disease = 0
    correct_total = 0
    total = 0

    with torch.no_grad():
        for imgs, plant_labels, disease_labels in loader:
            imgs = imgs.to(device)

            plant_out = plant_model(imgs)
            _, plant_pred = plant_out.max(1)

            for i in range(len(imgs)):
                total += 1

                true_plant = plant_labels[i].item()
                pred_plant = plant_pred[i].item()

                if pred_plant == true_plant:
                    correct_plant += 1

                plant_name = plant_classes[pred_plant]

                disease_model = disease_models[plant_name]
                disease_model.eval()

                img = imgs[i].unsqueeze(0)

                disease_out = disease_model(img)
                _, disease_pred = disease_out.max(1)

                true_disease = disease_labels[i].item()

                if disease_pred.item() == true_disease:
                    correct_disease += 1

                if pred_plant == true_plant and disease_pred.item() == true_disease:
                    correct_total += 1

    if total == 0:
        print("Nu există date pentru evaluarea pipeline-ului.")
        return 0.0

    print("\n--- PIPELINE RESULTS ---")
    print(f"Plant Accuracy: {correct_plant / total:.4f}")
    print(f"Disease Accuracy: {correct_disease / total:.4f}")
    print(f"Total System Accuracy: {correct_total / total:.4f}")

    return correct_total / total