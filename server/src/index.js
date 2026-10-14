import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { saveSession, loadSessions, getSession } from './store.js';
import { generateClassReport } from './excel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory active rooms: pin -> RoomObject
const activeRooms = new Map();

// Generate unique 6-digit PIN
function generatePin() {
  let pin = '';
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (activeRooms.has(pin));
  return pin;
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRoomsCount: activeRooms.size, timestamp: new Date() });
});

app.get('/api/sessions', (req, res) => {
  const sessions = loadSessions();
  res.json(sessions);
});

app.get('/api/sessions/:pin', (req, res) => {
  const { pin } = req.params;
  const room = activeRooms.get(pin) || getSession(pin);
  if (!room) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  res.json(room);
});

app.get('/api/sessions/:pin/export', (req, res) => {
  const { pin } = req.params;
  const room = activeRooms.get(pin) || getSession(pin);
  if (!room) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

  const buffer = generateClassReport(room);
  const filename = `Rekap_Keaktifan_${(room.subject || 'Kelas').replace(/\s+/g, '_')}_${pin}.xlsx`;
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

// Socket.io Real-Time Handlers
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ${socket.id}`);

  // 1. Teacher creates room
  socket.on('teacher:create-room', ({ subject, groups = [] }, callback) => {
    const pin = generatePin();
    const formattedGroups = groups.map((g, i) => ({
      id: `group-${i + 1}`,
      name: typeof g === 'string' ? g : g.name,
      score: 0,
      relaysCompleted: 0
    }));

    const room = {
      pin,
      subject: subject || 'Sesi Pembelajaran Aktif',
      teacherSocketId: socket.id,
      classEnergy: 0,
      classEnergyGoal: 100,
      students: {}, // socketId -> student
      groups: formattedGroups,
      ideas: [],
      buzzerQueue: [],
      activeRelay: null,
      activityLogs: [],
      createdAt: new Date().toISOString()
    };

    activeRooms.set(pin, room);
    socket.join(pin);
    socket.data.role = 'teacher';
    socket.data.pin = pin;

    saveSession(room);
    console.log(`[Room Created] PIN: ${pin}, Subject: ${subject}`);
    if (callback) callback({ success: true, room });
  });

  // 2. Student joins room (Zero Login)
  socket.on('student:join', ({ pin, name, group }, callback) => {
    const room = activeRooms.get(pin);
    if (!room) {
      if (callback) callback({ success: false, error: 'Kode PIN kelas tidak valid atau sesi sudah ditutup!' });
      return;
    }

    // Check if re-joining with same name in same room
    const existingEntry = Object.values(room.students).find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    const studentData = {
      id: socket.id,
      name: name.trim(),
      group: group || 'Tanpa Kelompok',
      points: existingEntry ? existingEntry.points : 0,
      buzzCount: existingEntry ? existingEntry.buzzCount : 0,
      ideasCount: existingEntry ? existingEntry.ideasCount : 0,
      upvotesReceived: existingEntry ? existingEntry.upvotesReceived : 0,
      badges: existingEntry ? existingEntry.badges : [],
      joinedAt: existingEntry ? existingEntry.joinedAt : new Date().toISOString()
    };

    room.students[socket.id] = studentData;
    socket.join(pin);
    socket.data.role = 'student';
    socket.data.pin = pin;
    socket.data.studentId = socket.id;

    // Log activity
    room.activityLogs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'JOIN',
      targetName: studentData.name,
      description: `${studentData.name} bergabung ke ${studentData.group}`
    });

    saveSession(room);

    // Notify room of updated state
    io.to(pin).emit('room:updated', room);
    if (callback) callback({ success: true, student: studentData, room });
  });

  // 3. Student Buzzes in (Angkat Tangan Cepat)
  socket.on('student:buzz', ({ pin }, callback) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    const student = room.students[socket.id];
    if (!student) return;

    // Avoid duplicate in queue
    const alreadyInQueue = room.buzzerQueue.some(b => b.studentId === socket.id);
    if (!alreadyInQueue) {
      const buzzEntry = {
        studentId: socket.id,
        studentName: student.name,
        group: student.group,
        timestamp: Date.now()
      };
      room.buzzerQueue.push(buzzEntry);
      student.buzzCount = (student.buzzCount || 0) + 1;

      // Small class energy boost for participation initiative
      room.classEnergy = Math.min(100, (room.classEnergy || 0) + 2);

      room.activityLogs.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        type: 'BUZZ',
        targetName: student.name,
        description: `${student.name} memencet buzzer!`
      });

      saveSession(room);
      io.to(pin).emit('room:updated', room);
      io.to(pin).emit('buzzer:new', buzzEntry);
    }

    if (callback) callback({ success: true, queuePosition: room.buzzerQueue.length });
  });

  // 4. Teacher clears buzzer queue
  socket.on('teacher:clear-buzzer', ({ pin }) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    room.buzzerQueue = [];
    saveSession(room);
    io.to(pin).emit('room:updated', room);
  });

  // 5. Student submits idea/question
  socket.on('student:submit-idea', ({ pin, content, isAnonymous }, callback) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    const student = room.students[socket.id];
    if (!student) return;

    const newIdea = {
      id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      studentId: socket.id,
      authorName: isAnonymous ? 'Siswa Rahasia 🕵️' : student.name,
      realName: student.name,
      group: student.group,
      content: content.trim(),
      upvotes: 0,
      upvotedBy: [],
      createdAt: new Date().toISOString()
    };

    room.ideas.unshift(newIdea);
    student.ideasCount = (student.ideasCount || 0) + 1;
    student.points += 5; // Reward for putting thought forward

    // Also add 5 points to their group
    const grp = room.groups.find(g => g.name === student.group);
    if (grp) grp.score += 5;

    // Class energy boost
    room.classEnergy = Math.min(100, (room.classEnergy || 0) + 5);

    room.activityLogs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'IDEA',
      targetName: student.name,
      pointsChange: 5,
      description: `${isAnonymous ? 'Seseorang' : student.name} mengirim ide: "${content.slice(0, 35)}..."`
    });

    saveSession(room);
    io.to(pin).emit('room:updated', room);
    if (callback) callback({ success: true, idea: newIdea });
  });

  // 6. Student/Peer Upvotes Idea
  socket.on('student:upvote-idea', ({ pin, ideaId }, callback) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    const idea = room.ideas.find(i => i.id === ideaId);
    if (!idea) return;

    if (!idea.upvotedBy.includes(socket.id)) {
      idea.upvotedBy.push(socket.id);
      idea.upvotes += 1;

      // Reward original author
      const author = room.students[idea.studentId];
      if (author) {
        author.upvotesReceived = (author.upvotesReceived || 0) + 1;
        author.points += 2;
      }

      // Small energy boost for positive peer feedback
      room.classEnergy = Math.min(100, (room.classEnergy || 0) + 2);

      saveSession(room);
      io.to(pin).emit('room:updated', room);
      if (callback) callback({ success: true, upvotes: idea.upvotes });
    } else {
      if (callback) callback({ success: false, message: 'Sudah di-upvote sebelumnya' });
    }
  });

  // 7. Teacher adds points (Quick Tally Rubric)
  socket.on('teacher:add-points', ({ pin, targetType, targetId, points, reason, badge }) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    let targetName = '';
    if (targetType === 'student') {
      const student = room.students[targetId];
      if (student) {
        student.points = Math.max(0, (student.points || 0) + points);
        targetName = student.name;
        if (badge) {
          student.badges = student.badges || [];
          if (!student.badges.some(b => b.name === badge.name)) {
            student.badges.push(badge);
          }
        }
        // Mirror points to student's group
        const grp = room.groups.find(g => g.name === student.group);
        if (grp) grp.score = Math.max(0, grp.score + points);
      }
    } else if (targetType === 'group') {
      const grp = room.groups.find(g => g.id === targetId || g.name === targetId);
      if (grp) {
        grp.score = Math.max(0, grp.score + points);
        targetName = grp.name;
      }
    }

    // Class energy adjustment
    room.classEnergy = Math.min(100, Math.max(0, (room.classEnergy || 0) + Math.round(points * 0.8)));

    room.activityLogs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'POINTS',
      targetName,
      pointsChange: points,
      description: `${reason || 'Penilaian Keaktifan'} (${points > 0 ? '+' : ''}${points} poin)`
    });

    if (room.classEnergy >= 100) {
      io.to(pin).emit('class:goal-reached', { message: 'Energi Kelas Mencapai 100%! Target Kolaborasi Tercapai! 🎉' });
    }

    saveSession(room);
    io.to(pin).emit('room:updated', room);
  });

  // 8. Challenge Relay (Estafet Tantangan Antar-Kelompok)
  socket.on('relay:start', ({ pin, fromGroup, toGroup, question, durationSeconds = 90 }) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    room.activeRelay = {
      id: `relay-${Date.now()}`,
      fromGroup,
      toGroup,
      question,
      startedAt: Date.now(),
      endsAt: Date.now() + durationSeconds * 1000,
      durationSeconds,
      status: 'active'
    };

    room.activityLogs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'RELAY',
      targetName: toGroup,
      description: `⚡ ${fromGroup} melempar tantangan ke ${toGroup}!`
    });

    saveSession(room);
    io.to(pin).emit('room:updated', room);
    io.to(pin).emit('relay:alert', room.activeRelay);
  });

  socket.on('relay:complete', ({ pin, responseText, bonusPoints = 20 }) => {
    const room = activeRooms.get(pin);
    if (!room || !room.activeRelay) return;

    const currentRelay = room.activeRelay;
    const answeredGroup = room.groups.find(g => g.name === currentRelay.toGroup);
    if (answeredGroup) {
      answeredGroup.score += bonusPoints;
      answeredGroup.relaysCompleted = (answeredGroup.relaysCompleted || 0) + 1;
    }

    // Boost class energy significantly for successful relay completion!
    room.classEnergy = Math.min(100, (room.classEnergy || 0) + 15);

    room.activityLogs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'RELAY_SUCCESS',
      targetName: currentRelay.toGroup,
      pointsChange: bonusPoints,
      description: `🏆 ${currentRelay.toGroup} berhasil menyelesaikan tantangan estafet!`
    });

    room.activeRelay = {
      ...currentRelay,
      status: 'completed',
      responseText
    };

    saveSession(room);
    io.to(pin).emit('room:updated', room);
    io.to(pin).emit('relay:celebrate', { group: currentRelay.toGroup, points: bonusPoints });
  });

  // 9. Mystery Wheel (Random Picker Siswa)
  socket.on('mystery:spin', ({ pin, selectedStudent }) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    room.activityLogs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: 'SPIN',
      targetName: selectedStudent.name,
      description: `🎯 Roda Keberuntungan memilih ${selectedStudent.name} (${selectedStudent.group})!`
    });

    saveSession(room);
    io.to(pin).emit('mystery:result', selectedStudent);
  });

  // 10. Manual Class Energy adjustment
  socket.on('teacher:adjust-energy', ({ pin, delta }) => {
    const room = activeRooms.get(pin);
    if (!room) return;

    room.classEnergy = Math.min(100, Math.max(0, (room.classEnergy || 0) + delta));
    if (room.classEnergy >= 100) {
      io.to(pin).emit('class:goal-reached', { message: 'Energi Kelas Mencapai 100%! Target Kolaborasi Tercapai! 🎉' });
    }

    saveSession(room);
    io.to(pin).emit('room:updated', room);
  });

  // Disconnection handler
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ${socket.id}`);
    const pin = socket.data?.pin;
    if (pin && activeRooms.has(pin)) {
      const room = activeRooms.get(pin);
      if (socket.data.role === 'student' && room.students[socket.id]) {
        // Mark student as inactive but don't delete to preserve their score
        room.students[socket.id].isOnline = false;
        io.to(pin).emit('room:updated', room);
      }
    }
  });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  const indexPath = path.join(CLIENT_DIST, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 AktifClass Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready for Teacher & Students`);
  console.log(`=========================================`);
});
