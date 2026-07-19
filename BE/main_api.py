import os
import shutil
from datetime import datetime, timedelta
from typing import Optional

import torch
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from PIL import Image

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

from passlib.context import CryptContext
from jose import jwt, JWTError

from src.dataset.dataset import get_transforms
from src.models.plant_model import PlantCNN
from src.models.disease_model import DiseaseCNN


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

DATABASE_URL = "sqlite:///./plant.db"
SECRET_KEY = "schimba_cheia_asta_cu_una_mai_lunga"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
ADMIN_CODE = os.getenv("ADMIN_CODE", "1234")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MODEL_DIR = "models"
PLANT_MODEL_PATH = os.path.join(MODEL_DIR, "plant_model.pt")

DATA_DIR = r"C:\Users\User1\Desktop\dataset"
TRAIN_DIR = os.path.join(DATA_DIR, "train")

PLANT_CONFIDENCE_THRESHOLD = 0.70
DISEASE_CONFIDENCE_THRESHOLD = 0.70


PLANT_CLASSES = sorted([
    name for name in os.listdir(TRAIN_DIR)
    if os.path.isdir(os.path.join(TRAIN_DIR, name))
])

DISEASE_CLASSES = {}

for plant in PLANT_CLASSES:
    plant_path = os.path.join(TRAIN_DIR, plant)
    DISEASE_CLASSES[plant] = sorted([
        name for name in os.listdir(plant_path)
        if os.path.isdir(os.path.join(plant_path, name))
    ])

DISEASE_MODEL_PATHS = {
    plant: os.path.join(MODEL_DIR, f"{plant}_disease.pt")
    for plant in PLANT_CLASSES
}

print("PLANT_CLASSES folosite în API:", PLANT_CLASSES)
print("DISEASE_CLASSES folosite în API:", DISEASE_CLASSES)


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    history = relationship("PredictionHistory", back_populates="user")


class PredictionHistory(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    image_path = Column(String)
    plant_name = Column(String)
    disease_name = Column(String)
    plant_confidence = Column(Float)
    disease_confidence = Column(Float)
    warning = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="history")


Base.metadata.create_all(bind=engine)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str):
    return pwd_context.verify(password, password_hash)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        is_admin = bool(payload.get("is_admin", False))

        if user_id is None:
            raise HTTPException(status_code=401, detail="Token invalid")

    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalid")

    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=401, detail="Utilizator inexistent")

    user.is_admin = is_admin
    return user


def require_admin_user(current_user: User = Depends(get_current_user)):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Acces permis doar administratorului")
    return current_user


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str
    admin_code: Optional[str] = None


plant_model: Optional[PlantCNN] = None
disease_models = {}


def load_models():
    global plant_model, disease_models

    if not os.path.exists(PLANT_MODEL_PATH):
        print(f"ATENȚIE: Nu există modelul: {PLANT_MODEL_PATH}")
        return

    plant_model = PlantCNN(num_classes=len(PLANT_CLASSES))
    plant_model.load_state_dict(torch.load(PLANT_MODEL_PATH, map_location=DEVICE))
    plant_model.to(DEVICE)
    plant_model.eval()

    print("Modelul PlantCNN a fost încărcat cu succes.")

    for plant_name, model_path in DISEASE_MODEL_PATHS.items():
        if not os.path.exists(model_path):
            print(f"ATENȚIE: Nu există modelul de boală: {model_path}")
            continue

        num_diseases = len(DISEASE_CLASSES[plant_name])
        model = DiseaseCNN(num_classes=num_diseases)
        model.load_state_dict(torch.load(model_path, map_location=DEVICE))
        model.to(DEVICE)
        model.eval()

        disease_models[plant_name] = model

        print(f"Modelul DiseaseCNN pentru {plant_name} a fost încărcat.")


def predict_full(image_path: str):
    if plant_model is None:
        raise HTTPException(
            status_code=500,
            detail="Modelul PlantCNN nu este încărcat."
        )

    transform = get_transforms(train=False)

    image = Image.open(image_path).convert("RGB")
    image = transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        plant_output = plant_model(image)
        plant_probabilities = torch.softmax(plant_output, dim=1)
        plant_confidence, plant_idx = torch.max(plant_probabilities, dim=1)

    print("\n===== DEBUG PLANT PREDICTION =====")
    print("Imagine:", image_path)
    print("PLANT_CLASSES:", PLANT_CLASSES)
    print("Predicted plant index:", plant_idx.item())

    for i, prob in enumerate(plant_probabilities[0]):
        print(f"{i} - {PLANT_CLASSES[i]}: {float(prob):.6f}")

    plant_name = PLANT_CLASSES[plant_idx.item()]
    plant_confidence_value = float(plant_confidence.item())

    print("Predicted plant name:", plant_name)
    print("Plant confidence:", plant_confidence_value)
    print("==================================\n")

    warning = None

    if plant_confidence_value < PLANT_CONFIDENCE_THRESHOLD:
        warning = "Încredere scăzută pentru identificarea plantei."

        return {
            "plant": plant_name,
            "plant_confidence": plant_confidence_value,
            "disease": "Necunoscut",
            "disease_confidence": 0.0,
            "warning": warning
        }

    if plant_name not in disease_models:
        raise HTTPException(
            status_code=500,
            detail=f"Modelul de boală pentru {plant_name} nu este încărcat."
        )

    disease_model = disease_models[plant_name]
    disease_class_names = DISEASE_CLASSES[plant_name]

    with torch.no_grad():
        disease_output = disease_model(image)
        disease_probabilities = torch.softmax(disease_output, dim=1)
        disease_confidence, disease_idx = torch.max(disease_probabilities, dim=1)

    print("\n===== DEBUG DISEASE PREDICTION =====")
    print("Plantă detectată:", plant_name)
    print("DISEASE_CLASSES:", disease_class_names)
    print("Predicted disease index:", disease_idx.item())

    for i, prob in enumerate(disease_probabilities[0]):
        print(f"{i} - {disease_class_names[i]}: {float(prob):.6f}")

    disease_name = disease_class_names[disease_idx.item()]
    disease_confidence_value = float(disease_confidence.item())

    if disease_confidence_value < DISEASE_CONFIDENCE_THRESHOLD:
        warning = "Încredere scăzută pentru identificarea bolii."
        disease_name = "Diagnostic incert"

    print("Predicted disease name:", disease_name)
    print("Disease confidence:", disease_confidence_value)
    print("Warning:", warning)
    print("====================================\n")

    return {
        "plant": plant_name,
        "plant_confidence": plant_confidence_value,
        "disease": disease_name,
        "disease_confidence": disease_confidence_value,
        "warning": warning
    }


