export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface Student {
  id: string;
  name: string;
  group: string;
  points: number;
  buzzCount: number;
  ideasCount: number;
  upvotesReceived: number;
  badges: Badge[];
  joinedAt: string;
  isOnline?: boolean;
}

export interface Group {
  id: string;
  name: string;
  score: number;
  relaysCompleted: number;
}

export interface Idea {
  id: string;
  studentId: string;
  authorName: string;
  realName: string;
  group: string;
  content: string;
  upvotes: number;
  upvotedBy: string[];
  createdAt: string;
}

export interface BuzzerItem {
  studentId: string;
  studentName: string;
  group: string;
  timestamp: number;
}

export interface RelayChallenge {
  id: string;
  fromGroup: string;
  toGroup: string;
  question: string;
  startedAt: number;
  endsAt: number;
  durationSeconds: number;
  status: 'active' | 'completed';
  responseText?: string;
}

export interface ActivityLog {
  id: number;
  timestamp: string;
  type: string;
  targetName?: string;
  pointsChange?: number;
  description: string;
}

export interface Room {
  pin: string;
  subject: string;
  teacherSocketId: string;
  classEnergy: number;
  classEnergyGoal: number;
  students: Record<string, Student>;
  groups: Group[];
  ideas: Idea[];
  buzzerQueue: BuzzerItem[];
  activeRelay: RelayChallenge | null;
  activityLogs: ActivityLog[];
  createdAt: string;
  isClosed?: boolean;
}

