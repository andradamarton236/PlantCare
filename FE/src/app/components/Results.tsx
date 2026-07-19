import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Leaf,
  CheckCircle,
  LogOut,
  ShieldCheck,
  Stethoscope,
  Info
} from 'lucide-react';
import { PredictionResponse } from '../services/api';

interface ScanResult extends PredictionResponse {
  image?: string;
  date?: string;
}

interface ResultsProps {
  onLogout: () => void;
}

type Recommendation = {
  description: string;
  treatment: string[];
  prevention: string[];
};

const RECOMMENDATIONS: Record<string, Record<string, Recommendation>> = {
  Corn: {
    Blight: {
      description: 'Boală foliară care produce pete alungite pe frunze și poate reduce capacitatea plantei de fotosinteză.',
      treatment: ['Îndepărtează frunzele foarte afectate.', 'Aplică fungicide omologate pentru boli foliare la porumb.', 'Monitorizează cultura după apariția primelor simptome.'],
      prevention: ['Rotația culturilor.', 'Îndepărtarea resturilor vegetale.', 'Folosirea hibrizilor rezistenți.'],
    },
    Common_Rust: {
      description: 'Boală fungică ce apare sub formă de pustule ruginii pe frunze.',
      treatment: ['Aplică tratamente fungicide dacă infecția este extinsă.', 'Monitorizează cultura în perioade umede.'],
      prevention: ['Utilizarea hibrizilor rezistenți.', 'Aerisire bună între plante.', 'Verificarea periodică a frunzelor.'],
    },
    Gray_Leaf_Spot: {
      description: 'Boală ce produce pete gri-maronii pe frunze și poate afecta randamentul culturii.',
      treatment: ['Aplică fungicide omologate în stadiile timpurii.', 'Elimină sursele de infecție prin gestionarea resturilor vegetale.'],
      prevention: ['Rotația culturilor.', 'Lucrări ale solului pentru descompunerea resturilor.', 'Alegerea hibrizilor toleranți.'],
    },
    Healthy: {
      description: 'Planta nu prezintă simptome evidente de boală.',
      treatment: ['Nu este necesar tratament.'],
      prevention: ['Monitorizare periodică.', 'Udare echilibrată.', 'Menținerea igienei culturii.'],
    }
  },

  Cucumber: {
    Anthracnose: {
      description: 'Boală fungică ce produce pete circulare pe frunze și poate afecta fructele.',
      treatment: ['Îndepărtează frunzele infectate.', 'Aplică fungicid omologat pentru cucurbitacee.', 'Evită udarea directă pe frunze.'],
      prevention: ['Rotația culturilor.', 'Folosirea semințelor sănătoase.', 'Spațiere corectă între plante.'],
    },
    Bacterial_Wilt: {
      description: 'Boală bacteriană transmisă frecvent de insecte, care determină ofilirea rapidă a plantei.',
      treatment: ['Nu există tratament curativ eficient.', 'Elimină plantele afectate pentru a reduce răspândirea.'],
      prevention: ['Controlul gândacilor de castravete.', 'Utilizarea plaselor de protecție.', 'Îndepărtarea plantelor infectate.'],
    },
    Downy_Mildew: {
      description: 'Boală favorizată de umiditate, care produce pete galbene pe frunze.',
      treatment: ['Aplică fungicide specifice pentru mană.', 'Îndepărtează frunzele foarte afectate.'],
      prevention: ['Evitarea umidității excesive.', 'Udare la bază.', 'Aerisirea culturii.'],
    },
    Gummy_Stem_Blight: {
      description: 'Boală fungică ce afectează frunzele și tulpinile, producând leziuni și zone brunificate.',
      treatment: ['Aplică fungicide recomandate pentru cucurbitacee.', 'Îndepărtează resturile infectate.'],
      prevention: ['Rotația culturilor.', 'Distrugerea resturilor vegetale.', 'Evitarea excesului de umiditate.'],
    },
    Healthy: {
      description: 'Planta nu prezintă simptome evidente de boală.',
      treatment: ['Nu este necesar tratament.'],
      prevention: ['Monitorizare regulată.', 'Aerisire bună.', 'Evitarea excesului de apă.'],
    }
  },

  Pea: {
    Downy_Mildew: {
      description: 'Boală fungică ce apare în condiții de umiditate ridicată și afectează frunzele de mazăre.',
      treatment: ['Aplică tratamente antifungice recomandate.', 'Îndepărtează plantele sever afectate.'],
      prevention: ['Rotația culturilor.', 'Distrugerea resturilor infectate.', 'Evitarea densității mari a plantelor.'],
    },
    Leafminner: {
      description: 'Atac produs de larve care creează galerii vizibile în frunze.',
      treatment: ['Îndepărtează frunzele cu galerii vizibile.', 'Folosește capcane lipicioase pentru monitorizare.', 'Aplică tratamente împotriva insectelor doar la atac ridicat.'],
      prevention: ['Monitorizarea culturii.', 'Îndepărtarea buruienilor gazdă.', 'Menținerea igienei culturii.'],
    },
    Powder_Mildew: {
      description: 'Boală fungică ce apare ca un strat albicios pe frunze.',
      treatment: ['Aplică produse recomandate pentru făinare.', 'Îndepărtează părțile puternic afectate.'],
      prevention: ['Utilizarea soiurilor rezistente.', 'Spațiere corectă între plante.', 'Evitarea excesului de umiditate.'],
    },
    Healthy: {
      description: 'Planta pare sănătoasă.',
      treatment: ['Nu este necesar tratament.'],
      prevention: ['Monitorizare periodică.', 'Rotația culturilor.', 'Udare echilibrată.'],
    }
  },

  Potato: {
    Early_Blight: {
      description: 'Boală fungică ce produce pete concentrice pe frunze, frecventă în perioade calde și umede.',
      treatment: ['Îndepărtează frunzele afectate.', 'Aplică fungicide omologate pentru alternarioză.', 'Monitorizează cultura constant.'],
      prevention: ['Rotația culturilor.', 'Folosirea tuberculilor sănătoși.', 'Evitarea stresului hidric.'],
    },
    Late_Blight: {
      description: 'Boală gravă a cartofului, favorizată de vreme rece și umedă.',
      treatment: ['Aplică rapid tratamente specifice pentru mană.', 'Îndepărtează plantele puternic afectate.', 'Evită răspândirea prin resturi infectate.'],
      prevention: ['Material de plantare sănătos.', 'Udare la bază.', 'Monitorizare în perioade umede.'],
    },
    Healthy: {
      description: 'Planta nu prezintă simptome evidente de boală.',
      treatment: ['Nu este necesar tratament.'],
      prevention: ['Monitorizare constantă.', 'Rotația culturilor.', 'Folosirea tuberculilor certificați.'],
    }
  },

  Pumpkin: {
    Bacterial_Spot: {
      description: 'Boală bacteriană care produce pete pe frunze și poate afecta dezvoltarea plantei.',
      treatment: ['Îndepărtează frunzele afectate.', 'Aplică produse pe bază de cupru dacă sunt omologate.'],
      prevention: ['Folosirea semințelor sănătoase.', 'Evitarea udării prin aspersie.', 'Rotația culturilor.'],
    },
    Downy_Mildew: {
      description: 'Boală favorizată de umiditate, care afectează frunzele dovleacului.',
      treatment: ['Aplică fungicide specifice pentru mană.', 'Elimină frunzele afectate.'],
      prevention: ['Aerisirea culturii.', 'Udare la bază.', 'Monitorizare în perioade umede.'],
    },
    Mosaic_Disease: {
      description: 'Boală virală ce produce deformări și pete mozaicate pe frunze.',
      treatment: ['Nu există tratament curativ.', 'Elimină plantele infectate.', 'Controlează insectele vector.'],
      prevention: ['Combaterea afidelor.', 'Utilizarea semințelor sănătoase.', 'Dezinfectarea uneltelor.'],
    },
    Powdery_Mildew: {
      description: 'Boală fungică ce apare ca un strat albicios pe suprafața frunzelor.',
      treatment: ['Aplică fungicide pentru făinare.', 'Produsele pe bază de sulf pot fi utile dacă sunt omologate.'],
      prevention: ['Spațiere corectă.', 'Aerisire bună.', 'Monitorizare după înflorire.'],
    },
    Healthy: {
      description: 'Planta nu prezintă simptome evidente.',
      treatment: ['Nu este necesar tratament.'],
      prevention: ['Monitorizare periodică.', 'Evitarea umidității excesive.', 'Igienă bună în cultură.'],
    }
  },

  Tomato: {
    Arget_Spot: {
      description: 'Boală foliară care produce pete pe frunze și poate reduce dezvoltarea plantei.',
      treatment: ['Îndepărtează frunzele infectate.', 'Aplică fungicide omologate pentru pătări foliare.', 'Evită udarea pe frunze.'],
      prevention: ['Rotația culturilor.', 'Aerisirea plantelor.', 'Îndepărtarea resturilor vegetale.'],
    },
    Bacterial_Spot: {
      description: 'Boală bacteriană ce produce pete pe frunze și fructe.',
      treatment: ['Îndepărtează frunzele puternic afectate.', 'Aplică tratamente pe bază de cupru dacă sunt recomandate local.', 'Evită lucrul în cultură când plantele sunt umede.'],
      prevention: ['Semințe și răsaduri sănătoase.', 'Dezinfectarea uneltelor.', 'Evitarea udării prin aspersie.'],
    },
    Late_Blight: {
      description: 'Boală severă, favorizată de temperaturi moderate și umiditate ridicată.',
      treatment: ['Aplică urgent fungicide specifice pentru mană.', 'Îndepărtează plantele foarte afectate.', 'Evită răspândirea prin resturi infectate.'],
      prevention: ['Monitorizare în perioade reci și umede.', 'Spațiere bună între plante.', 'Udare la bază.'],
    },
    Septoria_Leaf_Spot: {
      description: 'Boală foliară care produce pete mici, circulare, mai ales pe frunzele inferioare.',
      treatment: ['Îndepărtează frunzele inferioare afectate.', 'Aplică fungicide pentru pătări foliare.', 'Redu umiditatea pe frunze.'],
      prevention: ['Mulcire pentru evitarea stropirii cu sol.', 'Rotația culturilor.', 'Curățarea resturilor vegetale.'],
    },
    Tomato_Mosaic_Virus: {
      description: 'Boală virală care produce pete mozaicate și deformări ale frunzelor.',
      treatment: ['Nu există tratament curativ.', 'Elimină plantele infectate.', 'Dezinfectează mâinile și uneltele.'],
      prevention: ['Folosirea semințelor sănătoase.', 'Dezinfectarea uneltelor.', 'Evitarea contactului între plante bolnave și sănătoase.'],
    },
    Tomato_Yellow_Leaf_Curl_Virus: {
      description: 'Boală virală transmisă frecvent de musculița albă, care produce îngălbenirea și răsucirea frunzelor.',
      treatment: ['Nu există tratament curativ.', 'Elimină plantele infectate.', 'Controlează musculița albă.'],
      prevention: ['Monitorizarea musculiței albe.', 'Utilizarea plaselor de protecție.', 'Îndepărtarea buruienilor gazdă.'],
    },
    Healthy: {
      description: 'Planta nu prezintă simptome evidente.',
      treatment: ['Nu este necesar tratament.'],
      prevention: ['Monitorizare periodică.', 'Udare la bază.', 'Aerisire și igienă bună în cultură.'],
    }
  }
};