app = FastAPI(title="Plant Disease API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    load_models()


@app.get("/")
def root():
    return {
        "message": "Backend-ul rulează corect"
    }


@app.post("/auth/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(
        (User.email == data.email) | (User.username == data.username)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email-ul sau username-ul există deja"
        )

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Cont creat cu succes",
        "user_id": user.id
    }


@app.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Email sau parolă greșită"
        )

    is_admin_login = False
    if data.admin_code:
        if data.admin_code != ADMIN_CODE:
            raise HTTPException(
                status_code=403,
                detail="Cod admin invalid"
            )
        is_admin_login = True

    token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "is_admin": is_admin_login
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_admin": is_admin_login
        }
    }


@app.post("/predict")
def predict(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    filename = f"{datetime.utcnow().timestamp()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = predict_full(file_path)

    history_item = PredictionHistory(
        user_id=current_user.id,
        image_path=file_path,
        plant_name=result["plant"],
        disease_name=result["disease"],
        plant_confidence=result["plant_confidence"],
        disease_confidence=result["disease_confidence"],
        warning=result.get("warning")
    )

    db.add(history_item)
    db.commit()
    db.refresh(history_item)

    return {
        "id": history_item.id,
        "plant": result["plant"],
        "plant_confidence": result["plant_confidence"],
        "disease": result["disease"],
        "disease_confidence": result["disease_confidence"],
        "warning": result.get("warning"),
        "image_path": file_path,
        "created_at": history_item.created_at
    }


@app.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(PredictionHistory).filter(
        PredictionHistory.user_id == current_user.id
    ).order_by(
        PredictionHistory.created_at.desc()
    ).all()

    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "plant": item.plant_name,
            "disease": item.disease_name,
            "plant_confidence": item.plant_confidence,
            "disease_confidence": item.disease_confidence,
            "warning": item.warning,
            "image_path": item.image_path,
            "created_at": item.created_at
        }
        for item in items
    ]


@app.delete("/history/{history_id}")
def delete_history(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PredictionHistory).filter(PredictionHistory.id == history_id)

    if not getattr(current_user, "is_admin", False):
        query = query.filter(PredictionHistory.user_id == current_user.id)

    item = query.first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Înregistrarea nu există"
        )

    db.delete(item)
    db.commit()

    return {
        "message": "Șters cu succes"
    }


@app.get("/admin/stats")
def admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_user)
):
    total_users = db.query(User).count()
    total_predictions = db.query(PredictionHistory).count()

    users = db.query(User).order_by(User.created_at.desc()).all()

    users_stats = []
    for user in users:
        count = db.query(PredictionHistory).filter(
            PredictionHistory.user_id == user.id
        ).count()

        users_stats.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "created_at": user.created_at,
            "predictions_count": count
        })

    history_items = db.query(PredictionHistory).all()

    plant_counts = {}
    disease_counts = {}

    for item in history_items:
        if item.plant_name:
            plant_counts[item.plant_name] = plant_counts.get(item.plant_name, 0) + 1
        if item.disease_name:
            disease_counts[item.disease_name] = disease_counts.get(item.disease_name, 0) + 1

    top_plants = [
        {"plant": plant, "count": count}
        for plant, count in sorted(plant_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    top_diseases = [
        {"disease": disease, "count": count}
        for disease, count in sorted(disease_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    recent_items = db.query(PredictionHistory).order_by(
        PredictionHistory.created_at.desc()
    ).limit(10).all()

    recent_predictions = []
    for item in recent_items:
        user = db.query(User).filter(User.id == item.user_id).first()

        recent_predictions.append({
            "id": item.id,
            "user_id": item.user_id,
            "username": user.username if user else None,
            "email": user.email if user else None,
            "plant": item.plant_name,
            "disease": item.disease_name,
            "plant_confidence": item.plant_confidence,
            "disease_confidence": item.disease_confidence,
            "created_at": item.created_at
        })

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "total_detected_plants": len(plant_counts),
        "total_detected_diseases": len(disease_counts),
        "users": users_stats,
        "top_plants": top_plants,
        "top_diseases": top_diseases,
        "recent_predictions": recent_predictions
    }
