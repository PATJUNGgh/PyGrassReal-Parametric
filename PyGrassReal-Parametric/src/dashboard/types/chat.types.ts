export type ChatModel = 'hanuman' | 'phraram';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatProject {
  id: string;
  name: string;
}

export interface HistoryItemData {
  id: string;
  title: string;
  date: string;
  projectId: string | null;
}
