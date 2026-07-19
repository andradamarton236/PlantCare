import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, History as HistoryIcon, LogOut, Leaf, X, ShieldCheck } from 'lucide-react';
import { predictPlant, PredictionResponse, isAdminLoggedIn } from '../services/api';

interface ScannerProps {
  onLogout: () => void;
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

export default function Scanner({ onLogout }: ScannerProps) {
  const navigate = useNavigate();
  const isAdmin = isAdminLoggedIn();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 0);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Nu s-a putut accesa camera. Vă rugăm să verificați permisiunile.');
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/png');
        const file = dataUrlToFile(imageData, `camera-${Date.now()}.png`);
        setSelectedImage(imageData);
        setSelectedFile(file);
        setError('');
        stopCamera();
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!selectedFile || !selectedImage) return;

    try {
      setIsProcessing(true);
      setError('');

      const apiResult: PredictionResponse = await predictPlant(selectedFile);
      const scanResult = {
        ...apiResult,
        image: selectedImage,
        date: apiResult.created_at || new Date().toISOString(),
      };

      localStorage.setItem(`scanResult:${apiResult.id}`, JSON.stringify(scanResult));
      localStorage.setItem('lastScanResult', JSON.stringify(scanResult));

      setIsProcessing(false);
      navigate(`/results/${apiResult.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analiza imaginii a eșuat. Verifică dacă backend-ul rulează.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900">
      <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2 rounded-xl shadow-lg shadow-green-500/50">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">PlantCare AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/history')} className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-xl transition backdrop-blur-sm border border-gray-600/50">
              <HistoryIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Istoric</span>
            </button>
            {isAdmin && (
              <button onClick={() => navigate('/admin')} className="flex items-center gap-2 px-4 py-2 text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 rounded-xl transition backdrop-blur-sm border border-green-500/30">
                <ShieldCheck className="w-5 h-5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-xl transition backdrop-blur-sm border border-red-500/30">
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Ieșire</span>
            </button>
          </div>
        </div>
      </div>

      {showCamera && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Fotografiază planta</h3>
              <button onClick={stopCamera} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black mb-4">
              <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
            </div>
            <button onClick={capturePhoto} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-green-500/50">
              Capturează fotografia
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">Scanează o frunză pentru identificare</h2>

          {error && <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

          {selectedImage ? (
            <div className="mb-6">
              <div className="relative rounded-2xl overflow-hidden bg-gray-900/50 border border-gray-700/50">
                <img src={selectedImage} alt="Imagine selectată" className="w-full h-96 object-contain" />
              </div>
            </div>
          ) : (
            <div className="mb-6 border-4 border-dashed border-gray-700 rounded-2xl p-12 text-center bg-gray-900/30">
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm border border-green-500/30">
                <Camera className="w-12 h-12 text-green-400" />
              </div>
              <p className="text-gray-400">Nicio imagine selectată</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button onClick={startCamera} className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition shadow-lg shadow-green-500/50 font-semibold transform hover:scale-[1.02]">
              <Camera className="w-5 h-5" />
              <span>Fă o poză</span>
            </button>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="group relative flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl transition shadow-lg shadow-blue-500/50 font-semibold transform hover:scale-[1.02]">
              <Upload className="w-5 h-5" />
              <span>Încarcă imagine</span>
            </button>
          </div>

          {selectedImage && (
            <button onClick={handleScan} disabled={isProcessing} className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl transition shadow-lg shadow-emerald-500/50 font-semibold text-lg transform hover:scale-[1.02] disabled:transform-none disabled:shadow-none">
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Procesare...
                </span>
              ) : 'Analizează planta'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
