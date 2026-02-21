/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  Zap, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle, 
  ArrowLeft, 
  MoreVertical, 
  Coffee, 
  Car, 
  ShoppingBag, 
  Trash2, 
  PlusCircle, 
  Save, 
  Send,
  Calendar,
  Store,
  CreditCard,
  Tag,
  Info,
  RotateCcw,
  Paperclip,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { extractReceiptData, ExtractedReceipt } from './services/gemini';
import { Receipt, AppState, CATEGORIES, CURRENCIES } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [state, setState] = useState<AppState>('LIST');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [currentScan, setCurrentScan] = useState<{ image: string; data: ExtractedReceipt | null } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/receipts');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (Array.isArray(data)) {
        setReceipts(data);
      }
    } catch (err) {
      console.error("Failed to fetch receipts", err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg');
    
    setIsScanning(true);
    setProgress(10);
    
    // Simulate progress while calling Gemini
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 85));
    }, 200);

    const extracted = await extractReceiptData(base64);
    
    clearInterval(interval);
    setProgress(100);
    
    setTimeout(() => {
      setCurrentScan({ image: base64, data: extracted });
      setIsScanning(false);
      setState('REVIEW_DETAIL');
      stopCamera();
    }, 500);
  };

  const saveReceipt = async (receipt: Receipt) => {
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receipt)
      });
      
      if (res.ok) {
        await fetchReceipts();
        setState('LIST');
      } else {
        const errData = await res.json();
        console.error("Failed to save receipt:", errData);
        alert("Failed to save receipt. Please try again.");
      }
    } catch (err) {
      console.error("Failed to save receipt", err);
      alert("Network error. Please check your connection.");
    }
  };

  const deleteReceipt = async (id: number) => {
    try {
      await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      fetchReceipts();
    } catch (err) {
      console.error("Failed to delete receipt", err);
    }
  };

  const handleRetake = () => {
    setCurrentScan(null);
    setState('SCANNING');
    startCamera();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {state === 'SCANNING' && (
          <ScannerView 
            key="scanner"
            videoRef={videoRef}
            canvasRef={canvasRef}
            onClose={() => { setState('LIST'); stopCamera(); }}
            onCapture={captureImage}
            isScanning={isScanning}
            progress={progress}
          />
        )}

        {state === 'REVIEW_DETAIL' && currentScan && (
          <ReviewDetailView 
            key="review"
            image={currentScan.image}
            initialData={currentScan.data}
            onRetake={handleRetake}
            onConfirm={saveReceipt}
          />
        )}

        {state === 'LIST' && (
          <ReceiptListView 
            key="list"
            receipts={receipts}
            onAdd={() => { setState('SCANNING'); startCamera(); }}
            onDelete={deleteReceipt}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Views ---

function ScannerView({ videoRef, canvasRef, onClose, onCapture, isScanning, progress }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden"
    >
      {/* Camera Feed */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover opacity-80"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Scanning Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <div className="absolute inset-0 border-[40px] border-black/40 md:border-[80px]"></div>
        <div className="relative w-72 h-[480px] border-2 border-blue-500/60 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          {/* Corners */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
          
          {/* Scanning Line */}
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 w-full h-1 bg-blue-400/60 shadow-[0_0_15px_rgba(59,130,246,0.8)] opacity-50"
          />
        </div>
      </div>

      {/* Top Bar */}
      <div className="relative z-20 flex items-center justify-between p-6 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors">
          <X size={24} />
        </button>
        <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
          <span className="text-white text-sm font-medium tracking-wide">
            {isScanning ? 'Analyzing...' : 'Scanning...'}
          </span>
        </div>
        <button className="p-2 rounded-full bg-blue-600 text-white backdrop-blur-md">
          <Zap size={24} />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-20 mt-auto flex flex-col items-center gap-8 pb-12 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="text-center px-8">
          <h3 className="text-white text-lg font-bold leading-tight">Align receipt within the frame</h3>
          <p className="text-white/70 text-sm mt-1">Keep the receipt flat for better OCR results</p>
        </div>

        <div className="flex items-center justify-center gap-12 w-full max-w-sm px-6">
          <button className="flex flex-col items-center gap-1 group">
            <div className="size-12 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/20 group-hover:bg-white/20 transition-colors">
              <ImageIcon size={20} />
            </div>
            <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Gallery</span>
          </button>

          <button 
            onClick={onCapture}
            disabled={isScanning}
            className="relative flex items-center justify-center size-20 rounded-full bg-white p-1 shadow-lg shadow-white/10 active:scale-95 transition-transform disabled:opacity-50"
          >
            <div className="size-full rounded-full border-2 border-black/5 flex items-center justify-center">
              <div className="size-[60px] rounded-full border-2 border-blue-600 bg-transparent"></div>
            </div>
          </button>

          <button className="flex flex-col items-center gap-1 group">
            <div className="size-12 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/20 group-hover:bg-white/20 transition-colors">
              <FileText size={20} />
            </div>
            <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">Manual</span>
          </button>
        </div>

        {isScanning && (
          <div className="w-full max-w-[200px] px-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-white/50 text-[10px] font-medium uppercase tracking-widest">Detecting Edges</span>
              <span className="text-blue-400 text-[10px] font-bold">{progress}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
          </div>
        )}
      </div>

      {progress > 80 && !isScanning && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-xl flex items-center gap-2">
            <CheckCircle size={16} />
            Receipt detected
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ReviewDetailView({ image, initialData, onRetake, onConfirm }: any) {
  const [formData, setFormData] = useState<ExtractedReceipt>(initialData || {
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    tax: 0,
    currency: 'INR',
    category: 'Other'
  });

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onRetake} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Review Receipt</h1>
        </div>
        <button className="text-blue-600 font-semibold text-sm">Help</button>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 py-4">
          <div className="relative group">
            <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <img src={image} className="w-full h-full object-cover" alt="Scan" />
            </div>
            <div className="mt-2 flex justify-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Original Scan Reference</span>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Extracted Details</h2>
          
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
              <Store size={18} className="text-blue-600" />
              Merchant Name
            </label>
            <input 
              className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-base font-medium"
              value={formData.merchant}
              onChange={e => setFormData({ ...formData, merchant: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
              <Calendar size={18} className="text-blue-600" />
              Date
            </label>
            <input 
              type="date"
              className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-base font-medium"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
              <CreditCard size={18} className="text-blue-600" />
              Total Amount
            </label>
            <div className="flex">
              <select 
                className="px-3 bg-slate-100 dark:bg-slate-800 border-y border-l border-slate-200 dark:border-slate-700 rounded-l-xl font-bold text-slate-600 dark:text-slate-400 outline-none appearance-none cursor-pointer"
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <input 
                type="number"
                step="0.01"
                className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-r-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-xl font-bold"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
              <Info size={18} className="text-blue-600" />
              Tax Amount (Optional)
            </label>
            <input 
              type="number"
              step="0.01"
              className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-base font-medium"
              placeholder="0.00"
              value={formData.tax || ''}
              onChange={e => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">
              <Tag size={18} className="text-blue-600" />
              Category
            </label>
            <select 
              className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-base font-medium"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              Verify that the amount includes tax. If any details are missing, you can manually enter them above.
            </p>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
          <button 
            onClick={onRetake}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw size={20} />
            Retake
          </button>
          <button 
            onClick={() => onConfirm({ ...formData, image_url: image })}
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <CheckCircle size={20} />
            Confirm
          </button>
        </div>
      </footer>
    </motion.div>
  );
}

function ReceiptListView({ receipts, onAdd, onDelete }: any) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const total = receipts.reduce((acc: number, r: Receipt) => acc + r.amount, 0);
  const totalTax = receipts.reduce((acc: number, r: Receipt) => {
    // Use stored tax if available, otherwise calculate using standard 7% inclusive VAT
    if (r.tax !== undefined && r.tax !== null) return acc + r.tax;
    return acc + (r.amount - (r.amount / 1.07));
  }, 0);
  const avg = receipts.length > 0 ? total / receipts.length : 0;

  // Chart data
  const chartData = receipts.slice(0, 5).reverse().map(r => ({
    name: r.merchant,
    amount: r.amount
  }));

  const getIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'food & drinks': return <Coffee />;
      case 'travel': return <Car />;
      case 'supplies': return <ShoppingBag />;
      default: return <FileText />;
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find(c => c.code === code)?.symbol || '$';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen max-w-md mx-auto bg-white dark:bg-slate-900 shadow-xl"
    >
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4">
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-lg font-semibold">Review Receipts</h1>
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <MoreVertical size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-48">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Scanned Items ({receipts.length})
            </h2>
            <span className="text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle size={12} /> Verified
            </span>
          </div>

          <div className="space-y-3">
            {receipts.map((r: Receipt) => (
              <div key={r.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-600/10 text-blue-600 shrink-0">
                  {getIcon(r.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{r.merchant}</h3>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {getCurrencySymbol(r.currency)}{r.amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {r.category}
                      </p>
                      {r.image_url && (
                        <div className="flex items-center gap-1 text-blue-500">
                          <Paperclip size={12} />
                          <button 
                            onClick={() => setPreviewImage(r.image_url!)}
                            className="hover:underline text-[10px] font-bold uppercase tracking-wider"
                          >
                            Preview
                          </button>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => onDelete(r.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={onAdd}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <PlusCircle size={20} />
            Add Another Receipt
          </button>
        </div>

        {receipts.length > 0 && (
          <div className="p-4 bg-blue-600/5 dark:bg-blue-600/10 rounded-2xl border border-blue-600/10">
            <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Report Summary</h4>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3b82f622" />
                  <Tooltip 
                    cursor={{ fill: '#3b82f611' }}
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#60a5fa' }}
                    formatter={(value: number) => [`${getCurrencySymbol(receipts[0]?.currency || 'INR')}${value.toFixed(2)}`, 'Amount']}
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? '#2563eb' : '#3b82f666'} 
                        className="hover:fill-blue-400 transition-colors duration-200 cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg. per day</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {getCurrencySymbol(receipts[0]?.currency || 'INR')}{avg.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-8 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {getCurrencySymbol(receipts[0]?.currency || 'INR')}{total.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Inclusive of Tax</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              +{getCurrencySymbol(receipts[0]?.currency || 'INR')}{totalTax.toFixed(2)} VAT
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex-1 py-4 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2">
            <Save size={20} />
            Draft
          </button>
          <button className="flex-[2] py-4 px-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            Submit All
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <button 
              className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
              onClick={() => setPreviewImage(null)}
            >
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={previewImage} 
              className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain"
              alt="Receipt Preview"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="mt-4 text-white/60 text-sm font-medium">Tap anywhere to close</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
