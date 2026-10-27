export interface TutorMessage { role: 'user' | 'assistant'; text: string }
export interface TutorQuestion { question: string; choices: string[]; correctIndex: number; explanation: string; topic: string }
export interface TutorQuiz { questions: TutorQuestion[] }
export interface TutorConversation {
  id: string; topic: string; notes: string; messages: TutorMessage[]; quiz?: TutorQuiz;
  answers: number[]; quizIndex: number; updatedAt: number;
}
export interface TutorUsage { used: number; limit: number; globalUsed: number; globalLimit: number; resetsAt: string; remaining: number }
export interface TutorInput { action: 'ask' | 'quiz'; question: string; topic: string; notes: string; messages: TutorMessage[] }
export interface TutorResult { text?: string; quiz?: TutorQuiz; usage?: TutorUsage }
