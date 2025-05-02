"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Maximize2, Minimize2, FileText, ImageIcon, Mic, Video, File, Eye, ExternalLink, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Question, QuestionSet, QuestionTypeData } from "@/types/question"
import { adminQuestionServices, QuestionTypeEnum } from '@/services/AdminQuestionServices'

interface QuestionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionSet: QuestionSet | null;
}

export default function QuestionViewDialog({
  open,
  onOpenChange,
  questionSet,
}: QuestionViewDialogProps) {
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loadingTypeData, setLoadingTypeData] = useState<Record<string, boolean>>({});
  const [typeSpecificData, setTypeSpecificData] = useState<Record<string, any>>({});
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewQuestionSet, setViewQuestionSet] = useState<QuestionSet | null>(null);

  useEffect(() => {
    // Set mounted to true after component mounts to enable animations
    if (open) {
      setMounted(true);
    } else {
      // Reset state when dialog closes
      setTimeout(() => setMounted(false), 300);
    }
  }, [open]);

  if (!questionSet) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getMediaTypeIcon = (mediaType: string | undefined) => {
    // Use mediaType or media_type property
    switch (mediaType) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "audio":
        return <Mic className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "file":
      case "document":
        return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Group questions by type
  const questionsByType: Record<string, Question[]> = {};
  (questionSet.questions || []).forEach(question => {
    if (!questionsByType[question.type]) {
      questionsByType[question.type] = [];
    }
    questionsByType[question.type].push(question);
  });

  // Get unique question types
  const questionTypes = Object.keys(questionsByType);

  // Fetch type-specific data for a question if not already loaded
  const fetchTypeSpecificData = async (questionId: string, questionType: string) => {
    // Skip if already loading or loaded
    if (loadingTypeData[questionId] || typeSpecificData[questionId]) return;
    
    try {
      // Mark as loading
      setLoadingTypeData(prev => ({ ...prev, [questionId]: true }));
      
      // Get admin email from session storage (or use a default for demo)
      const adminEmail = sessionStorage.getItem('adminEmail') || 'admin@example.com';
      
      // Fetch the question data with type-specific details
      const questionData = await adminQuestionServices.getQuestionWithTypeData(questionId, adminEmail);
      
      // Store the fetched data
      setTypeSpecificData(prev => ({ ...prev, [questionId]: questionData }));
    } catch (error) {
      console.error(`Error fetching type data for question ${questionId}:`, error);
    } finally {
      // Mark as not loading anymore
      setLoadingTypeData(prev => ({ ...prev, [questionId]: false }));
    }
  }
}
