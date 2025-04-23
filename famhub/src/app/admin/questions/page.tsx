"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import QuestionSetCard from "@/components/question/question-set-card";
import QuestionSetListItem from "@/components/question/question-set-list-item";
import QuestionFilters from "@/components/question/question-filters";
import CreateEditQuestionSetDialog from "@/components/question/create-edit-question-set-dialog";
import QuestionSetDialog from "@/components/question/question-set-dialog";
import AdminLayout from "@/components/layout/AdminLayout";
import { SupabaseService } from '@/services/supabaseService';

// Define types for our question sets and questions
type Question = {
  id: string;
  question: string;
  mediaType: "text" | "file" | "audio" | "video" | "image";
  type: string;
  createdAt: string;
};

type QuestionSet = {
  id: string;
  title: string;
  description?: string;
  questionCount: number;
  questions: Question[];
};

// Mock data for initial state - will be replaced with data from Supabase
const initialQuestionSets: QuestionSet[] = [
  {
    id: "1",
    title: "Initial Assessment",
    description: "Questions for new family members to understand their needs",
    questionCount: 5,
    questions: [],
  },
  {
    id: "2",
    title: "Support Group Feedback",
    description: "Questions to gather feedback after support group sessions",
    questionCount: 3,
    questions: [],
  },
  {
    id: "3",
    title: "Terminal Care Needs",
    description: "Assessment for families with terminal care needs",
    questionCount: 4,
    questions: [],
  },
  {
    id: "4",
    title: "Family Leadership",
    description: "Questions for family leaders to guide community initiatives",
    questionCount: 2,
    questions: [],
  },
];

