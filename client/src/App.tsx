import { useState } from 'react';
import { TeacherView } from './components/TeacherView';
import { StudentView } from './components/StudentView';
import { 
  Zap, 
  Hand, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Download, 
  Shuffle
} from 'lucide-react';

export function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'teacher' | 'student'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('pin')) return 'student';
      if (params.get('mode') === 'teacher') return 'teacher';
      if (localStorage.getItem('aktifclass_teacher_pin')) return 'teacher';
    }
    return 'landing';
  });

  const [urlPin] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('pin') || '';
    }
    return '';
  });

  const handleExitToLanding = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    setViewMode('landing');
  };

  const handleSwitchToTeacher = () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '?mode=teacher');
    }
    setViewMode('teacher');
  };

  const handleSwitchToStudent = () => {
    setViewMode('student');
  };

  if (viewMode === 'teacher') {
    return <TeacherView onExit={handleExitToLanding} />;
  }

  if (viewMode === 'student') {
    return <StudentView initialPin={urlPin} onExit={handleExitToLanding} />;
  }

  // Modern Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                Aktif<span className="text-indigo-400">Class</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
                Karya Inovasi Pembelajaran
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSwitchToStudent}
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3 sm:px-4 py-2 rounded-xl transition"
            >
              Masuk Siswa
            </button>
            <button
              onClick={handleSwitchToTeacher}
              className="text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 sm:px-4 py-2 rounded-xl shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              Mode Guru
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Platform Interaksi & Pengukur Keaktifan Siswa Real-Time
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Ubah Kelas Pasif Menjadi <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300">Kolaboratif & Percaya Diri</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Tanpa perlu instalasi atau registrasi akun bagi siswa. Didukung mekanisme inovatif <span className="text-indigo-300 font-medium">Estafet Tantangan</span>, <span className="text-amber-300 font-medium">Baterai Energi Bersama</span>, dan <span className="text-purple-300 font-medium">Roda Anti Free-Rider</span>.
          </p>
        </div>

        {/* Action Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full mb-14">
          {/* Card Siswa */}
          <div
            onClick={handleSwitchToStudent}
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-200 cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-5 border border-indigo-500/30 group-hover:scale-110 transition-transform">
                <Hand className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Saya Siswa (Peserta)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                Scan QR Code di layar proyektor atau masukkan 6 digit PIN kelas. Langsung aktif tanpa perlu membuat akun atau password.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Buzzer "Angkat Tangan Cepat" satu ketukan</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kirim ide secara aman & dapatkan apresiasi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Terima & jawab estafet tantangan kelompok</span>
                </li>
              </ul>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
              <span>Masuk Ruang Kelas Sekarang</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card Guru */}
          <div
            onClick={handleSwitchToTeacher}
            className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/50 rounded-3xl p-6 sm:p-8 transition-all duration-200 cursor-pointer shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-5 border border-purple-500/30 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Saya Guru (Host)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
                Buka sesi kelas baru, tampilkan kode QR di proyektor, kelola penilaian keaktifan, dan unduh laporan otomatis.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Layar Proyektor Energi Kelas & Roda Acak</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Papan Skor Kolaborasi Individu & Kelompok</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ekspor Rekap Excel Format Kurikulum Merdeka</span>
                </li>
              </ul>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 group-hover:text-purple-300">
              <span>Buka Dashboard Guru</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* 4 Pilar Karya Inovasi */}
        <div className="border-t border-slate-800/80 pt-10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-6">
            Pilar Karya Inovasi Pembelajaran
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <ShieldCheck className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
              <h4 className="font-bold text-xs text-white">Zero-Login Siswa</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Hemat waktu tanpa registrasi akun</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <Zap className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <h4 className="font-bold text-xs text-white">Estafet Tantangan</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Siswa aktif memantik kelompok lain</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <Shuffle className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <h4 className="font-bold text-xs text-white">Anti Free-Rider</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Mendorong tutor sebaya dalam tim</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <Download className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <h4 className="font-bold text-xs text-white">Asesmen Otomatis</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Rekap Excel Kurikulum Merdeka</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-5 text-center text-xs text-slate-500">
        <p>AktifClass • Platform Interaksi & Pengukur Keaktifan Siswa (Proyek Karya Inovasi Guru)</p>
      </footer>
    </div>
  );
}

export default App;
