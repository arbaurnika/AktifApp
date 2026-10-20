import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions: [] }, null, 2));
}

export function loadSessions() {
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw).sessions || [];
  } catch (err) {
    console.error('Failed to load sessions:', err);
    return [];
  }
}

export function saveSession(sessionData) {
  try {
    const sessions = loadSessions();
    const existingIndex = sessions.findIndex(s => s.pin === sessionData.pin);
    if (existingIndex >= 0) {
      sessions[existingIndex] = { ...sessions[existingIndex], ...sessionData, updatedAt: new Date().toISOString() };
    } else {
      sessions.unshift({ ...sessionData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify({ sessions }, null, 2));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

export function getSession(pin) {
  const sessions = loadSessions();
  return sessions.find(s => s.pin === pin) || null;
}

