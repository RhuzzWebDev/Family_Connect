"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, FileText, ImageIcon, Mic, Video, File } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Question {
  id: string
  question: string
  mediaType: "text" | "image" | "audio" | "video" | "file"
  type: string
  createdAt: string
}

interface QuestionDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question: Question
  onSave: (updatedQuestion: Partial<Question>) => void
}

export default function QuestionDetailDialog({
  open,
  onOpenChange,
  question,
  onSave,
}: QuestionDetailDialogProps) {
  // Debug log for the incoming question and form data
  if (question) {
    // eslint-disable-next-line no-console
    console.log('DetailDialog Question Prop:', question);
  }

  const [formData, setFormData] = useState({
    question: "",
    mediaType: "text" as "text" | "image" | "audio" | "video" | "file",
    type: "",
  })

  // All possible question types including custom types that might be in the database
  const allQuestionTypes = [
    "multiple-choice",
    "rating-scale",
    "likert-scale",
    "matrix",
    "dropdown",
    "open-ended",
    "demographic",
    "ranking",
    "file-upload",
    "image-choice",
    "slider",
    "dichotomous",
    "text" // Include "text" as a valid type since it exists in the database
  ];

  useEffect(() => {
    if (question) {
      // Debug log to verify the question type from Supabase
      console.log('Question type from database:', question.type);
      
      // Use the exact type from the database without correction
      const updatedFormData = {
        question: question.question,
        mediaType: question.mediaType,
        type: question.type,
      };
      
      console.log('Using exact question type in UI:', updatedFormData.type);
      setFormData(updatedFormData)
    }
  }, [question, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: typeof formData) => ({ ...prev, [name]: value }))
  }

  const handleMediaTypeChange = (value: "text" | "image" | "audio" | "video" | "file") => {
    setFormData((prev: typeof formData) => ({ ...prev, mediaType: value }))
  }

  const handleTypeChange = (value: string) => {
    setFormData((prev: typeof formData) => ({ ...prev, type: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
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
    text: <FileText className="h-4 w-4" />,
    image: <ImageIcon className="h-4 w-4" />,
    audio: <Mic className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    file: <File className="h-4 w-4" />,
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
    "multiple-choice",
    "dropdown",
    "likert-scale",
    "dichotomous",
    "ranking",
    "image-choice",
  ];

  // Type guard: is QuestionData
  function isQuestionData(q: unknown): q is import("../../services/AdminQuestionServices").QuestionData {
    return typeof q === 'object' && q !== null && ('options' in q || 'imageOptions' in q);
  }

  let typeSpecificOptions = null;
  if (question && optionBasedTypes.includes(question.type) && isQuestionData(question)) {
    // For image-choice, use imageOptions; otherwise use options
    const options = question.type === "image-choice" ? question.imageOptions : question.options;
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
                {mediaTypeIcons[question.mediaType]}
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
                {mediaTypeIcons[question.mediaType]}
                {question.mediaType.charAt(0).toUpperCase() + question.mediaType.slice(1)}
              </span>
              <span>•</span>
              <Badge variant="outline" className="border-gray-700 text-gray-300 bg-gray-800/50">
                {question.type}
              </Badge>
              <span>•</span>
              <span>Created: {formatDate(question.createdAt)}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-question">Question</Label>
                <Textarea
                  id="edit-question"
                  name="question"
                  value={formData.question}
                  onChange={handleChange}
                  className="bg-[#111318] border border-gray-800 text-white"
                  rows={3}
                />
              </div>
              {typeSpecificOptions}
              <div className="space-y-2">
                <Label>Media Type</Label>
                <RadioGroup
                  value={formData.mediaType}
                  onValueChange={handleMediaTypeChange}
                  className="flex flex-wrap gap-2 mt-2"
                >
                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="text" id="edit-media-text" />
                    <Label htmlFor="edit-media-text" className="flex items-center cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Text
                    </Label>
                  </div>

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

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="file" id="edit-media-file" />
                    <Label htmlFor="edit-media-file" className="flex items-center cursor-pointer">
                      <File className="h-4 w-4 mr-2" />
                      File
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question-type">Question Type</Label>
                
                {/* Simple HTML select element instead of shadcn/ui Select */}
                <div className="relative">
                  <select
                    id="question-type"
                    value={formData.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full p-2 bg-[#111318] border border-gray-800 rounded-md text-white"
                  >
                    <option value="multiple-choice">Multiple choice questions</option>
                    <option value="rating-scale">Rating scale questions</option>
                    <option value="likert-scale">Likert scale questions</option>
                    <option value="matrix">Matrix questions</option>
                    <option value="dropdown">Dropdown questions</option>
                    <option value="open-ended">Open-ended questions</option>
                    <option value="demographic">Demographic questions</option>
                    <option value="ranking">Ranking questions</option>
                    <option value="file-upload">File upload questions</option>
                    <option value="image-choice">Image choice questions</option>
                    <option value="slider">Slider questions</option>
                    <option value="dichotomous">Dichotomous questions</option>
                    <option value="text">Text questions</option>
                  </select>
                </div>
                
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  Current type: {formData.type || 'none'}
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
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
