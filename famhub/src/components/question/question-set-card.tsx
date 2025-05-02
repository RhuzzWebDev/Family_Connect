"use client"

import { MessageSquare, Edit, User, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuestionSetCardProps {
  questionSet: {
    id: string
    title: string
    questionCount: number
    description?: string
    author_name?: string
    resource_url?: string
    donate_url?: string
    cover_image?: string
  }
  onViewClick: (id: string) => void
  onEditClick: (id: string) => void
}

export default function QuestionSetCard({ questionSet, onViewClick, onEditClick }: QuestionSetCardProps) {
  return (
    <div 
      className="bg-[#111318] rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
      onClick={() => onViewClick(questionSet.id)}
    >
      {questionSet.cover_image && (
        <div className="w-full h-40 relative">
          <img 
            src={questionSet.cover_image} 
            alt={questionSet.title} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg text-white">{questionSet.title}</h3>
            {questionSet.author_name && (
              <div className="flex items-center text-sm text-gray-400 mt-1">
                <User className="h-3 w-3 mr-1" />
                <span>{questionSet.author_name}</span>
              </div>
            )}
            {questionSet.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{questionSet.description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(questionSet.id);
            }}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit Question Set</span>
          </Button>
        </div>

        <div className="flex items-center mt-4 text-sm text-gray-400 space-x-4">
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-1.5" />
            <span>{questionSet.questionCount} Questions</span>
          </div>
        </div>

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-transparent border-gray-700 hover:bg-gray-800 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onViewClick(questionSet.id);
            }}
          >
            View Questions
          </Button>
        </div>
      </div>
    </div>
  )
}