function pct(value?: number) {
  if (typeof value !== 'number') return '0.00%';
  return `${(value * 100).toFixed(2)}%`;
}


export default function Results({ onLogout }: ResultsProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const stored = localStorage.getItem(`scanResult:${id}`) || localStorage.getItem('lastScanResult');
    if (stored) {
      setResult(JSON.parse(stored));
    } else {
      navigate('/history');
    }
  }, [id, navigate]);

  if (!result) return null;

  const recommendation = RECOMMENDATIONS[result.plant]?.[result.disease];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900">
      <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2 rounded-xl shadow-lg shadow-green-500/50">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Rezultate analiză
            </h1>
          </div>

          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-xl transition backdrop-blur-sm border border-red-500/30">
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Ieșire</span>
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Înapoi la scanare
        </button>

        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 overflow-hidden">
          {result.image && (
            <div className="bg-gray-900/50 border-b border-gray-700/50">
              <img src={result.image} alt="Imagine scanată" className="w-full h-80 object-contain" />
            </div>
          )}

          <div className="p-8">
            <div className="flex items-center gap-2 text-gray-400 mb-6">
              <Calendar className="w-5 h-5" />
              <span>
                {new Date(result.date || result.created_at).toLocaleString('ro-RO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>

            {result.warning && (
              <div className="mb-6 bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 text-yellow-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <span>{result.warning}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-5">
                <p className="text-gray-400 mb-1">Specie detectată</p>
                <h2 className="text-3xl font-bold text-white mb-2">{result.plant}</h2>
                <p className="text-green-400">Încredere: {pct(result.plant_confidence)}</p>
              </div>

              <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-5">
                <p className="text-gray-400 mb-1">Boală detectată</p>
                <h2 className="text-3xl font-bold text-white mb-2">{result.disease}</h2>
                <p className="text-red-400">Încredere: {pct(result.disease_confidence)}</p>
              </div>
            </div>

            {recommendation ? (
              <div className="space-y-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">Descriere</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{recommendation.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Stethoscope className="w-5 h-5 text-orange-400" />
                      <h3 className="text-xl font-bold text-white">Tratament</h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      {recommendation.treatment.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-xl font-bold text-white">Prevenție</h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      {recommendation.prevention.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-gray-300 leading-relaxed">
                  Nu există recomandări definite pentru această combinație plantă-boală. Verifică imaginea și compară simptomele vizuale cu rezultatul afișat.
                </p>
              </div>
            )}

            <div className="mt-6 bg-gray-900/40 border border-gray-700/50 rounded-xl p-4">
              <p className="text-gray-400 text-sm leading-relaxed">
                Recomandările sunt orientative și au scop informativ. Pentru tratamente chimice, respectă eticheta produsului și recomandările specialiștilor agricoli.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <button onClick={() => navigate('/')} className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition shadow-lg shadow-green-500/50 font-semibold transform hover:scale-[1.02]">
                Scanează din nou
              </button>
              <button onClick={() => navigate('/history')} className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition shadow-lg font-semibold border border-gray-600 transform hover:scale-[1.02]">
                Vezi istoric
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
