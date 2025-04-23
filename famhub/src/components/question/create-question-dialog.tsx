"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { X, Plus, FileText, ImageIcon, Mic, Video, File } from "lucide-react"

interface CreateQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  questionSetId: string
}

export default function CreateQuestionDialog({
  open,
  onOpenChange,
  onSubmit,
  questionSetId,
}: CreateQuestionDialogProps) {
  const [formData, setFormData] = useState({
    question: "",
    mediaType: "text" as "text" | "image" | "audio" | "video" | "file",
    type: "open-ended",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMediaTypeChange = (value: "text" | "image" | "audio" | "video" | "file") => {
    setFormData((prev) => ({ ...prev, mediaType: value }))
  }

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      questionSetId,
    })
    onOpenChange(false)
    // Reset form
    setFormData({
      question: "",
      mediaType: "text",
      type: "open-ended",
    })
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
                <Plus className="h-4 w-4" />
              </div>
              <span className="font-medium text-lg">Add New Question</span>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  name="question"
                  value={formData.question}
                  onChange={handleChange}
                  placeholder="Enter your question"
                  className="bg-[#111318] border-gray-800 text-white min-h-[100px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Media Type</Label>
                <RadioGroup
                  value={formData.mediaType}
                  onValueChange={handleMediaTypeChange}
                  className="flex flex-wrap gap-2 mt-2"
                >
                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="text" id="media-text" />
                    <Label htmlFor="media-text" className="flex items-center cursor-pointer">
                      <FileText className="h-4 w-4 mr-2" />
                      Text
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="image" id="media-image" />
                    <Label htmlFor="media-image" className="flex items-center cursor-pointer">
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Image
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="audio" id="media-audio" />
                    <Label htmlFor="media-audio" className="flex items-center cursor-pointer">
                      <Mic className="h-4 w-4 mr-2" />
                      Audio
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="video" id="media-video" />
                    <Label htmlFor="media-video" className="flex items-center cursor-pointer">
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="file" id="media-file" />
                    <Label htmlFor="media-file" className="flex items-center cursor-pointer">
                      <File className="h-4 w-4 mr-2" />
                      File
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
                >
                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="multiple-choice" id="type-multiple-choice" />
                    <Label htmlFor="type-multiple-choice" className="cursor-pointer">
                      Multiple choice questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="rating-scale" id="type-rating-scale" />
                    <Label htmlFor="type-rating-scale" className="cursor-pointer">
                      Rating scale questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="likert-scale" id="type-likert-scale" />
                    <Label htmlFor="type-likert-scale" className="cursor-pointer">
                      Likert scale questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="matrix" id="type-matrix" />
                    <Label htmlFor="type-matrix" className="cursor-pointer">
                      Matrix questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="dropdown" id="type-dropdown" />
                    <Label htmlFor="type-dropdown" className="cursor-pointer">
                      Dropdown questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="open-ended" id="type-open-ended" />
                    <Label htmlFor="type-open-ended" className="cursor-pointer">
                      Open-ended questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="demographic" id="type-demographic" />
                    <Label htmlFor="type-demographic" className="cursor-pointer">
                      Demographic questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="ranking" id="type-ranking" />
                    <Label htmlFor="type-ranking" className="cursor-pointer">
                      Ranking questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="file-upload" id="type-file-upload" />
                    <Label htmlFor="type-file-upload" className="cursor-pointer">
                      File upload questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="image-choice" id="type-image-choice" />
                    <Label htmlFor="type-image-choice" className="cursor-pointer">
                      Image choice questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="slider" id="type-slider" />
                    <Label htmlFor="type-slider" className="cursor-pointer">
                      Slider questions
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 bg-[#111318] p-2 rounded-md border border-gray-800">
                    <RadioGroupItem value="dichotomous" id="type-dichotomous" />
                    <Label htmlFor="type-dichotomous" className="cursor-pointer">
                      Dichotomous questions
                    </Label>
                  </div>
                </RadioGroup>
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
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
