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
import { adminQuestionServices } from '@/services/AdminQuestionServices';

// Define types for our component to match what the UI components expect
type Question = {
  id: string;
  question: string;
  mediaType: "text" | "image" | "audio" | "video" | "file";
  type: string;
  createdAt: string;
};

type QuestionSet = {
  id: string;
  title: string;
  description?: string;
  author_name?: string;
  resource_url?: string;
  donate_url?: string;
  cover_image?: string;
  questionCount: number;
  questions: Question[];
};

export default function QuestionsPage() {
  const [view, setView] = useState<"card" | "list">("card");
  const [filters, setFilters] = useState({});
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [createEditDialogOpen, setCreateEditDialogOpen] = useState(false);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSet | null>(null);
  const [questionSetDialogOpen, setQuestionSetDialogOpen] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Using a default admin email for now - in a real app, this would come from authentication
  const adminEmail = 'admin@familyconnect.com';
  
  useEffect(() => {
    const fetchQuestionSets = async () => {
      try {
        const data = await adminQuestionServices.getAllQuestionSets(adminEmail);
        
        // Convert the data to match our component's QuestionSet type
        const formattedData: QuestionSet[] = data.map(set => ({
          id: set.id,
          title: set.title || '',
          description: set.description,
          questionCount: set.questionCount || 0,
          questions: [] // Empty array as we're not loading questions at this point
        }));
        
        setQuestionSets(formattedData);
      } catch (err) {
        console.error('Error fetching question sets:', err);
        setError(err instanceof Error ? err.message : 'Failed to load question sets');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionSets();
  }, []);
  
  const handleViewQuestionSet = async (id: string) => {
    try {
      setLoading(true);
      
      const questionSetData = await adminQuestionServices.getQuestionSetById(id, adminEmail);
      
      // Convert to our component's QuestionSet type with required fields
      const formattedQuestionSet: QuestionSet = {
        id: questionSetData.id,
        title: questionSetData.title || '',
        description: questionSetData.description,
        // Include the new fields
        author_name: questionSetData.author_name,
        resource_url: questionSetData.resource_url,
        donate_url: questionSetData.donate_url,
        cover_image: questionSetData.cover_image,
        questionCount: questionSetData.questionCount || 0,
        questions: questionSetData.questions?.map(q => ({
          id: q.id,
          question: q.question,
          // Convert media_type to the expected enum type with fallback to "text"
          mediaType: (q.media_type as "text" | "image" | "audio" | "video" | "file") || "text",
          type: q.media_type || "text", // Use media_type as type if available
          createdAt: q.created_at || new Date().toISOString()
        })) || [] // Provide empty array as fallback
      };
      
      console.log('Viewing question set with data:', formattedQuestionSet);
      
      setSelectedQuestionSet(formattedQuestionSet);
      setQuestionSetDialogOpen(true);
    } catch (err) {
      console.error(`Error fetching question set ${id}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load question set');
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestionSet = (id: string) => {
    const questionSet = questionSets.find((qs) => qs.id === id) || null;
    setSelectedQuestionSet(questionSet);
    setCreateEditDialogOpen(true);
  };

  const handleCreateQuestionSet = async (data: Partial<QuestionSet>) => {
    try {
      setLoading(true);
      
      // Map the component's field names to the database field names
      const questionSetData = {
        title: data.title,
        description: data.description,
        // Map the fields to match the database schema
        author_name: data.author_name,
        resource_url: data.resource_url,
        donate_url: data.donate_url,
        cover_image: data.cover_image
      };
      
      console.log('Creating question set with data:', questionSetData);
      
      const newQuestionSet = await adminQuestionServices.createQuestionSet(questionSetData, adminEmail);
      
      // Convert to our component's QuestionSet type with required fields
      const formattedQuestionSet: QuestionSet = {
        id: newQuestionSet.id,
        title: newQuestionSet.title || '',
        description: newQuestionSet.description,
        author_name: newQuestionSet.author_name,
        resource_url: newQuestionSet.resource_url,
        donate_url: newQuestionSet.donate_url,
        cover_image: newQuestionSet.cover_image,
        questionCount: newQuestionSet.questionCount || 0,
        questions: [] // Empty array for new question set
      };
      
      setQuestionSets([...questionSets, formattedQuestionSet]);
      setCreateEditDialogOpen(false);
    } catch (err) {
      console.error('Error creating question set:', err);
      setError(err instanceof Error ? err.message : 'Failed to create question set');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestionSet = async (data: Partial<QuestionSet>) => {
    try {
      setLoading(true);
      if (!data.id) {
        setError('Missing question set ID');
        return;
      }
      
      // Map the component's field names to the database field names
      const questionSetData = {
        title: data.title,
        description: data.description,
        // Map the fields to match the database schema
        author_name: data.author_name,
        resource_url: data.resource_url,
        donate_url: data.donate_url,
        cover_image: data.cover_image
      };
      
      console.log('Updating question set with data:', questionSetData);
      
      const updatedQuestionSet = await adminQuestionServices.updateQuestionSet(data.id, questionSetData, adminEmail);
      
      // Convert to our component's QuestionSet type and update the list
      setQuestionSets(
        questionSets.map((qs) => {
          if (qs.id === data.id) {
            return {
              ...qs,
              title: updatedQuestionSet.title || qs.title,
              description: updatedQuestionSet.description,
              author_name: updatedQuestionSet.author_name,
              resource_url: updatedQuestionSet.resource_url,
              donate_url: updatedQuestionSet.donate_url,
              cover_image: updatedQuestionSet.cover_image,
              questionCount: updatedQuestionSet.questionCount || qs.questionCount
            };
          }
          return qs;
        })
      );
      setCreateEditDialogOpen(false);
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
      
      await adminQuestionServices.deleteQuestionSet(id, adminEmail);
      setQuestionSets(questionSets.filter((qs) => qs.id !== id));
      setCreateEditDialogOpen(false);
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
      
      // Prepare the question data
      const questionToCreate = {
        user_id: questionData.userId || '00000000-0000-0000-0000-000000000000', // Default user ID if not provided
        question: questionData.question,
        media_type: questionData.mediaType,
        file_url: questionData.fileUrl,
        folder_path: questionData.folderPath,
        question_set_id: questionData.questionSetId
      };
      
      const newQuestion = await adminQuestionServices.createQuestion(questionToCreate, adminEmail);
      
      // Refresh the question set to get the updated question count
      if (selectedQuestionSet && selectedQuestionSet.id === questionData.questionSetId) {
        const updatedQuestionSetData = await adminQuestionServices.getQuestionSetById(questionData.questionSetId, adminEmail);
        
        // Convert to our component's QuestionSet type with required fields
        const updatedQuestionSet: QuestionSet = {
          id: updatedQuestionSetData.id,
          title: updatedQuestionSetData.title || '',
          description: updatedQuestionSetData.description,
          questionCount: updatedQuestionSetData.questionCount || 0,
          questions: updatedQuestionSetData.questions?.map(q => ({
            id: q.id,
            question: q.question,
            mediaType: (q.media_type as "text" | "image" | "audio" | "video" | "file") || "text",
            type: q.media_type || "text",
            createdAt: q.created_at || new Date().toISOString()
          })) || []
        };
        
        setSelectedQuestionSet(updatedQuestionSet);
      }
      
      // Update the question sets list
      setQuestionSets(
        questionSets.map((qs) => {
          if (qs.id === questionData.questionSetId) {
            return {
              ...qs,
              questionCount: qs.questionCount + 1,
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
      
      // Convert from our component Question type to the service Question type
      const questionToUpdate = {
        question: updatedQuestion.question,
        media_type: updatedQuestion.mediaType,
        // We don't have file_url in our Question type, so we'll handle it separately if needed
        file_url: undefined
      };
      
      await adminQuestionServices.updateQuestion(questionId, questionToUpdate, adminEmail);
      
      // If we have a selected question set, refresh it to get the updated question
      if (selectedQuestionSet) {
        const refreshedQuestionSetData = await adminQuestionServices.getQuestionSetById(selectedQuestionSet.id, adminEmail);
        
        // Convert to our component's QuestionSet type with required fields
        const refreshedQuestionSet: QuestionSet = {
          id: refreshedQuestionSetData.id,
          title: refreshedQuestionSetData.title || '',
          description: refreshedQuestionSetData.description,
          questionCount: refreshedQuestionSetData.questionCount || 0,
          questions: refreshedQuestionSetData.questions?.map(q => ({
            id: q.id,
            question: q.question,
            mediaType: (q.media_type as "text" | "image" | "audio" | "video" | "file") || "text",
            type: q.media_type || "text",
            createdAt: q.created_at || new Date().toISOString()
          })) || []
        };
        
        setSelectedQuestionSet(refreshedQuestionSet);
      }
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
      
      await adminQuestionServices.deleteQuestion(questionId, adminEmail);
      
      // If we have a selected question set, refresh it to get the updated question count
      if (selectedQuestionSet) {
        const refreshedQuestionSetData = await adminQuestionServices.getQuestionSetById(selectedQuestionSet.id, adminEmail);
        
        // Convert to our component's QuestionSet type with required fields
        const refreshedQuestionSet: QuestionSet = {
          id: refreshedQuestionSetData.id,
          title: refreshedQuestionSetData.title || '',
          description: refreshedQuestionSetData.description,
          questionCount: refreshedQuestionSetData.questionCount || 0,
          questions: refreshedQuestionSetData.questions?.map(q => ({
            id: q.id,
            question: q.question,
            mediaType: (q.media_type as "text" | "image" | "audio" | "video" | "file") || "text",
            type: q.media_type || "text",
            createdAt: q.created_at || new Date().toISOString()
          })) || []
        };
        
        setSelectedQuestionSet(refreshedQuestionSet);
        
        // Also update the question sets list
        setQuestionSets(
          questionSets.map((qs) => {
            if (qs.id === selectedQuestionSet.id) {
              return {
                ...qs,
                questionCount: Math.max(0, qs.questionCount - 1)
              };
            }
            return qs;
          })
        );
      }
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
