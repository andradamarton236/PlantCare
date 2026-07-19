import os
import torch
import torch.nn as nn
from tqdm import tqdm


def safe_name(name):
    return name.replace(" ", "_").replace("/", "_").replace("\\", "_")


def train_disease(model, train_loader, val_loader, epochs, device, class_weights, plant_name):

    os.makedirs("models", exist_ok=True)

    model.to(device)

    criterion = nn.CrossEntropyLoss(weight=class_weights)

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=3e-4,
        weight_decay=1e-4
    )

    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="max",
        factor=0.5,
        patience=3
    )

    best_acc = 0.0
    early_stop_patience = 10
    epochs_without_improvement = 0

    model_path = f"models/{safe_name(plant_name)}_disease.pt"

    for epoch in range(epochs):
        model.train()

        total_loss = 0.0
        correct = 0
        total = 0

        for imgs, labels in tqdm(train_loader, desc=f"{plant_name} disease epoch {epoch + 1}/{epochs}"):
            imgs = imgs.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()

            out = model(imgs)
            loss = criterion(out, labels)

            loss.backward()
            optimizer.step()

            total_loss += loss.item()

            _, pred = out.max(1)
            correct += (pred == labels).sum().item()
            total += labels.size(0)

        train_acc = correct / total if total > 0 else 0.0
        avg_loss = total_loss / len(train_loader)

        val_acc = evaluate(model, val_loader, device)

        scheduler.step(val_acc)

        current_lr = optimizer.param_groups[0]["lr"]

        print(
            f"[{plant_name}] Epoch {epoch + 1}/{epochs} | "
            f"Loss: {avg_loss:.4f} | "
            f"Train Acc: {train_acc:.4f} | "
            f"Val Acc: {val_acc:.4f} | "
            f"LR: {current_lr:.6f}"
        )

        if val_acc > best_acc:
            best_acc = val_acc
            epochs_without_improvement = 0
            torch.save(model.state_dict(), model_path)
            print(f"Best disease model salvat pentru {plant_name}: {best_acc:.4f}")
        else:
            epochs_without_improvement += 1

        if epochs_without_improvement >= early_stop_patience:
            print(f"Early stopping pentru DiseaseCNN - {plant_name}.")
            break

    print(f"Best Disease Accuracy pentru {plant_name}: {best_acc:.4f}")


def evaluate(model, loader, device):
    model.eval()

    correct = 0
    total = 0

    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            labels = labels.to(device)

            out = model(imgs)
            _, pred = out.max(1)

            correct += (pred == labels).sum().item()
            total += labels.size(0)

    return correct / total if total > 0 else 0.0
