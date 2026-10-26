import React, { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import type { Student, Room, RelayChallenge } from '../types';
import { playSound } from '../utils/sound';
import { 
  Hand, 
  Send, 
  ThumbsUp, 
  Zap, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentViewProps {
  initialPin?: string;
  onExit: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ initialPin = '', onExit }) => {
  // Join form state
  const [pin, setPin] = useState(initialPin);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Kelompok 1');
  const [customGroup, setCustomGroup] = useState('');
  const [availableGroups, setAvailableGroups] = useState<string[]>([
    'Kelompok 1', 'Kelompok 2', 'Kelompok 3', 'Kelompok 4', 'Kelompok 5', 'Kelompok 6'
  ]);
  const [hasJoined, setHasJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Room & Student state
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  // Interaction state
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzPosition, setBuzzPosition] = useState<number | null>(null);
  const [ideaContent, setIdeaContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSendingIdea, setIsSendingIdea] = useState(false);
  const [relayResponseText, setRelayResponseText] = useState('');
  const [activeTab, setActiveTab] = useState<'buzzer' | 'ideas' | 'team'>('buzzer');
  const [isClassEnded, setIsClassEnded] = useState(false);
  const [endMessage, setEndMessage] = useState('');

  // Load cached student info from localStorage if available
  useEffect(() => {
    const cached = localStorage.getItem('aktifclass_student');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.name) setName(parsed.name);
        if (parsed.group) {
          if (parsed.group.startsWith('Kelompok')) {
            setGroup(parsed.group);
          } else {
            setGroup('__custom__');
            setCustomGroup(parsed.group);
          }
        }
        if (parsed.pin && !initialPin) setPin(parsed.pin);
      } catch {}
    }
  }, [initialPin]);

  // Dynamically load room groups from teacher's session if available
  useEffect(() => {
    const cleanPin = pin.trim();
    if (cleanPin.length === 6) {
      fetch(`/api/sessions/${cleanPin}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && Array.isArray(data.groups) && data.groups.length > 0) {
            const serverGroups = data.groups.map((g: { name: string }) => g.name);
            setAvailableGroups(serverGroups);
            setGroup(prev => {
              if (prev === '__custom__') return prev;
              if (serverGroups.includes(prev)) return prev;
              if (prev && !prev.startsWith('Kelompok')) {
                setCustomGroup(prev);
                return '__custom__';
              }
              return serverGroups[0] || 'Kelompok 1';
            });
          }
        })
        .catch(() => {});
    }
  }, [pin]);

  // Setup Socket listeners
  useEffect(() => {
    const handleRoomUpdated = (updatedRoom: Room) => {
      setRoom(updatedRoom);

      // Update current student data
      if (socket.id && updatedRoom.students[socket.id]) {
        setCurrentStudent(updatedRoom.students[socket.id]);
      }

      // Check buzzer status
      if (socket.id) {
        const queueIndex = updatedRoom.buzzerQueue.findIndex(b => b.studentId === socket.id);
        if (queueIndex >= 0) {
          setHasBuzzed(true);
          setBuzzPosition(queueIndex + 1);
        } else {
          setHasBuzzed(false);
          setBuzzPosition(null);
        }
      }
    };

    const handleRelayAlert = (relay: RelayChallenge) => {
      if (currentStudent && relay.toGroup === currentStudent.group) {
        playSound.relayAlert();
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 300]);
      }
    };

    const handleGoalReached = () => {
      playSound.fanfare();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    };

    const handleClassEnded = (data: { message?: string }) => {
      setIsClassEnded(true);
      if (data.message) setEndMessage(data.message);
      playSound.fanfare();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    };

    socket.on('room:updated', handleRoomUpdated);
    socket.on('relay:alert', handleRelayAlert);
    socket.on('class:goal-reached', handleGoalReached);
    socket.on('class:ended', handleClassEnded);

    return () => {
      socket.off('room:updated', handleRoomUpdated);
      socket.off('relay:alert', handleRelayAlert);
      socket.off('class:goal-reached', handleGoalReached);
      socket.off('class:ended', handleClassEnded);
    };
  }, [currentStudent]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || !name.trim()) {
      setJoinError('Silakan masukkan Kode PIN dan Nama kamu.');
      return;
    }

    if (group === '__custom__' && !customGroup.trim()) {
      setJoinError('Silakan ketik nama kelompok kamu.');
      return;
    }

    setJoinError('');
    setIsJoining(true);
    const selectedGroup = group === '__custom__' ? customGroup.trim() : group;

    socket.emit('student:join', { pin: pin.trim(), name: name.trim(), group: selectedGroup }, (res: { success: boolean; student?: Student; room?: Room; error?: string }) => {
      setIsJoining(false);
      if (res.success && res.student && res.room) {
        setCurrentStudent(res.student);
        setRoom(res.room);
        setHasJoined(true);
        playSound.chime();

        // Cache in localStorage for easy reconnection
        localStorage.setItem('aktifclass_student', JSON.stringify({
          name: res.student.name,
          group: res.student.group,
          pin: pin.trim()
        }));
      } else {
        setJoinError(res.error || 'Gagal masuk kelas. Coba periksa kembali Kode PIN.');
      }
    });
  };

  const handleBuzz = () => {
    if (hasBuzzed || !room) return;
    playSound.buzz();
    if ('vibrate' in navigator) navigator.vibrate(100);

    socket.emit('student:buzz', { pin: room.pin }, (res: { success: boolean; queuePosition?: number }) => {
      if (res.success) {
        setHasBuzzed(true);
        if (res.queuePosition) setBuzzPosition(res.queuePosition);
      }
    });
  };

  const handleSubmitIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaContent.trim() || !room || isSendingIdea) return;

    setIsSendingIdea(true);
    socket.emit('student:submit-idea', {
      pin: room.pin,
      content: ideaContent.trim(),
      isAnonymous
    }, (res: { success: boolean }) => {
      setIsSendingIdea(false);
      if (res.success) {
        setIdeaContent('');
        playSound.chime();
      }
    });
  };

  const handleUpvoteIdea = (ideaId: string) => {
    if (!room) return;
    playSound.chime();
    socket.emit('student:upvote-idea', { pin: room.pin, ideaId });
  };

  const handleRelaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relayResponseText.trim() || !room) return;

    socket.emit('relay:complete', {
      pin: room.pin,
      responseText: relayResponseText.trim(),
      bonusPoints: 20
    });
    setRelayResponseText('');
    playSound.fanfare();
    confetti({ particleCount: 80, spread: 60 });
  };

  // If class ended by teacher, show completion summary
  if (isClassEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mb-1">Kelas Selesai! 🎉</h2>
          <p className="text-xs text-slate-400 mb-6">
            {endMessage || 'Sesi pembelajaran telah diakhiri oleh Guru. Terima kasih atas partisipasi aktifmu!'}
          </p>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Nama Siswa:</span>
              <span className="font-bold text-white">{currentStudent?.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Kelompok:</span>
              <span className="font-bold text-indigo-400">{currentStudent?.group}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Total Poin Keaktifan:</span>
              <span className="font-extrabold text-amber-400 text-sm">{currentStudent?.points || 0} pts</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Buzzer / Ide:</span>
              <span className="text-slate-300">{currentStudent?.buzzCount || 0} buzz • {currentStudent?.ideasCount || 0} ide</span>
            </div>
          </div>

          {currentStudent && currentStudent.badges && currentStudent.badges.length > 0 && (
            <div className="mb-6">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Lencana Penghargaan:</span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {currentStudent.badges.map(b => (
                  <span key={b.id} className="bg-slate-800 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs text-white flex items-center gap-1">
                    <span>{b.icon}</span> <span>{b.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              localStorage.removeItem('aktifclass_student');
              onExit();
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition cursor-pointer text-xs"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // If not joined, show Clean Zero-Login Join Screen
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3 border border-indigo-500/30">
              <Zap className="w-7 h-7 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Masuk Ruang Kelas</h1>
            <p className="text-sm text-slate-400 mt-1">Tanpa perlu registrasi akun & password</p>
          </div>

          {joinError && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-1.5">
                Kode PIN Kelas (6 Digit)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Misal: 749201"
                className="w-full text-center text-2xl font-mono tracking-widest bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl py-3 text-white placeholder-slate-600 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-1.5">
                Nama Lengkap / Panggilan
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Dimas Aditya"
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 outline-none transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-300 tracking-wider mb-1.5">
                Pilih Kelompok
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {availableGroups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => { setGroup(grp); setCustomGroup(''); }}
                    className={`py-2 px-1 text-xs rounded-lg font-medium border transition text-center truncate ${
                      group === grp 
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setGroup('__custom__')}
                className={`text-xs w-full py-2 rounded-lg font-medium border text-center transition ${
                  group === '__custom__'
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
                }`}
              >
                Atau Ketik Nama Kelompok Sendiri...
              </button>

              {group === '__custom__' && (
                <input
                  type="text"
                  value={customGroup}
                  onChange={(e) => setCustomGroup(e.target.value)}
                  placeholder="Contoh: Tim Garuda / Kelompok Alpha"
                  className="mt-2 w-full bg-slate-950/80 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 outline-none text-xs"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isJoining ? (
                <span>Menghubungkan ke Kelas...</span>
              ) : (
                <>
                  <span>Masuk Kelas Sekarang</span>
                  <Sparkles className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              onClick={onExit}
              className="text-xs text-slate-500 hover:text-slate-300 transition"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Student Screen
  const isRelayTarget = room?.activeRelay && room.activeRelay.status === 'active' && room.activeRelay.toGroup === currentStudent?.group;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto pb-24 shadow-2xl">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              {currentStudent?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight truncate max-w-[180px]">
                {currentStudent?.name}
              </h2>
              <span className="text-xs text-indigo-400 font-medium">
                {currentStudent?.group}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300">
              {currentStudent?.points || 0} pts
            </span>
          </div>
        </div>

        {/* Class Energy Mini-Bar */}
        <div className="mt-3 pt-2 border-t border-slate-800/60">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400 flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Energi Kelas
            </span>
            <span className="font-bold text-indigo-300">{room?.classEnergy || 0}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, room?.classEnergy || 0)}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1 flex flex-col space-y-4">
        {/* FLASHING ALERT: CHALLENGE RELAY TARGET */}
        {isRelayTarget && (
          <div className="p-4 bg-gradient-to-r from-amber-600/30 to-rose-600/30 border-2 border-amber-500/80 rounded-2xl shadow-xl shadow-amber-500/10 animate-pulse">
            <div className="flex items-center gap-2 text-amber-300 text-sm font-bold mb-1">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>KELOMPOK KAMU DITANTANG!</span>
            </div>
            <p className="text-xs text-slate-300 mb-2">
              Tantangan dari <span className="font-semibold text-white">{room?.activeRelay?.fromGroup}</span>:
            </p>
            <div className="bg-slate-900/90 p-3 rounded-xl border border-amber-500/40 text-sm text-white font-medium mb-3">
              "{room?.activeRelay?.question}"
            </div>

            <form onSubmit={handleRelaySubmit} className="space-y-2">
              <textarea
                value={relayResponseText}
                onChange={(e) => setRelayResponseText(e.target.value)}
                rows={2}
                placeholder="Tuliskan jawaban kelompokmu di sini..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                required
              />
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kirim Jawaban & Klaim +20 Poin!</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 1: BUZZER / ANGKAT TANGAN DIGITAL */}
        {activeTab === 'buzzer' && (
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-white">Angkat Tangan Cepat</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pencet tombol jika ingin bertanya atau menjawab
              </p>
            </div>

            {/* GIANT BUZZER BUTTON */}
            <div className="relative mb-6">
              <button
                onClick={handleBuzz}
                disabled={hasBuzzed}
                className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center gap-2 font-bold text-white shadow-2xl transition-all duration-200 cursor-pointer ${
                  hasBuzzed
                    ? 'bg-emerald-600/30 border-4 border-emerald-500 text-emerald-300 scale-95 shadow-emerald-500/20'
                    : 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 border-4 border-rose-400/80 hover:scale-105 active:scale-95 shadow-rose-600/40 animate-pulse-ring'
                }`}
              >
                <Hand className={`w-16 h-16 ${hasBuzzed ? 'text-emerald-400' : 'text-white'}`} />
                <span className="text-base tracking-wider uppercase font-extrabold">
                  {hasBuzzed ? 'ANTREAN #' + buzzPosition : 'BUZZ SEKARANG!'}
                </span>
              </button>
            </div>

            {hasBuzzed ? (
              <div className="text-center bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 rounded-2xl max-w-xs">
                <p className="text-xs text-emerald-400 font-semibold">
                  Tanganmu sudah terangkat!
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Guru sedang melihat antrean di layar proyektor. Bersiaplah menjawab!
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center max-w-xs">
                Inisiatif angkat tangan secara otomatis menambahkan +2% energi keaktifan untuk kelasmu!
              </p>
            )}

            {/* Badges Earned Section */}
            {currentStudent && currentStudent.badges && currentStudent.badges.length > 0 && (
              <div className="mt-8 w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  <Award className="w-4 h-4" /> Lencana Penghargaan Kamu
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentStudent.badges.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-800/90 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-white"
                      title={b.description}
                    >
                      <span>{b.icon}</span>
                      <span className="font-medium">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IDE & TANGGAPAN (THOUGHT STREAM + UPVOTING) */}
        {activeTab === 'ideas' && (
          <div className="space-y-4">
            {/* Input Ide Card */}
            <form onSubmit={handleSubmitIdea} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Berbagi Gagasan & Solusi
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                  />
                  <span>Anonim 🕵️</span>
                </label>
              </div>

              <textarea
                value={ideaContent}
                onChange={(e) => setIdeaContent(e.target.value)}
                placeholder="Tuliskan pendapat, ide, atau pertanyaan tanpa takut salah..."
                rows={3}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-600 outline-none resize-none"
                required
              />

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  +5 Poin & +5% Energi Kelas
                </span>
                <button
                  type="submit"
                  disabled={isSendingIdea || !ideaContent.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Ide</span>
                </button>
              </div>
            </form>

            {/* Idea Stream Feed */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Gagasan Teman Sekelas ({room?.ideas.length || 0})
              </h4>

              {(!room?.ideas || room.ideas.length === 0) ? (
                <div className="text-center py-10 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
                  <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Belum ada gagasan yang dikirim.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Jadilah yang pertama menuliskan idemu!</p>
                </div>
              ) : (
                room.ideas.map((idea) => {
                  const hasUpvoted = idea.upvotedBy.includes(socket.id || '');
                  return (
                    <div
                      key={idea.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 transition flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-xs font-semibold text-white">
                            {idea.authorName}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-2">
                            • {idea.group}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(idea.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-3">
                        {idea.content}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] text-slate-500">
                          Apresiasi ide ini jika menarik
                        </span>
                        <button
                          onClick={() => handleUpvoteIdea(idea.id)}
                          disabled={hasUpvoted}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            hasUpvoted
                              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 cursor-default'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'text-indigo-400 fill-indigo-400' : ''}`} />
                          <span>{idea.upvotes || 0}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TIM & KELAS (KOLABORASI SEBAYA) */}
        {activeTab === 'team' && (
          <div className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Papan Skor Kelompok
              </h4>
              <div className="space-y-2">
                {room?.groups.map((grp) => {
                  const isMyGroup = grp.name === currentStudent?.group;
                  return (
                    <div
                      key={grp.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isMyGroup
                          ? 'bg-indigo-950/40 border-indigo-500/50 text-white shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold">{grp.name}</span>
                          {isMyGroup && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                              Tim Kamu
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {grp.relaysCompleted || 0} estafet diselesaikan
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-amber-400">
                        {grp.score} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Log Mini */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Aktivitas Kelas Terkini
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {room?.activityLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="text-[11px] text-slate-300 flex items-start justify-between py-1 border-b border-slate-800/40">
                    <span className="truncate pr-2">{log.description}</span>
                    {log.pointsChange && (
                      <span className="text-emerald-400 font-bold shrink-0">
                        +{log.pointsChange}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2 flex justify-around items-center z-40">
        <button
          onClick={() => setActiveTab('buzzer')}
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition ${
            activeTab === 'buzzer' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Hand className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Buzzer</span>
        </button>

        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition relative ${
            activeTab === 'ideas' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Gagasan</span>
          {(room?.ideas.length || 0) > 0 && (
            <span className="absolute top-0.5 right-3 w-2 h-2 bg-indigo-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex flex-col items-center py-1 px-4 rounded-xl transition ${
            activeTab === 'team' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Skor Tim</span>
        </button>
      </nav>
    </div>
  );
};
