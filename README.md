#  PlantCare
Aplicație web pentru identificarea speciilor de plante și a bolilor acestora utilizând modele de inteligență artificială bazate pe rețele neuronale convoluționale (CNN).

## Tehnologii utilizate

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy
- SQLite
- PyTorch
- Torchvision
- Uvicorn

### Frontend
- React
- TypeScript
- Vite
- TailwindCSS
- Axios

---

# Structura proiectului

```
project/
│
├── BE/
│   ├── app/
│   ├── models/
│   ├── database/
│   ├── requirements.txt
│   └── main.py
│
├── FE/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

# Instalarea backend-ului

## 1. Crearea mediului virtual

Windows

```bash
python -m venv venv
venv\Scripts\activate
```

Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 2. Instalarea dependențelor

```bash
pip install -r requirements.txt
```

---

## 3. Instalarea PyTorch

CPU

```bash
pip install torch torchvision torchaudio
```

sau pentru CUDA (NVIDIA)

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

Versiunea CUDA poate fi modificată în funcție de placa video utilizată.

---

## 4. Pornirea backend-ului

```bash
uvicorn main:app --reload
```

sau

```bash
python -m uvicorn main:app --reload
```

Backend-ul va fi disponibil la:

```
http://127.0.0.1:8000
```

Documentația API:

```
http://127.0.0.1:8000/docs
```

---

# Instalarea frontend-ului

Intră în directorul frontend

```bash
cd FE
```

Instalează dependențele

```bash
npm install
```

Rulează aplicația

```bash
npm run dev
```

Frontend-ul va fi disponibil la

```
http://localhost:5173
```

---

# Modelele CNN

Înainte de pornirea aplicației trebuie să existe modelele antrenate.

Exemplu:

```
models/

PlantCNN.pth

PotatoCNN.pth

TomatoCNN.pth

CornCNN.pth

AppleCNN.pth

CherryCNN.pth

CucumberCNN.pth

GrapeCNN.pth

PeachCNN.pth

PepperCNN.pth

StrawberryCNN.pth
```

Aplicația încarcă automat modelul corespunzător fiecărei specii detectate.

---

# Funcționalități

- autentificare utilizatori
- autentificare administrator
- identificarea speciei plantei
- identificarea bolii
- afișarea probabilităților
- recomandări pentru tratament
- istoric individual pentru fiecare utilizator
- ștergerea analizelor din istoric
- panou administrator
- statistici privind utilizarea aplicației

---

# Baza de date

La prima rulare baza de date SQLite este creată automat dacă aceasta nu există.

---

# Cerințe software

- Python 3.11 sau mai nou
- Node.js 18+
- npm
- Git (opțional)

---

# Instalare rapidă

Backend

```bash
python -m venv venv

venv\Scripts\activate

pip install -r requirements.txt

pip install torch torchvision torchaudio

uvicorn main:app --reload
```

Frontend

```bash
cd frontend

npm install

npm run dev
```


