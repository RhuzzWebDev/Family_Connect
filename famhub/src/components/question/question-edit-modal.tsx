"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Save, FileText, ImageIcon, Mic, Video, File } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { adminQuestionServices, QuestionData, QuestionTypeEnum } from "@/services/AdminQuestionServices"

interface QuestionEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: QuestionData
  onSave?: (updatedQuestion: QuestionData) => void
  adminEmail: string
}

export default function QuestionEditModal({
  open,
  onOpenChange,
  question,
  onSave,
  adminEmail,
}: QuestionEditModalProps) {
  // Debug log for the incoming question and form data
  useEffect(() => {
    if (question) {
      console.log('EditModal Question Prop:', question);
    }
  }, [question]);

  const [formData, setFormData] = useState<Partial<QuestionData>>({
    question: "",
    media_type: "image" as "image" | "video" | "audio",
    type: QuestionTypeEnum.MULTIPLE_CHOICE,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (question) {
      setFormData({
        question: question.question,
        media_type: question.media_type || "image",
        type: question.type,
      })
    }
  }, [question, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMediaTypeChange = (value: "image" | "video" | "audio") => {
    setFormData((prev) => ({ ...prev, media_type: value }))
  }

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value as QuestionTypeEnum }))
  }
  
  // Function to convert question type enum to readable label
  const getQuestionTypeLabel = (type: QuestionTypeEnum | string): string => {
    const typeLabels: Record<string, string> = {
      [QuestionTypeEnum.MULTIPLE_CHOICE]: 'Multiple choice questions',
      [QuestionTypeEnum.RATING_SCALE]: 'Rating scale questions',
      [QuestionTypeEnum.LIKERT_SCALE]: 'Likert scale questions',
      [QuestionTypeEnum.MATRIX]: 'Matrix questions',
      [QuestionTypeEnum.DROPDOWN]: 'Dropdown questions',
      [QuestionTypeEnum.OPEN_ENDED]: 'Open-ended questions',
      [QuestionTypeEnum.IMAGE_CHOICE]: 'Image choice questions',
      [QuestionTypeEnum.SLIDER]: 'Slider questions',
      [QuestionTypeEnum.DICHOTOMOUS]: 'Dichotomous questions',
      [QuestionTypeEnum.RANKING]: 'Ranking questions',
    }
    
    return typeLabels[type] || type.toString().replace(/-/g, ' ')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.id) {
      toast.error("Question ID is missing")
      return
    }

    try {
      setLoading(true)
      
      // Only include fields that are actually changing to avoid validation errors
      const updateData: Partial<QuestionData> = {
        question: formData.question,
        media_type: formData.media_type,
        // Keep the original type to avoid type-specific data issues
        type: question.type as QuestionTypeEnum,
        // Preserve other important fields
        user_id: question.user_id
      }
      
      console.log('Updating question with data:', updateData)
      
      // Update the question using AdminQuestionServices
      const updatedQuestion = await adminQuestionServices.updateQuestion(
        question.id,
        updateData,
        adminEmail
      )

      // Call the onSave callback if provided
      if (onSave) {
        onSave(updatedQuestion)
      }

      toast.success("Question updated successfully")

      // Close the modal
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating question:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update question")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }

  const mediaTypeIcons = {
    image: <ImageIcon className="h-4 w-4" />,
    audio: <Mic className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
  }

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted to true after component mounts to enable animations
    if (open) {
      setMounted(true)
    } else {
      // Reset state when dialog closes
      setTimeout(() => setMounted(false), 300)
    }
  }, [open])

  // Render options if present and type is option-based
  const optionBasedTypes = [
    QuestionTypeEnum.MULTIPLE_CHOICE,
    QuestionTypeEnum.DROPDOWN,
    QuestionTypeEnum.LIKERT_SCALE,
    QuestionTypeEnum.DICHOTOMOUS,
    QuestionTypeEnum.RANKING,
    QuestionTypeEnum.IMAGE_CHOICE,
  ];

  let typeSpecificOptions = null;
  if (question && optionBasedTypes.includes(question.type as QuestionTypeEnum)) {
    // For image-choice, use imageOptions; otherwise use options
    const options = question.type === QuestionTypeEnum.IMAGE_CHOICE ? question.imageOptions : question.options;
    if (Array.isArray(options) && options.length > 0) {
      typeSpecificOptions = (
        <div className="my-4">
          <div className="text-xs text-blue-300 mb-1">Options:</div>
          <ul className="space-y-2 bg-gray-900/30 p-3 rounded-md border border-gray-800">
            {options.map((option: any, idx: number) => (
              <li key={option.id || idx} className="flex items-center gap-3 text-gray-300 mb-2 p-2 bg-gray-800/30 rounded border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono text-sm">{option.option_order}</span>
                  <span className="text-white">{option.option_text || option.item_text}</span>
                </div>
                {option.image_url && (
                  <img
                    src={option.image_url}
                    alt={option.option_text || "Image option"}
                    className="w-12 h-12 object-cover rounded ml-2 border border-blue-800"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-1/3 bg-black/70 transform transition-all duration-300 ease-in-out ${mounted ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full bg-[#1a1d24] text-white flex flex-col overflow-hidden rounded-l-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
                {question.media_type && mediaTypeIcons[question.media_type]}
              </div>
              <span className="font-medium text-lg">Edit Question</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-gray-400 hover:text-white" 
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-grow overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                {question.media_type && mediaTypeIcons[question.media_type]}
                {question.media_type && question.media_type.charAt(0).toUpperCase() + question.media_type.slice(1)}
              </span>
              <span>•</span>
              <Badge variant="outline" className="border-gray-700 text-gray-300 bg-gray-800/50">
                {question.type}
              </Badge>
              <span>•</span>
              <span>Created: {question.created_at ? formatDate(question.created_at) : 'N/A'}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  name="question"
                  value={formData.question || ''}
                  onChange={handleChange}
                  className="bg-[#111318] border border-gray-800 text-white"
                  rows={3}
                />
              </div>
              {typeSpecificOptions}
              <div className="space-y-2">
                <Label>Media Type</Label>
                <RadioGroup
                  value={formData.media_type}
                  onValueChange={handleMediaTypeChange}
                  className="flex flex-wrap gap-2 mt-2"
                >
                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="image" id="edit-media-image" />
                    <Label htmlFor="edit-media-image" className="flex items-center cursor-pointer">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Image
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="audio" id="edit-media-audio" />
                    <Label htmlFor="edit-media-audio" className="flex items-center cursor-pointer">
                      <Mic className="h-4 w-4 mr-2" />
                      Audio
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="video" id="edit-media-video" />
                    <Label htmlFor="edit-media-video" className="flex items-center cursor-pointer">
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={handleTypeChange}
                  className="flex flex-col space-y-2 mt-2"
                  disabled
                >
                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value={question.type} id={`edit-type-${question.type}`} disabled />
                    <Label htmlFor={`edit-type-${question.type}`} className="cursor-pointer">
                      {getQuestionTypeLabel(question.type)}
                    </Label>
                  </div>
                </RadioGroup>
                <div className="mt-2 text-xs text-blue-400">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Question type cannot be changed during editing
                  </span>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-gray-700 text-white hover:bg-gray-800"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
