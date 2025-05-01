/**
 * Shared type definitions for questions and question sets
 */

export interface QuestionTypeData {
  id?: string; // Optional id for all type-specific data (for backend compatibility)
  // Common fields for all question types
  question_id: string;
  
  // Multiple choice specific fields
  option_text?: string;
  option_order?: number;
  
  // Rating scale specific fields
  min_value?: number;
  max_value?: number;
  step_value?: number;
  
  // Slider specific fields
  default_value?: number;
  
  // Matrix specific fields
  is_row?: boolean;
  content?: string;
  item_order?: number;
  
  // Open-ended specific fields
  answer_format?: string;
  character_limit?: number;
  
  // Image choice specific fields
  image_url?: string;
  
  // Dichotomous specific fields
  positive_option?: string;
  negative_option?: string;
  
  // Ranking specific fields
  item_text?: string;
}

export interface Question {
  id: string;
  question: string;
  
  // Support both snake_case and camelCase for compatibility
  media_type?: string;
  mediaType?: "text" | "image" | "audio" | "video" | "file";
  
  file_url?: string;
  folder_path?: string;
  type: string;
  
  like_count?: number;
  comment_count?: number;
  
  // Support both snake_case and camelCase for compatibility
  created_at?: string;
  createdAt?: string;
  
  typeData?: QuestionTypeData[];
}

export interface QuestionSet {
  id: string;
  title: string;
  description?: string;
  author_name?: string;
  resource_url?: string;
  donate_url?: string;
  cover_image?: string;
  questionCount: number;
  questions?: Question[];
}
