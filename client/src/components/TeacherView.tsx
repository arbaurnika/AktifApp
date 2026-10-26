import React, { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import type { Room, Student, Badge } from '../types';
import { AVAILABLE_BADGES } from '../utils/badges';
import { playSound } from '../utils/sound';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Zap, 
  Users, 
  Hand, 
  Award, 
  Share2, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Shuffle, 
  Trash2,
  X,
  ThumbsUp,
  MessageSquare,
  LogOut,
  ArrowRight,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeacherViewProps {
  onExit: () => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ onExit }) => {
  // Session setup
  const [subject, setSubject] = useState('Pancasila & Kewarganegaraan: Kolaborasi Sosial');
  const [groupCount, setGroupCount] = useState(5);
  const [room, setRoom] = useState<Room | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAutoRejoining, setIsAutoRejoining] = useState(false);
  const [isRejoining, setIsRejoining] = useState(false);
  const [rejoinPin, setRejoinPin] = useState('');
  const [rejoinError, setRejoinError] = useState('');
  const [cachedPin, setCachedPin] = useState<string | null>(null);
  const [setupTab, setSetupTab] = useState<'create' | 'rejoin'>('create');
  const [showEndModal, setShowEndModal] = useState(false);

  // Modals & Panels
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedStudentForBadge, setSelectedStudentForBadge] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'relay' | 'mystery' | 'ideas'>('overview');

  // Challenge relay state
  const [relayFrom, setRelayFrom] = useState('');
  const [relayTo, setRelayTo] = useState('');
  const [relayQuestion, setRelayQuestion] = useState('Jelaskan 1 contoh penerapan gotong royong di lingkungan sekolah!');
  const [relayDuration, setRelayDuration] = useState(90);

  // Mystery Picker Wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [mysteryWinner, setMysteryWinner] = useState<Student | null>(null);
  const [mysteryFilterGroup, setMysteryFilterGroup] = useState<string>('ALL');

  // Listen to Socket events
  useEffect(() => {
    const handleRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);
    };

    const handleBuzzerNew = () => {
      playSound.buzz();
    };

    const handleGoalReached = () => {
      playSound.fanfare();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    };

    const handleRelayCelebrate = () => {
      playSound.fanfare();
      confetti({ particleCount: 100, spread: 70 });
    };

    socket.on('room:updated', handleRoomUpdated);
    socket.on('buzzer:new', handleBuzzerNew);
    socket.on('class:goal-reached', handleGoalReached);
    socket.on('relay:celebrate', handleRelayCelebrate);

    return () => {
      socket.off('room:updated', handleRoomUpdated);
      socket.off('buzzer:new', handleBuzzerNew);
      socket.off('class:goal-reached', handleGoalReached);
      socket.off('relay:celebrate', handleRelayCelebrate);
    };
  }, []);

  // Check localStorage for active teacher session on mount (Auto-Recovery)
  useEffect(() => {
    const savedPin = localStorage.getItem('aktifclass_teacher_pin');
    if (savedPin) {
      setCachedPin(savedPin);
      setRejoinPin(savedPin);
      setIsAutoRejoining(true);
      socket.emit('teacher:rejoin', { pin: savedPin }, (res: { success: boolean; room?: Room; error?: string }) => {
        setIsAutoRejoining(false);
        if (res.success && res.room) {
          setRoom(res.room);
          playSound.chime();
        } else {
          localStorage.removeItem('aktifclass_teacher_pin');
          setCachedPin(null);
        }
      });
    }
  }, []);

  // Prevent accidental tab close or page reload when classroom session is live
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (room) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [room]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    const generatedGroups = Array.from({ length: groupCount }, (_, i) => `Kelompok ${i + 1}`);

    socket.emit('teacher:create-room', {
      subject: subject.trim(),
      groups: generatedGroups
    }, (res: { success: boolean; room: Room }) => {
      setIsCreating(false);
      if (res.success) {
        setRoom(res.room);
        localStorage.setItem('aktifclass_teacher_pin', res.room.pin);
        setCachedPin(res.room.pin);
        if (generatedGroups.length >= 2) {
          setRelayFrom(generatedGroups[0]);
          setRelayTo(generatedGroups[1]);
        }
        playSound.chime();
      }
    });
  };

  const handleManualRejoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejoinPin.trim()) return;
    setRejoinError('');
    setIsRejoining(true);

    socket.emit('teacher:rejoin', { pin: rejoinPin.trim() }, (res: { success: boolean; room?: Room; error?: string }) => {
      setIsRejoining(false);
      if (res.success && res.room) {
        setRoom(res.room);
        localStorage.setItem('aktifclass_teacher_pin', res.room.pin);
        setCachedPin(res.room.pin);
        playSound.chime();
      } else {
        setRejoinError(res.error || 'Sesi kelas tidak ditemukan. Pastikan 6 digit PIN benar.');
      }
    });
  };

  const handleEndSession = () => {
    if (!room) return;
    socket.emit('teacher:end-session', { pin: room.pin }, () => {
      localStorage.removeItem('aktifclass_teacher_pin');
      setCachedPin(null);
      setShowEndModal(false);
      // Automatically trigger Excel report download for teacher
      window.location.href = `/api/sessions/${room.pin}/export`;
      onExit();
    });
  };

  const handleClearBuzzer = () => {
    if (!room) return;
    socket.emit('teacher:clear-buzzer', { pin: room.pin });
  };

  const handleAddPoints = (targetType: 'student' | 'group', targetId: string, points: number, reason: string, badge?: Badge) => {
    if (!room) return;
    playSound.chime();
    socket.emit('teacher:add-points', {
      pin: room.pin,
      targetType,
      targetId,
      points,
      reason,
      badge
    });
  };

  const handleStartRelay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    const from = relayFrom || room.groups[0]?.name;
    const to = relayTo || room.groups[1]?.name || room.groups[0]?.name;
    if (!from || !to) return;

    socket.emit('relay:start', {
      pin: room.pin,
      fromGroup: from,
      toGroup: to,
      question: relayQuestion.trim(),
      durationSeconds: relayDuration
    });
    playSound.relayAlert();
  };

  const handleCompleteRelay = () => {
    if (!room) return;
    socket.emit('relay:complete', {
      pin: room.pin,
      responseText: 'Diverifikasi langsung oleh guru di kelas',
      bonusPoints: 20
    });
  };

  const handleSpinMystery = () => {
    if (!room || isSpinning) return;
    const allStudents = Object.values(room.students);
    const pool = mysteryFilterGroup === 'ALL' 
      ? allStudents 
      : allStudents.filter(s => s.group === mysteryFilterGroup);

    if (pool.length === 0) {
      alert('Belum ada siswa dalam kategori ini!');
      return;
    }

    setIsSpinning(true);
    setMysteryWinner(null);

    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * pool.length);
      setMysteryWinner(pool[randomIdx]);
      counter++;
      if (counter > 20) {
        clearInterval(interval);
        const finalWinner = pool[Math.floor(Math.random() * pool.length)];
        setMysteryWinner(finalWinner);
        setIsSpinning(false);
        playSound.fanfare();
        confetti({ particleCount: 70, spread: 60 });
        socket.emit('mystery:spin', { pin: room.pin, selectedStudent: finalWinner });
      }
    }, 100);
  };

  const handleAdjustEnergy = (delta: number) => {
    if (!room) return;
    socket.emit('teacher:adjust-energy', { pin: room.pin, delta });
  };

  // Student joining link
  const currentHost = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
  const joinUrl = `http://${currentHost}/?pin=${room?.pin || ''}`;

  // If recovering session, show loading state
  if (isAutoRejoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30 animate-pulse">
            <Zap className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Memulihkan Sesi Kelas...</h2>
          <p className="text-xs text-slate-400">Menyambungkan kembali kendali guru ke PIN {cachedPin}</p>
        </div>
      </div>
    );
  }

  // If no room created yet, show Create / Rejoin Screen
  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3 border border-indigo-500/30">
              <Sparkles className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Ruang Kendali Guru</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              AktifClass: Pengukur Keaktifan & Kolaborasi Berbasis Zero-Login
            </p>
          </div>

          {/* Quick Resume Banner if previous PIN was stored */}
          {cachedPin && (
            <div className="mb-5 p-3.5 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 rounded-2xl flex items-center justify-between gap-3 text-left">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">Sesi Aktif Terdeteksi</span>
                <span className="text-base font-bold text-white font-mono tracking-wider">PIN: {cachedPin}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejoinPin(cachedPin);
                  setIsRejoining(true);
                  socket.emit('teacher:rejoin', { pin: cachedPin }, (res: { success: boolean; room?: Room; error?: string }) => {
                    setIsRejoining(false);
                    if (res.success && res.room) {
                      setRoom(res.room);
                      playSound.chime();
                    } else {
                      localStorage.removeItem('aktifclass_teacher_pin');
                      setCachedPin(null);
                      setRejoinError(res.error || 'Sesi kelas tidak ditemukan.');
                    }
                  });
                }}
                disabled={isRejoining}
                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <span>{isRejoining ? 'Menyambung...' : 'Lanjutkan Kelas'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mode Switch Tabs */}
          <div className="flex border border-slate-800 rounded-xl p-1 bg-slate-950/60 mb-5">
            <button
              type="button"
              onClick={() => setSetupTab('create')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                setupTab === 'create' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Buka Sesi Kelas Baru
            </button>
            <button
              type="button"
              onClick={() => setSetupTab('rejoin')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                setupTab === 'rejoin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sambung Kembali via PIN
            </button>
          </div>

          {setupTab === 'create' ? (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-1.5">
                  Topik / Mata Pelajaran
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Misal: Biologi - Struktur Sel / Informatika - Algoritma"
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none transition text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-1.5">
                  Jumlah Kelompok Siswa
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={2}
                    max={10}
                    value={groupCount}
                    onChange={(e) => setGroupCount(Number(e.target.value))}
                    className="flex-1 accent-indigo-500 cursor-pointer"
                  />
                  <span className="w-12 text-center text-sm font-bold bg-slate-800 py-1.5 px-2 rounded-lg border border-slate-700 text-indigo-300">
                    {groupCount} Kel.
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aplikasi akan otomatis menyiapkan Kelompok 1 s.d Kelompok {groupCount}
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCreating ? (
                  <span>Menyiapkan Ruangan...</span>
                ) : (
                  <>
                    <span>Buka Kelas & Tampilkan QR Proyektor</span>
                    <Share2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManualRejoin} className="space-y-4">
              {rejoinError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rejoinError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-1.5">
                  Masukkan 6 Digit PIN Kelas
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={rejoinPin}
                  onChange={(e) => setRejoinPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Misal: 749201"
                  className="w-full text-center text-2xl font-mono tracking-widest bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-3 text-white placeholder-slate-600 outline-none transition"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Gunakan ini jika kamu tidak sengaja menutup tab atau ingin mengambil alih kendali kelas dari laptop/HP lain.
                </p>
              </div>

              <button
                type="submit"
                disabled={isRejoining || rejoinPin.trim().length !== 6}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRejoining ? (
                  <span>Menyambungkan ke Kelas...</span>
                ) : (
                  <>
                    <span>Sambung Kembali ke Kelas</span>
                    <KeyRound className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={onExit}
              className="text-xs text-slate-500 hover:text-slate-300 transition cursor-pointer"
            >
              Kembali ke Menu Awal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const studentsList = Object.values(room.students);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar for Projector & Teacher Control */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-base sm:text-lg leading-tight">
                  {room.subject}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {studentsList.length} Siswa Terhubung • {room.groups.length} Kelompok
              </p>
            </div>
          </div>

          {/* Sesi PIN & QR Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              onClick={() => setShowQRModal(true)}
              className="bg-slate-800/90 hover:bg-slate-750 border border-indigo-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2.5 cursor-pointer shadow-sm transition"
              title="Klik untuk memperbesar QR Code di Proyektor"
            >
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  PIN KELAS
                </span>
                <span className="text-lg sm:text-xl font-mono font-extrabold text-indigo-300 tracking-wider">
                  {room.pin}
                </span>
              </div>
              <div className="bg-white p-1 rounded-lg">
                <QRCodeSVG value={joinUrl} size={32} />
              </div>
            </div>

            <button
              onClick={() => setShowEndModal(true)}
              className="bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Akhiri Pembelajaran & Unduh Rekap Excel"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Akhiri Kelas</span>
            </button>

            <a
              href={`/api/sessions/${room.pin}/export`}
              download
              className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition"
              title="Download Rekap Nilai Format Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </a>

            <button
              onClick={onExit}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Keluar ke Menu Utama (Sesi tetap aktif di latar belakang)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col space-y-6">
        {/* HERO SECTION: CLASS ENERGY METER (Target Keaktifan Bersama) */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Target Energi Keaktifan Kelas
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Mendorong seluruh kelas berkolaborasi untuk mencapai 100% dan membuka reward bersama!
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-amber-300 to-emerald-300 font-mono">
                {room.classEnergy}%
              </span>
              <div className="flex flex-col gap-1 ml-2">
                <button
                  onClick={() => handleAdjustEnergy(5)}
                  className="bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs px-2 py-0.5 rounded border border-slate-700 font-bold"
                  title="Tambah 5% Energi Manual"
                >
                  +5%
                </button>
                <button
                  onClick={() => handleAdjustEnergy(-5)}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs px-2 py-0.5 rounded border border-slate-700 font-bold"
                  title="Kurangi 5% Energi Manual"
                >
                  -5%
                </button>
              </div>
            </div>
          </div>

          {/* Big Progress Bar */}
          <div className="h-5 sm:h-6 w-full bg-slate-950 rounded-full p-1 border border-slate-800/80 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-700 shadow-lg shadow-indigo-500/30"
              style={{ width: `${Math.min(100, room.classEnergy)}%` }}
            />
          </div>

          {/* Motivational Prompt */}
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span>
              {room.classEnergy >= 100 
                ? '🎉 LUAR BIASA! Target Keaktifan Kelas Hari Ini Tercapai Penuh!' 
                : `⚡ Butuh ${100 - room.classEnergy}% lagi untuk mencapai target kelas`}
            </span>
            <span className="hidden sm:inline text-slate-500">
              *Tiap ide, pertanyaan, dan estafet menaikkan energi kelas
            </span>
          </div>
        </section>

        {/* NAVIGATION TABS */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'overview', label: 'Dashboard & Buzzer', icon: Hand },
            { id: 'relay', label: 'Estafet Tantangan', icon: Zap },
            { id: 'mystery', label: 'Roda Acak Siswa', icon: Shuffle },
            { id: 'students', label: 'Matriks Nilai & Siswa', icon: Users },
            { id: 'ideas', label: `Papan Gagasan (${room.ideas.length})`, icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT 1: OVERVIEW & LIVE BUZZER */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Live Buzzer Queue */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Hand className="w-5 h-5 text-rose-400" />
                    <h3 className="font-bold text-white text-base">
                      Antrean Angkat Tangan Siswa (Buzzer)
                    </h3>
                  </div>
                  {room.buzzerQueue.length > 0 && (
                    <button
                      onClick={handleClearBuzzer}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Bersihkan Antrean</span>
                    </button>
                  )}
                </div>

                {room.buzzerQueue.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6">
                    <Hand className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-slate-400 font-medium">Belum ada siswa yang menekan buzzer</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Siswa dapat memencet tombol "Buzzer" di HP mereka untuk berebut giliran menjawab!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {room.buzzerQueue.map((item, index) => {
                      const studentObj = room.students[item.studentId];
                      return (
                        <div
                          key={item.studentId + item.timestamp}
                          className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-fadeIn"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono font-extrabold flex items-center justify-center text-sm">
                              #{index + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm">{item.studentName}</h4>
                              <p className="text-xs text-indigo-400">{item.group}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleAddPoints('student', item.studentId, 10, 'Jawaban Sangat Baik (Buzzer)')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                              title="Beri +10 Poin"
                            >
                              +10 Poin
                            </button>
                            <button
                              onClick={() => handleAddPoints('student', item.studentId, 5, 'Keberanian Mencoba (Buzzer)')}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                              title="Beri +5 Poin"
                            >
                              +5 Poin
                            </button>
                            {studentObj && (
                              <button
                                onClick={() => setSelectedStudentForBadge(studentObj)}
                                className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 font-semibold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                                title="Beri Lencana"
                              >
                                <Award className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Group Collaboration Scoreboard */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Skor Kolaborasi Antar Kelompok
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {room.groups.map((grp) => {
                    const memberCount = studentsList.filter(s => s.group === grp.name).length;
                    return (
                      <div
                        key={grp.id}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-sm text-white block">{grp.name}</span>
                          <span className="text-[11px] text-slate-500">
                            {memberCount} Siswa • {grp.relaysCompleted || 0} Estafet
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-amber-400 font-mono">
                            {grp.score} pts
                          </span>
                          <button
                            onClick={() => handleAddPoints('group', grp.name, 10, 'Bonus Kolaborasi Tim')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg border border-slate-700 text-xs font-bold"
                            title="Tambah 10 Poin ke Kelompok"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Column 3: Live Activity Stream */}
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg h-full flex flex-col">
                <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Aktivitas Kelas Real-Time
                </h3>
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-1">
                  {room.activityLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4">Belum ada aktivitas</p>
                  ) : (
                    room.activityLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 text-xs"
                      >
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                          <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="uppercase font-semibold tracking-wider text-indigo-400">{log.type}</span>
                        </div>
                        <p className="text-slate-200">{log.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT 2: ESTAFET TANTANGAN (CHALLENGE RELAY) */}
        {activeTab === 'relay' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Panel Pengaturan Estafet */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Lempar Estafet Tantangan</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Kelompok yang aktif dapat menantang kelompok lain untuk menanggapi, memecahkan kasus, atau melanjutkan argumen.
              </p>

              <form onSubmit={handleStartRelay} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Dari Kelompok (Penantang):
                    </label>
                    <select
                      value={relayFrom || (room.groups[0]?.name || '')}
                      onChange={(e) => setRelayFrom(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {room.groups.map(g => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Ke Kelompok (Penerima):
                    </label>
                    <select
                      value={relayTo || (room.groups[1]?.name || room.groups[0]?.name || '')}
                      onChange={(e) => setRelayTo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    >
                      {room.groups.map(g => (
                        <option key={g.id} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pertanyaan / Kasus Tantangan:
                  </label>
                  <textarea
                    value={relayQuestion}
                    onChange={(e) => setRelayQuestion(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batas Waktu Menjawab:
                  </label>
                  <div className="flex gap-2">
                    {[60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setRelayDuration(sec)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-semibold border ${
                          relayDuration === sec
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {sec} Detik
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Nyalakan Estafet Tantangan Sekarang!</span>
                </button>
              </form>
            </div>

            {/* Status Estafet Aktif */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Status Estafet Langsung
                </h3>

                {room.activeRelay && room.activeRelay.status === 'active' ? (
                  <div className="bg-slate-950/90 border-2 border-amber-500/60 rounded-2xl p-5 space-y-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        ⚡ Estafet Berlangsung
                      </span>
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                        Bonus +20 Poin
                      </span>
                    </div>

                    <div className="text-sm">
                      <span className="text-slate-400">Tantangan Dari: </span>
                      <span className="font-bold text-white">{room.activeRelay.fromGroup}</span>
                      <span className="text-slate-400"> Menuju: </span>
                      <span className="font-extrabold text-amber-300 text-base">{room.activeRelay.toGroup}</span>
                    </div>

                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-sm text-slate-200">
                      "{room.activeRelay.question}"
                    </div>

                    <p className="text-xs text-slate-400 italic">
                      Layar HP anggota {room.activeRelay.toGroup} sekarang sedang bergetar & menampilkan kotak jawaban!
                    </p>

                    <button
                      onClick={handleCompleteRelay}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verifikasi Jawaban & Beri Poin (+20)</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6">
                    <Zap className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-slate-400 font-medium">Tidak ada estafet yang sedang aktif</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Gunakan formulir di sebelah kiri untuk melempar estafet tantangan baru antar kelompok.
                    </p>
                  </div>
                )}
              </div>

              {/* Tips Pedagogis */}
              <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl text-xs text-slate-300">
                <span className="font-bold text-indigo-300">💡 Nilai Inovasi: </span>
                Estafet tantangan memancing kelompok pasif untuk bersiap karena mereka bisa ditunjuk kapan saja oleh kelompok teman sebayanya secara sportif.
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT 3: MYSTERY PICKER (RODA ACAK PERWAKILAN) */}
        {activeTab === 'mystery' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg max-w-2xl mx-auto w-full text-center">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3 border border-indigo-500/30">
              <Shuffle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Roda Acak Perwakilan Siswa</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Mengatasi siswa pasif yang "numpang nama" dengan memilih perwakilan pemapar secara acak dari anggota kelompok.
            </p>

            <div className="mt-4 flex justify-center items-center gap-2">
              <span className="text-xs text-slate-400">Filter Siswa:</span>
              <select
                value={mysteryFilterGroup}
                onChange={(e) => setMysteryFilterGroup(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
              >
                <option value="ALL">Semua Siswa Terdaftar</option>
                {room.groups.map(g => (
                  <option key={g.id} value={g.name}>Khusus {g.name}</option>
                ))}
              </select>
            </div>

            {/* Display Area */}
            <div className="my-8 p-8 bg-slate-950/80 border-2 border-indigo-500/40 rounded-3xl min-h-[160px] flex flex-col items-center justify-center shadow-inner">
              {mysteryWinner ? (
                <div className={`space-y-2 ${isSpinning ? 'opacity-70 scale-95' : 'scale-105 transition-transform'}`}>
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                    {isSpinning ? 'Memutar Acak...' : '🎯 SISWA TERPILIH:'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {mysteryWinner.name}
                  </h2>
                  <div className="inline-block bg-indigo-600/30 border border-indigo-500/40 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300">
                    {mysteryWinner.group}
                  </div>
                </div>
              ) : (
                <div className="text-slate-600 text-sm">
                  Tekan tombol di bawah untuk mengundi nama perwakilan
                </div>
              )}
            </div>

            <button
              onClick={handleSpinMystery}
              disabled={isSpinning || studentsList.length === 0}
              className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold py-3.5 px-8 rounded-2xl shadow-xl shadow-indigo-600/30 transition text-sm cursor-pointer disabled:opacity-40"
            >
              {isSpinning ? 'Sedang Memutar Roda...' : '🎲 PUTAR RODA ACAK SEKARANG'}
            </button>
          </div>
        )}

        {/* TAB CONTENT 4: SISWA & RUBRIK PENILAIAN */}
        {activeTab === 'students' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base">Daftar Keaktifan Siswa Real-Time</h3>
                <p className="text-xs text-slate-400">1-Tap untuk menambah poin keaktifan atau memberikan lencana</p>
              </div>
              <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700">
                Total: {studentsList.length} Siswa
              </span>
            </div>

            {studentsList.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-slate-400 font-medium">Belum ada siswa yang bergabung</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Minta siswa scan QR Code atau buka alamat web lalu masukkan PIN {room.pin}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">Kelompok</th>
                      <th className="p-3">Total Poin</th>
                      <th className="p-3">Buzzer / Ide</th>
                      <th className="p-3">Lencana</th>
                      <th className="p-3 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {studentsList.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-semibold text-white">
                          {st.name}
                        </td>
                        <td className="p-3 text-indigo-400 font-medium">
                          {st.group}
                        </td>
                        <td className="p-3 font-bold text-amber-400 font-mono text-sm">
                          {st.points || 0}
                        </td>
                        <td className="p-3 text-slate-400">
                          {st.buzzCount || 0} buzz • {st.ideasCount || 0} ide
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(st.badges || []).map(b => (
                              <span key={b.id} title={b.name} className="text-sm">
                                {b.icon}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleAddPoints('student', st.id, 5, 'Keaktifan Kelas')}
                              className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-2 py-1 rounded text-[11px] font-bold"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleAddPoints('student', st.id, 10, 'Jawaban Solutif')}
                              className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded text-[11px] font-bold"
                            >
                              +10
                            </button>
                            <button
                              onClick={() => setSelectedStudentForBadge(st)}
                              className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 p-1 rounded"
                              title="Beri Lencana"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 5: PAPAN GAGASAN (THOUGHT STREAM) */}
        {activeTab === 'ideas' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Gagasan & Solusi Siswa</h3>
                <p className="text-xs text-slate-400">
                  Semua ide yang dikirimkan oleh siswa, diurutkan berdasarkan apresiasi terbanyak
                </p>
              </div>
              <span className="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full font-semibold">
                {room.ideas.length} Ide Masuk
              </span>
            </div>

            {room.ideas.length === 0 ? (
              <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6">
                <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-slate-400 font-medium">Belum ada ide yang dikirimkan</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {room.ideas.map((idea) => (
                  <div
                    key={idea.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 flex flex-col justify-between transition"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-white text-xs">{idea.authorName}</span>
                          <span className="text-[10px] text-slate-500 ml-2">({idea.group})</span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-400 text-xs font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{idea.upvotes}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed mb-3">
                        "{idea.content}"
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        {idea.realName !== idea.authorName ? `Penulis asli: ${idea.realName}` : 'Nama asli'}
                      </span>
                      <button
                        onClick={() => handleAddPoints('student', idea.studentId, 10, 'Apresiasi Ide Terbaik Guru')}
                        className="text-amber-400 hover:text-amber-300 font-semibold"
                      >
                        Beri Bonus +10 Pts
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: QR CODE BESAR UNTUK PROYEKTOR */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative shadow-2xl">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white">Scan untuk Masuk Kelas</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Arahkan kamera HP ke layar untuk langsung masuk tanpa perlu instalasi
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mb-5">
              <QRCodeSVG value={joinUrl} size={220} />
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-semibold block mb-0.5">
                KODE PIN KELAS
              </span>
              <span className="text-3xl font-mono font-extrabold text-indigo-400 tracking-widest">
                {room.pin}
              </span>
            </div>

            <div className="mt-4 text-xs text-slate-400 truncate">
              Link: <span className="text-indigo-400 underline">{joinUrl}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BERIKAN LENCANA (BADGE) */}
      {selectedStudentForBadge && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-white text-base">Berikan Lencana</h4>
                <p className="text-xs text-slate-400">Untuk {selectedStudentForBadge.name}</p>
              </div>
              <button
                onClick={() => setSelectedStudentForBadge(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {AVAILABLE_BADGES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    handleAddPoints('student', selectedStudentForBadge.id, 15, `Pemberian Lencana ${b.name}`, b);
                    setSelectedStudentForBadge(null);
                  }}
                  className="w-full bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3 text-left transition flex items-center gap-3 cursor-pointer"
                >
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <h5 className="font-bold text-white text-xs">{b.name}</h5>
                    <p className="text-[11px] text-slate-400">{b.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI AKHIRI SESI KELAS */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center relative shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <LogOut className="w-7 h-7 text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Akhiri Sesi Pembelajaran?</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Siswa di kelas akan diberi notifikasi bahwa sesi telah selesai. Rekapitulasi keaktifan kelas akan otomatis diunduh dalam format Excel.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Lanjutkan Kelas
              </button>
              <button
                type="button"
                onClick={handleEndSession}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Ya, Akhiri & Unduh Rekap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
