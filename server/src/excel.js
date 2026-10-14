import XLSX from 'xlsx';

export function generateClassReport(room) {
  const wb = XLSX.utils.book_new();

  // 1. Rekap Individu
  const students = Object.values(room.students || {});
  const studentRows = students.map((s, idx) => {
    let predikat = 'Perlu Bimbingan';
    if (s.points >= 40) predikat = 'Sangat Aktif (A)';
    else if (s.points >= 25) predikat = 'Aktif (B)';
    else if (s.points >= 10) predikat = 'Cukup Aktif (C)';

    return {
      'No': idx + 1,
      'Nama Siswa': s.name,
      'Kelompok': s.group || 'Tanpa Kelompok',
      'Total Poin': s.points || 0,
      'Predikat Keaktifan': predikat,
      'Ide / Tanggapan': s.ideasCount || 0,
      'Upvote Diterima': s.upvotesReceived || 0,
      'Buzzer / Angkat Tangan': s.buzzCount || 0,
      'Lencana Diperoleh': (s.badges || []).map(b => b.name).join(', ') || '-'
    };
  });

  const wsStudents = XLSX.utils.json_to_sheet(studentRows.length > 0 ? studentRows : [{
    'Info': 'Belum ada data siswa'
  }]);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Keaktifan Individu');

  // 2. Rekap Kelompok
  const groups = room.groups || [];
  const groupRows = groups.map((g, idx) => {
    const groupMembers = students.filter(s => s.group === g.name);
    const avgScore = groupMembers.length > 0 
      ? Math.round(groupMembers.reduce((acc, m) => acc + (m.points || 0), 0) / groupMembers.length) 
      : 0;

    return {
      'No': idx + 1,
      'Nama Kelompok': g.name,
      'Jumlah Anggota': groupMembers.length,
      'Total Poin Kelompok': g.score || 0,
      'Rata-rata Skor Anggota': avgScore,
      'Estafet Diterima/Diselesaikan': g.relaysCompleted || 0
    };
  });

  const wsGroups = XLSX.utils.json_to_sheet(groupRows.length > 0 ? groupRows : [{
    'Info': 'Belum ada data kelompok'
  }]);
  XLSX.utils.book_append_sheet(wb, wsGroups, 'Keaktifan Kelompok');

  // 3. Log Aktivitas
  const logRows = (room.activityLogs || []).map((l, idx) => ({
    'No': idx + 1,
    'Waktu': new Date(l.timestamp).toLocaleTimeString('id-ID'),
    'Tipe': l.type,
    'Target': l.targetName || '-',
    'Deskripsi': l.description,
    'Poin': l.pointsChange ? `+${l.pointsChange}` : '-'
  }));

  const wsLogs = XLSX.utils.json_to_sheet(logRows.length > 0 ? logRows : [{
    'Info': 'Belum ada log aktivitas'
  }]);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Log Aktivitas Kelas');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
