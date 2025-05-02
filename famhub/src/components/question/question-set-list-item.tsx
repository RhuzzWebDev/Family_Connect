"use client"

import { MessageSquare, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuestionSetListItemProps {
  questionSet: {
    id: string
    title: string
    questionCount: number
    description?: string
  }
  onViewClick: (id: string) => void
  onEditClick: (id: string) => void
}

export default function QuestionSetListItem({ questionSet, onViewClick, onEditClick }: QuestionSetListItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800 hover:bg-[#1a1d24]">
      <div className="flex-1">
        <h3 className="font-medium">{questionSet.title}</h3>
        {questionSet.description && <p className="text-sm text-gray-400 mt-1">{questionSet.description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <MessageSquare className="h-4 w-4" />
          <span>{questionSet.questionCount} Questions</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation()
            onEditClick(questionSet.id)
          }}
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Edit Question Set</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="bg-transparent border-gray-700 hover:bg-gray-800"
          onClick={() => onViewClick(questionSet.id)}
        >
          View Questions
        </Button>
      </div>
    </div>
  )
}