export default function QuestionsPage() {
  const [view, setView] = useState<"card" | "list">("card");
  const [filters, setFilters] = useState({});
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(initialQuestionSets);
  const [createEditDialogOpen, setCreateEditDialogOpen] = useState(false);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSet | null>(null);
  const [questionSetDialogOpen, setQuestionSetDialogOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchQuestionSets = async () => {
      try {
        // This would be replaced with your actual API call to get question sets
        // const data = await SupabaseService.getAllQuestionSets();
        // setQuestionSets(data);
        
        // For now, we'll use the mock data
        setQuestionSets(initialQuestionSets);
      } catch (err) {
        console.error('Error fetching question sets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load question sets');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionSets();
  }, []);
  
  const handleViewQuestionSet = (id: string) => {
    const questionSet = questionSets.find((qs) => qs.id === id) || null;
    setSelectedQuestionSet(questionSet);
    setQuestionSetDialogOpen(true);
  };

  const handleEditQuestionSet = (id: string) => {
    const questionSet = questionSets.find((qs) => qs.id === id) || null;
    setSelectedQuestionSet(questionSet);
    setCreateEditDialogOpen(true);
  };

  const handleCreateQuestionSet = async (data: any) => {
    try {
      setLoading(true);
      // This would be your actual API call
      // const newQuestionSet = await SupabaseService.createQuestionSet(data);
      
      // For now, we'll simulate it
      const newQuestionSet = {
        id: `${Date.now()}`,
        title: data.title,
        description: data.description,
        questionCount: 0,
        questions: [],
      };
      
      setQuestionSets([...questionSets, newQuestionSet]);
    } catch (err) {
      console.error('Error creating question set:', err);
      setError(err instanceof Error ? err.message : 'Failed to create question set');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestionSet = async (data: any) => {
    try {
      setLoading(true);
      // This would be your actual API call
      // await SupabaseService.updateQuestionSet(data.id, data);
      
      // For now, we'll simulate it
      setQuestionSets(
        questionSets.map((qs) => {
          if (qs.id === data.id) {
            return {
              ...qs,
              title: data.title,
              description: data.description,
            };
          }
          return qs;
        })
      );
    } catch (err) {
      console.error('Error updating question set:', err);
      setError(err instanceof Error ? err.message : 'Failed to update question set');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestionSet = async (id: string) => {
    try {
      setLoading(true);
      // This would be your actual API call
      // await SupabaseService.deleteQuestionSet(id);
      
      // For now, we'll simulate it
      setQuestionSets(questionSets.filter((qs) => qs.id !== id));
    } catch (err) {
      console.error('Error deleting question set:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete question set');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddQuestion = async (questionData: any) => {
    try {
      setLoading(true);
      // This would be your actual API call
      // const newQuestion = await SupabaseService.createQuestion(questionData);
      
      // For now, we'll simulate it
      const newQuestion = {
        id: `q${Date.now()}`,
        question: questionData.question,
        mediaType: questionData.mediaType,
        type: questionData.type,
        createdAt: new Date().toISOString(),
      };
      
      setQuestionSets(
        questionSets.map((qs) => {
          if (qs.id === questionData.questionSetId) {
            return {
              ...qs,
              questionCount: qs.questionCount + 1,
              questions: [...qs.questions, newQuestion],
            };
          }
          return qs;
        })
      );
    } catch (err) {
      console.error('Error adding question:', err);
      setError(err instanceof Error ? err.message : 'Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = async (questionId: string, updatedQuestion: Partial<Question>) => {
    try {
      setLoading(true);
      // This would be your actual API call
      // await SupabaseService.updateQuestion(questionId, updatedQuestion);
      
      // For now, we'll simulate it
      setQuestionSets(
        questionSets.map((qs) => {
          const questionIndex = qs.questions.findIndex((q) => q.id === questionId);
          if (questionIndex !== -1) {
            const updatedQuestions = [...qs.questions];
            updatedQuestions[questionIndex] = {
              ...updatedQuestions[questionIndex],
              ...updatedQuestion,
            };
            return {
              ...qs,
              questions: updatedQuestions,
            };
          }
          return qs;
        })
      );
    } catch (err) {
      console.error('Error updating question:', err);
      setError(err instanceof Error ? err.message : 'Failed to update question');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      setLoading(true);
      // This would be your actual API call
      // await SupabaseService.deleteQuestion(questionId);
      
      // For now, we'll simulate it
      setQuestionSets(
        questionSets.map((qs) => {
          const questionIndex = qs.questions.findIndex((q) => q.id === questionId);
          if (questionIndex !== -1) {
            const updatedQuestions = qs.questions.filter((q) => q.id !== questionId);
            return {
              ...qs,
              questionCount: qs.questionCount - 1,
              questions: updatedQuestions,
            };
          }
          return qs;
        })
      );
    } catch (err) {
      console.error('Error deleting question:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 bg-[#0a0c10] min-h-screen">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Question Management</h1>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => {
              setSelectedQuestionSet(null);
              setCreateEditDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Question Set
          </Button>
        </div>

        <div className="mb-8">
          <QuestionFilters view={view} onViewChange={setView} onFilterChange={setFilters} />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-md">
            {error}
          </div>
        ) : (
          view === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {questionSets.map((questionSet) => (
                <QuestionSetCard
                  key={questionSet.id}
                  questionSet={questionSet}
                  onViewClick={handleViewQuestionSet}
                  onEditClick={handleEditQuestionSet}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#111318] rounded-lg overflow-hidden border border-gray-800">
              {questionSets.map((questionSet) => (
                <QuestionSetListItem
                  key={questionSet.id}
                  questionSet={questionSet}
                  onViewClick={handleViewQuestionSet}
                  onEditClick={handleEditQuestionSet}
                />
              ))}
            </div>
          )
        )}

        <CreateEditQuestionSetDialog
          open={createEditDialogOpen}
          onOpenChange={setCreateEditDialogOpen}
          onSubmit={selectedQuestionSet ? handleUpdateQuestionSet : handleCreateQuestionSet}
          onDelete={handleDeleteQuestionSet}
          questionSet={selectedQuestionSet}
        />

        <QuestionSetDialog
          open={questionSetDialogOpen}
          onOpenChange={setQuestionSetDialogOpen}
          questionSet={selectedQuestionSet}
          onEditQuestion={handleEditQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onAddQuestion={handleAddQuestion}
        />
      </div>
    </AdminLayout>
  );
}
