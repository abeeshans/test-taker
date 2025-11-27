export interface QuestionDetail {
  question: string;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  was_flagged?: boolean;
  strikethroughs?: number[];
}

export interface TestAttempt {
  id: string;
  test_id: string;
  score: number;
  total_questions: number;
  time_taken: number;
  completed_at: string;
  test_title?: string;
  set_name?: string;
  details?: QuestionDetail[];
  is_reset?: boolean;
  away_clicks?: number;
}

export interface Test {
  id: string;
  title: string;
  created_at: string;
  folder_id: string | null;
  is_starred: boolean;
  last_accessed?: string | null;
  question_count: number;
  set_count: number;
  attempt_count: number;
  avg_score?: number | null;
  best_score?: number | null;
  last_score?: number | null;
  question_range?: string | null;
  sets?: { title: string }[];
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  test_count?: number;
  folder_count?: number;
  avg_score?: number;
}

export interface TestStats {
  attempts: number;
  avgScore: number | null;
  bestScore: number | null;
  avgTime: number | null;
  lastDate: string | null;
}

export interface TestData {
  title: string;
  content: {
    sets: {
      title: string;
      questions: {
        passage?: string;
        question: string;
        options: string[];
        correctAnswer: string;
        explanation?: string;
      }[];
    }[];
  };
}
