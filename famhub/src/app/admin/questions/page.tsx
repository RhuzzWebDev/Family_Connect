"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
// Import types but use them with type assertions to avoid compatibility issues
import type { Question as SharedQuestion, QuestionSet as SharedQuestionSet } from "@/types/question";
import QuestionSetCard from "@/components/question/question-set-card";
import QuestionSetListItem from "@/components/question/question-set-list-item";
import QuestionFilters from "@/components/question/question-filters";
import CreateEditQuestionSetDialog from "@/components/question/create-edit-question-set-dialog";
import QuestionSetDialog from "@/components/question/question-set-dialog";
import AdminLayout from "@/components/layout/AdminLayout";
import { adminQuestionServices, QuestionTypeEnum } from '@/services/AdminQuestionServices';

// Define local types to maintain compatibility with existing code
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
  const [adminEmail, setAdminEmail] = useState('admin@famhub.com');
  
  // Store admin email in session storage for persistence
  useEffect(() => {
    // Get admin email from session storage or use default
    const storedEmail = sessionStorage.getItem('adminEmail');
    if (storedEmail) {
      setAdminEmail(storedEmail);
    } else {
      sessionStorage.setItem('adminEmail', adminEmail);
    }
  }, []);
  
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
        questions: questionSetData.questions?.map(q => {
          console.log('Raw question data from API:', q);
          return {
            id: q.id,
            question: q.question,
            // Convert media_type to the expected enum type with fallback to "text"
            mediaType: q.media_type ? (q.media_type as "image" | "audio" | "video") : "text",
            // Use the actual question type from the database
            type: q.type || "multiple-choice", // Use the proper question type with fallback
            createdAt: q.created_at || new Date().toISOString()
          };
        }) || [] // Provide empty array as fallback
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

  const handleEditQuestionSet = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch the complete question set data including author_name and resource_url
      const questionSetData = await adminQuestionServices.getQuestionSetById(id, adminEmail);
      
      // Convert to our component's QuestionSet type with all required fields
      const formattedQuestionSet: QuestionSet = {
        id: questionSetData.id,
        title: questionSetData.title || '',
        description: questionSetData.description,
        author_name: questionSetData.author_name,
        resource_url: questionSetData.resource_url,
        donate_url: questionSetData.donate_url,
        cover_image: questionSetData.cover_image,
        questionCount: questionSetData.questionCount || 0,
        questions: questionSetData.questions?.map(q => ({
          id: q.id,
          question: q.question,
          mediaType: q.media_type ? (q.media_type as "image" | "audio" | "video") : "text",
          type: q.media_type || "text",
          createdAt: q.created_at || new Date().toISOString()
        })) || []
      };
      
      console.log('Editing question set with complete data:', formattedQuestionSet);
      
      setSelectedQuestionSet(formattedQuestionSet);
      setCreateEditDialogOpen(true);
    } catch (err) {
      console.error(`Error fetching question set ${id} for editing:`, err);
      toast.error('Failed to load question set for editing');
    } finally {
      setLoading(false);
    }
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

  // Helper function to convert between type formats
  const convertQuestionFormat = (question: any): Question => {
    return {
      id: question.id,
      question: question.question,
      mediaType: question.mediaType || question.media_type || "text",
      type: question.type,
      createdAt: question.createdAt || question.created_at || new Date().toISOString()
    };
  };

  const handleUpdateQuestionSet = async (data: Partial<QuestionSet>) => {
    try {
      setLoading(true);
      if (!data.id) {
        toast.error("Question set ID is required for updating");
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
  
  // Helper function to refresh a question set's data
  const refreshQuestionSet = async (questionSetId: string) => {
    try {
      const currentAdminEmail = sessionStorage.getItem('adminEmail') || adminEmail;
      const updatedQuestionSetData = await adminQuestionServices.getQuestionSetById(questionSetId, currentAdminEmail);
      
      // Convert to our component's QuestionSet type with required fields
      const updatedQuestionSet: QuestionSet = {
        id: updatedQuestionSetData.id,
        title: updatedQuestionSetData.title || '',
        description: updatedQuestionSetData.description,
        author_name: updatedQuestionSetData.author_name,
        resource_url: updatedQuestionSetData.resource_url,
        donate_url: updatedQuestionSetData.donate_url,
        cover_image: updatedQuestionSetData.cover_image,
        questionCount: updatedQuestionSetData.questionCount || 0,
        questions: updatedQuestionSetData.questions?.map(q => ({
          id: q.id,
          question: q.question,
          mediaType: q.media_type ? (q.media_type as "image" | "audio" | "video") : "text",
          type: q.type || "open-ended",
          createdAt: q.created_at || new Date().toISOString()
        })) || []
      };
      
      setSelectedQuestionSet(updatedQuestionSet);
      
      // Update the question sets list with the new question count
      setQuestionSets(prevSets => 
        prevSets.map(qs => 
          qs.id === questionSetId 
            ? { ...qs, questionCount: updatedQuestionSet.questionCount } 
            : qs
        )
      );
      
      return updatedQuestionSet;
    } catch (err) {
      console.error(`Error refreshing question set ${questionSetId}:`, err);
      toast.error('Failed to refresh question set data');
      throw err;
    }
  };
  
  const handleAddQuestion = async (questionData: any) => {
    try {
      setLoading(true);
      
      // Add the question to the selected question set
      if (!selectedQuestionSet) {
        setError('No question set selected');
        return;
      }
      
      // Check if the question already has an ID (already created)
      if (questionData.id) {
        console.log('Question already created with ID:', questionData.id);
        // Just update the UI with the existing question
        await refreshQuestionSet(selectedQuestionSet.id);
        return;
      }
      
      // Use the admin email from the question data if available, otherwise use the current one
      const currentAdminEmail = questionData.adminEmail || sessionStorage.getItem('adminEmail') || adminEmail;
      console.log('Using admin email for question creation:', currentAdminEmail);
      
      // Get the admin user ID first
      const adminUserId = await adminQuestionServices.getAdminUserId(currentAdminEmail);
      
      // Convert from our component Question type to the service Question type
      // The service only accepts 'image', 'audio', 'video' for media_type
      // If mediaType is 'file' or 'document', we'll map it to a compatible type for the service
      let mediaType: 'image' | 'audio' | 'video' | undefined = undefined;
      
      if (questionData.mediaType && questionData.mediaType !== 'text') {
        if (questionData.mediaType === 'file' || questionData.mediaType === 'document') {
          // Map 'file' or 'document' to a type the service accepts (e.g., 'image')
          // This is a workaround for the type mismatch
          mediaType = 'image';
        } else {
          // For other types (image, audio, video), use as is
          mediaType = questionData.mediaType as 'image' | 'audio' | 'video';
        }
      }
      
      console.log('Question data received:', questionData); // Debug log
      
      // Ensure we have a valid question type
      // The database requires a non-null type value
      let questionType = questionData.type;
      
      // If type is missing or invalid, set a default
      if (!questionType || typeof questionType !== 'string' || 
          !Object.values(QuestionTypeEnum).includes(questionType as QuestionTypeEnum)) {
        console.log('Using default question type because:', { receivedType: questionType });
        questionType = QuestionTypeEnum.OPEN_ENDED;
      } else {
        // Ensure the type is properly cast as QuestionTypeEnum
        questionType = questionType as QuestionTypeEnum;
      }
      
      // Create the question object with the base fields
      const questionToAdd: any = {
        user_id: adminUserId, // Add the user_id to satisfy the not-null constraint
        question: questionData.question,
        media_type: mediaType,
        question_set_id: questionData.questionSetId,
        type: questionType, // Use the validated question type
      };
      
      // Add type-specific data based on the question type
      // This is crucial for storing data in the dedicated tables
      switch (questionType) {
        case QuestionTypeEnum.MULTIPLE_CHOICE:
        case QuestionTypeEnum.DROPDOWN:
        case QuestionTypeEnum.LIKERT_SCALE:
        case QuestionTypeEnum.RANKING:
          // For options-based questions
          if (questionData.options && Array.isArray(questionData.options)) {
            questionToAdd.options = questionData.options;
          }
          break;
          
        case QuestionTypeEnum.RATING_SCALE:
        case QuestionTypeEnum.SLIDER:
          // For scale-based questions
          if (questionData.scale) {
            questionToAdd.scale = questionData.scale;
          }
          break;
          
        case QuestionTypeEnum.MATRIX:
          // For matrix questions
          if (questionData.matrix) {
            questionToAdd.matrix = questionData.matrix;
          }
          break;
          
        case QuestionTypeEnum.IMAGE_CHOICE:
          // For image choice questions
          if (questionData.imageOptions) {
            questionToAdd.imageOptions = questionData.imageOptions;
          }
          break;
          
        case QuestionTypeEnum.OPEN_ENDED:
          // For open-ended questions
          if (questionData.openEndedSettings) {
            questionToAdd.openEndedSettings = questionData.openEndedSettings;
          }
          break;
          
        case QuestionTypeEnum.DICHOTOMOUS:
          // For dichotomous questions
          if (questionData.options && Array.isArray(questionData.options)) {
            questionToAdd.options = questionData.options;
          }
          break;
          
        case QuestionTypeEnum.DEMOGRAPHIC:
          // For demographic questions
          console.log('Processing demographic question in page.tsx');
          if (questionData.demographic) {
            console.log('Adding demographic data to question:', questionData.demographic);
            questionToAdd.demographic = questionData.demographic;
          }
          if (questionData.demographicOptions && Array.isArray(questionData.demographicOptions)) {
            console.log('Adding demographic options to question:', questionData.demographicOptions);
            questionToAdd.demographicOptions = questionData.demographicOptions;
          }
          break;
      }
      
      console.log('Question to add:', questionToAdd); // Debug log
      
      // Use the same admin email we retrieved earlier
      
      // Log the admin email being used
      console.log('Creating question with admin email:', currentAdminEmail);
      
      // Explicitly set admin context before creating the question
      await adminQuestionServices['setAdminContext'](currentAdminEmail);
      
      // Create the question with the admin email
      const newQuestion = await adminQuestionServices.createQuestion(questionToAdd, currentAdminEmail);
      
      // Refresh the question set to get the updated questions
      await refreshQuestionSet(selectedQuestionSet.id);
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
      // The service only accepts 'image', 'audio', 'video' for media_type
      // If mediaType is 'file', we'll map it to a compatible type for the service
      let mediaType: 'image' | 'audio' | 'video' | undefined = undefined;
      
      if (updatedQuestion.mediaType && updatedQuestion.mediaType !== 'text') {
        if (updatedQuestion.mediaType === 'file') {
          // Map 'file' to a type the service accepts (e.g., 'image')
          // This is a workaround for the type mismatch
          mediaType = 'image';
        } else {
          // For other types (image, audio, video), use as is
          mediaType = updatedQuestion.mediaType as 'image' | 'audio' | 'video';
        }
      }
      
      const questionToUpdate = {
        question: updatedQuestion.question,
        media_type: mediaType,
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
            mediaType: (q.media_type as "text" | "image" | "audio" | "video") || "text",
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
            mediaType: (q.media_type as "text" | "image" | "audio" | "video") || "text",
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
          onSubmit={(data) => {
            // Use type assertion to handle the type compatibility issue
            if (selectedQuestionSet) {
              handleUpdateQuestionSet(data as Partial<QuestionSet>);
            } else {
              handleCreateQuestionSet(data as Partial<QuestionSet>);
            }
          }}
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
