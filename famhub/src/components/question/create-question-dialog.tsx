"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { X, Plus, FileText, ImageIcon, Mic, Video, File, Upload, ChevronDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CreateQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  questionSetId: string
  userId?: string // Optional user ID for attribution
}

export default function CreateQuestionDialog({
  open,
  onOpenChange,
  onSubmit,
  questionSetId,
  userId = '00000000-0000-0000-0000-000000000000', // Default user ID if not provided
}: CreateQuestionDialogProps) {
  const [formData, setFormData] = useState({
    question: "",
    mediaType: "text" as "text" | "image" | "audio" | "video" | "file",
    type: "open-ended",
    file: null as File | null,
    // Fields for different question types
    options: ["", ""], // For multiple-choice
    minRating: 1, // For rating-scale
    maxRating: 5, // For rating-scale
    likertOptions: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"], // For likert-scale
    matrixRows: ["", ""], // For matrix
    matrixColumns: ["Yes", "No", "Maybe"], // For matrix
    dropdownOptions: ["", ""], // For dropdown
    imageOptions: ["", ""], // For image-choice
    imageFiles: [null, null] as (File | null)[], // For image-choice
    sliderMin: 0, // For slider
    sliderMax: 100, // For slider
    sliderStep: 1, // For slider
    sliderDefaultValue: 50, // For slider
    dichotomousOptions: ["Yes", "No"], // For dichotomous
    rankingItems: ["", ""], // For ranking
  })
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0] || null
    
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setFileError('File size exceeds 5MB limit')
        return
      }
      
      // Validate file type based on selected media type
      const validTypes: Record<string, string[]> = {
        image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
        video: ['video/mp4', 'video/webm', 'video/quicktime'],
        file: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      }
      
      if (formData.mediaType !== 'text' && !validTypes[formData.mediaType]?.includes(file.type)) {
        setFileError(`Invalid file type for ${formData.mediaType}. Please select a valid file.`)
        return
      }
    }
    
    setFormData((prev) => ({ ...prev, file }))
  }

  const handleMediaTypeChange = (value: "text" | "image" | "audio" | "video" | "file") => {
    setFormData((prev) => ({ ...prev, mediaType: value }))
  }

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value }))
  }
  
  // Handle array field changes (options, matrix rows/columns, etc.)
  const handleArrayFieldChange = (fieldName: string, index: number, value: string) => {
    setFormData((prev) => {
      const newArray = [...(prev[fieldName as keyof typeof prev] as string[])];
      newArray[index] = value;
      return { ...prev, [fieldName]: newArray };
    });
  };
  
  // Add a new item to an array field
  const addArrayItem = (fieldName: string) => {
    setFormData((prev) => {
      const newArray = [...(prev[fieldName as keyof typeof prev] as string[]), ""];
      return { ...prev, [fieldName]: newArray };
    });
  };
  
  // Remove an item from an array field
  const removeArrayItem = (fieldName: string, index: number) => {
    setFormData((prev) => {
      const array = prev[fieldName as keyof typeof prev] as string[];
      // Don't remove if there are only 2 items left (minimum required)
      if (array.length <= 2) return prev;
      
      const newArray = [...array];
      newArray.splice(index, 1);
      return { ...prev, [fieldName]: newArray };
    });
  };
  
  // Handle numeric field changes (min/max rating, etc.)
  const handleNumericChange = (fieldName: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData((prev) => ({ ...prev, [fieldName]: numValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFileError(null)
    
    try {
      setIsUploading(true)
      
      // Prepare the question data
      const questionData: any = {
        question: formData.question,
        type: formData.type,
        mediaType: formData.mediaType,
        questionSetId: questionSetId,
        userId: userId,
        file_url: null,
        folder_path: null,
        media_type: formData.mediaType,
        like_count: 0,
        comment_count: 0,
      }
      
      // Add question type-specific data
      switch (formData.type) {
        case 'multiple-choice':
          questionData.options = formData.options.filter(opt => opt.trim() !== '');
          break;
        case 'rating-scale':
          questionData.minRating = formData.minRating;
          questionData.maxRating = formData.maxRating;
          break;
        case 'likert-scale':
          questionData.likertOptions = formData.likertOptions.filter(opt => opt.trim() !== '');
          break;
        case 'matrix':
          questionData.matrixRows = formData.matrixRows.filter(row => row.trim() !== '');
          questionData.matrixColumns = formData.matrixColumns.filter(col => col.trim() !== '');
          break;
        case 'dropdown':
          questionData.dropdownOptions = formData.dropdownOptions.filter(opt => opt.trim() !== '');
          break;
        case 'image-choice':
          questionData.imageOptions = formData.imageOptions.filter(opt => opt.trim() !== '');
          // Handle image files separately if needed
          break;
        case 'slider':
          questionData.sliderMin = formData.sliderMin;
          questionData.sliderMax = formData.sliderMax;
          questionData.sliderStep = formData.sliderStep;
          questionData.sliderDefaultValue = formData.sliderDefaultValue;
          break;
        case 'dichotomous':
          questionData.dichotomousOptions = formData.dichotomousOptions;
          break;
        case 'ranking':
          questionData.rankingItems = formData.rankingItems.filter(item => item.trim() !== '');
          break;
      }
      
      // Handle file upload if media type is not text
      if (formData.mediaType !== 'text' && formData.file) {
        // Get user details for folder path construction
        // This would typically come from a user context or session
        // For now, we'll use a placeholder
        const userDetails = {
          last_name: 'Smith',
          first_name: 'John',
          role: 'Father',
          persona: 'Parent'
        }
        
        // Construct folder path based on user role
        let folderPath = ''
        if (userDetails.persona === 'Parent') {
          folderPath = `/uploads/${userDetails.last_name}/${userDetails.first_name}/`
        } else {
          folderPath = `/uploads/other/${userDetails.first_name}/`
        }
        
        // Create a timestamp prefix for the file name to ensure uniqueness
        const timestamp = Date.now()
        const fileName = `${timestamp}_${formData.file.name}`
        
        // In a real implementation, you would upload the file to your storage service here
        // For this example, we'll simulate a successful upload
        const fileUrl = `https://example.com${folderPath}${fileName}`
        
        questionData.file_url = fileUrl
        questionData.folder_path = folderPath
      }
      
      // Submit the question data
      onSubmit(questionData)
      
      // Reset form after successful submission
      setFormData({
        question: "",
        mediaType: "text",
        type: "open-ended",
        file: null,
        options: ["", ""],
        minRating: 1,
        maxRating: 5,
        likertOptions: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
        matrixRows: ["", ""],
        matrixColumns: ["Yes", "No", "Maybe"],
        dropdownOptions: ["", ""],
        imageOptions: ["", ""],
        imageFiles: [null, null],
        sliderMin: 0,
        sliderMax: 100,
        sliderStep: 1,
        sliderDefaultValue: 50,
        dichotomousOptions: ["Yes", "No"],
        rankingItems: ["", ""],
      })
      
      // Close the dialog
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating question:', error)
      setFileError('An error occurred while creating the question. Please try again.')
    } finally {
      setIsUploading(false)
    }
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
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-1/2 bg-black/70 transform transition-all duration-300 ease-in-out ${mounted ? 'translate-x-0' : 'translate-x-full'}`}
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

              {fileError && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300 mb-4">
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="media-type">Media Type</Label>
                <Select
                  value={formData.mediaType}
                  onValueChange={handleMediaTypeChange}
                >
                  <SelectTrigger className="bg-[#111318] border-gray-800 text-white">
                    <SelectValue placeholder="Select media type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d24] border-gray-800 text-white">
                    <SelectItem value="text" className="focus:bg-gray-700">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Text</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="image" className="focus:bg-gray-700">
                      <div className="flex items-center">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        <span>Image</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="audio" className="focus:bg-gray-700">
                      <div className="flex items-center">
                        <Mic className="h-4 w-4 mr-2" />
                        <span>Audio</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="video" className="focus:bg-gray-700">
                      <div className="flex items-center">
                        <Video className="h-4 w-4 mr-2" />
                        <span>Video</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="file" className="focus:bg-gray-700">
                      <div className="flex items-center">
                        <File className="h-4 w-4 mr-2" />
                        <span>File</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.mediaType !== 'text' && (
                <div className="space-y-2 mt-4">
                  <Label htmlFor="file-upload">{`${formData.mediaType.charAt(0).toUpperCase() + formData.mediaType.slice(1)} Upload`}</Label>
                  <div className="bg-[#111318] border border-gray-800 rounded-md p-4">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-[#0d0f14] hover:bg-[#14171e] transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-400">
                            <span className="font-medium">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            {formData.mediaType === 'image' && 'JPG, PNG, GIF, WEBP (MAX. 5MB)'}
                            {formData.mediaType === 'audio' && 'MP3, WAV, OGG (MAX. 5MB)'}
                            {formData.mediaType === 'video' && 'MP4, WEBM, MOV (MAX. 5MB)'}
                            {formData.mediaType === 'file' && 'PDF, DOC, DOCX, TXT (MAX. 5MB)'}
                          </p>
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept={formData.mediaType === 'image' ? 'image/*' :
                                  formData.mediaType === 'audio' ? 'audio/*' :
                                  formData.mediaType === 'video' ? 'video/*' :
                                  formData.mediaType === 'file' ? '.pdf,.doc,.docx,.txt' : ''}
                        />
                      </label>
                    </div>
                    {formData.file && (
                      <div className="mt-2 text-sm text-gray-400">
                        Selected file: {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="question-type">Question Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger className="bg-[#111318] border-gray-800 text-white">
                    <SelectValue placeholder="Select question type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d24] border-gray-800 text-white max-h-[300px]">
                    <SelectItem value="multiple-choice" className="focus:bg-gray-700">
                      Multiple choice questions
                    </SelectItem>
                    <SelectItem value="rating-scale" className="focus:bg-gray-700">
                      Rating scale questions
                    </SelectItem>
                    <SelectItem value="likert-scale" className="focus:bg-gray-700">
                      Likert scale questions
                    </SelectItem>
                    <SelectItem value="matrix" className="focus:bg-gray-700">
                      Matrix questions
                    </SelectItem>
                    <SelectItem value="dropdown" className="focus:bg-gray-700">
                      Dropdown questions
                    </SelectItem>
                    <SelectItem value="open-ended" className="focus:bg-gray-700">
                      Open-ended questions
                    </SelectItem>
                    <SelectItem value="image-choice" className="focus:bg-gray-700">
                      Image choice questions
                    </SelectItem>
                    <SelectItem value="slider" className="focus:bg-gray-700">
                      Slider questions
                    </SelectItem>
                    <SelectItem value="dichotomous" className="focus:bg-gray-700">
                      Dichotomous questions
                    </SelectItem>
                    <SelectItem value="ranking" className="focus:bg-gray-700">
                      Ranking questions
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Question Type Specific Fields */}
              {formData.type === 'multiple-choice' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Multiple Choice Options</Label>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => handleArrayFieldChange('options', index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem('options', index)}
                        className="text-gray-400 hover:text-white"
                        disabled={formData.options.length <= 2}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('options')}
                    className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              )}
              
              {formData.type === 'rating-scale' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Rating Scale</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="min-rating">Minimum Rating</Label>
                      <Input
                        id="min-rating"
                        type="number"
                        value={formData.minRating}
                        onChange={(e) => handleNumericChange('minRating', e.target.value)}
                        min="0"
                        max={formData.maxRating - 1}
                        className="bg-[#0d0f14] border-gray-800 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max-rating">Maximum Rating</Label>
                      <Input
                        id="max-rating"
                        type="number"
                        value={formData.maxRating}
                        onChange={(e) => handleNumericChange('maxRating', e.target.value)}
                        min={formData.minRating + 1}
                        max="10"
                        className="bg-[#0d0f14] border-gray-800 text-white mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    {Array.from({ length: formData.maxRating - formData.minRating + 1 }, (_, i) => (
                      <div key={i} className="text-center">
                        <div className="w-8 h-8 rounded-full bg-[#0d0f14] border border-gray-700 flex items-center justify-center mb-1">
                          {formData.minRating + i}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {formData.type === 'likert-scale' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Likert Scale Options</Label>
                  {formData.likertOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => handleArrayFieldChange('likertOptions', index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem('likertOptions', index)}
                        className="text-gray-400 hover:text-white"
                        disabled={formData.likertOptions.length <= 2}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('likertOptions')}
                    className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              )}
              
              {formData.type === 'matrix' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <div>
                    <Label className="mb-2 block">Matrix Rows (Questions)</Label>
                    {formData.matrixRows.map((row, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <Input
                          value={row}
                          onChange={(e) => handleArrayFieldChange('matrixRows', index, e.target.value)}
                          placeholder={`Row ${index + 1}`}
                          className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeArrayItem('matrixRows', index)}
                          className="text-gray-400 hover:text-white"
                          disabled={formData.matrixRows.length <= 2}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayItem('matrixRows')}
                      className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>
                  
                  <div className="mt-4">
                    <Label className="mb-2 block">Matrix Columns (Options)</Label>
                    {formData.matrixColumns.map((column, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <Input
                          value={column}
                          onChange={(e) => handleArrayFieldChange('matrixColumns', index, e.target.value)}
                          placeholder={`Column ${index + 1}`}
                          className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeArrayItem('matrixColumns', index)}
                          className="text-gray-400 hover:text-white"
                          disabled={formData.matrixColumns.length <= 2}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayItem('matrixColumns')}
                      className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Column
                    </Button>
                  </div>
                  
                  {/* Matrix Preview */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border border-gray-700 bg-[#0d0f14]"></th>
                          {formData.matrixColumns.map((column, index) => (
                            <th key={index} className="p-2 border border-gray-700 bg-[#0d0f14] text-sm">
                              {column || `Column ${index + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {formData.matrixRows.map((row, index) => (
                          <tr key={index}>
                            <td className="p-2 border border-gray-700 bg-[#0d0f14] text-sm">
                              {row || `Row ${index + 1}`}
                            </td>
                            {formData.matrixColumns.map((_, colIndex) => (
                              <td key={colIndex} className="p-2 border border-gray-700 text-center">
                                <div className="w-4 h-4 rounded-full border border-gray-600 mx-auto"></div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {formData.type === 'dropdown' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Dropdown Options</Label>
                  {formData.dropdownOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => handleArrayFieldChange('dropdownOptions', index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem('dropdownOptions', index)}
                        className="text-gray-400 hover:text-white"
                        disabled={formData.dropdownOptions.length <= 2}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('dropdownOptions')}
                    className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              )}
              
              {formData.type === 'open-ended' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Open-Ended Question Settings</Label>
                  <div className="space-y-2">
                    <Label htmlFor="answer-format">Expected Answer Format</Label>
                    <Select defaultValue="text">
                      <SelectTrigger className="bg-[#0d0f14] border-gray-800 text-white">
                        <SelectValue placeholder="Select answer format" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d24] border-gray-800 text-white">
                        <SelectItem value="text" className="focus:bg-gray-700">Short text (single line)</SelectItem>
                        <SelectItem value="paragraph" className="focus:bg-gray-700">Paragraph (multiple lines)</SelectItem>
                        <SelectItem value="number" className="focus:bg-gray-700">Number</SelectItem>
                        <SelectItem value="date" className="focus:bg-gray-700">Date</SelectItem>
                        <SelectItem value="email" className="focus:bg-gray-700">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="required">Required Answer</Label>
                      <div className="flex h-6 items-center">
                        <input
                          id="required"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-700 bg-[#0d0f14] text-blue-600 focus:ring-blue-600"
                          defaultChecked
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="character-limit">Character Limit</Label>
                      <Input
                        id="character-limit"
                        type="number"
                        className="w-24 bg-[#0d0f14] border-gray-800 text-white"
                        placeholder="None"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {formData.type === 'image-choice' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Image Choice Options</Label>
                  <div className="text-sm text-gray-400 mb-2">
                    Add images and labels for each choice option
                  </div>
                  {formData.imageOptions.map((option, index) => (
                    <div key={index} className="space-y-2 p-3 border border-gray-700 rounded-md">
                      <div className="flex items-center justify-between">
                        <Label>Option {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeArrayItem('imageOptions', index)}
                          className="text-gray-400 hover:text-white"
                          disabled={formData.imageOptions.length <= 2}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Input
                        value={option}
                        onChange={(e) => handleArrayFieldChange('imageOptions', index, e.target.value)}
                        placeholder="Option label"
                        className="bg-[#0d0f14] border-gray-800 text-white mb-2"
                      />
                      
                      <div className="bg-[#0d0f14] border border-gray-800 rounded-md p-3">
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor={`image-upload-${index}`}
                            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer bg-[#0d0f14] hover:bg-[#14171e] transition-colors"
                          >
                            {formData.imageFiles[index] ? (
                              <div className="flex flex-col items-center justify-center">
                                <img 
                                  src={URL.createObjectURL(formData.imageFiles[index]!)}
                                  alt={`Option ${index + 1}`}
                                  className="h-20 max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                                <p className="text-xs text-gray-500">Upload image (JPG, PNG, GIF)</p>
                              </div>
                            )}
                            <input
                              id={`image-upload-${index}`}
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file) {
                                  // Update the imageFiles array
                                  const newImageFiles = [...formData.imageFiles];
                                  newImageFiles[index] = file;
                                  setFormData(prev => ({ ...prev, imageFiles: newImageFiles }));
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      addArrayItem('imageOptions');
                      // Also add a null entry to imageFiles
                      setFormData(prev => ({
                        ...prev,
                        imageFiles: [...prev.imageFiles, null]
                      }));
                    }}
                    className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Image Option
                  </Button>
                </div>
              )}
              
              {formData.type === 'slider' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Slider Settings</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="slider-min">Minimum Value</Label>
                      <Input
                        id="slider-min"
                        type="number"
                        value={formData.sliderMin}
                        onChange={(e) => handleNumericChange('sliderMin', e.target.value)}
                        className="bg-[#0d0f14] border-gray-800 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="slider-max">Maximum Value</Label>
                      <Input
                        id="slider-max"
                        type="number"
                        value={formData.sliderMax}
                        onChange={(e) => handleNumericChange('sliderMax', e.target.value)}
                        className="bg-[#0d0f14] border-gray-800 text-white mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="slider-step">Step Size</Label>
                      <Input
                        id="slider-step"
                        type="number"
                        value={formData.sliderStep}
                        onChange={(e) => handleNumericChange('sliderStep', e.target.value)}
                        min="1"
                        className="bg-[#0d0f14] border-gray-800 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="slider-default">Default Value</Label>
                      <Input
                        id="slider-default"
                        type="number"
                        value={formData.sliderDefaultValue}
                        onChange={(e) => handleNumericChange('sliderDefaultValue', e.target.value)}
                        min={formData.sliderMin}
                        max={formData.sliderMax}
                        className="bg-[#0d0f14] border-gray-800 text-white mt-1"
                      />
                    </div>
                  </div>
                  
                  {/* Slider Preview */}
                  <div className="mt-4">
                    <Label className="mb-2 block">Preview</Label>
                    <div className="p-4 bg-[#0d0f14] rounded-md border border-gray-700">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{formData.sliderMin}</span>
                        <span>{formData.sliderMax}</span>
                      </div>
                      <input
                        type="range"
                        min={formData.sliderMin}
                        max={formData.sliderMax}
                        step={formData.sliderStep}
                        value={formData.sliderDefaultValue}
                        onChange={(e) => handleNumericChange('sliderDefaultValue', e.target.value)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="text-center mt-2 text-sm text-blue-400">
                        Current value: {formData.sliderDefaultValue}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {formData.type === 'dichotomous' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Dichotomous Question Options</Label>
                  <div className="text-sm text-gray-400 mb-2">
                    Customize the binary options for your yes/no question
                  </div>
                  {formData.dichotomousOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => handleArrayFieldChange('dichotomousOptions', index, e.target.value)}
                        placeholder={index === 0 ? "Positive option (e.g., Yes)" : "Negative option (e.g., No)"}
                        className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                      />
                    </div>
                  ))}
                  
                  {/* Preview */}
                  <div className="mt-4">
                    <Label className="mb-2 block">Preview</Label>
                    <div className="p-4 bg-[#0d0f14] rounded-md border border-gray-700 flex justify-center gap-4">
                      {formData.dichotomousOptions.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded-full border border-gray-600"></div>
                          <span>{option || (index === 0 ? "Yes" : "No")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {formData.type === 'ranking' && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <Label>Ranking Items</Label>
                  <div className="text-sm text-gray-400 mb-2">
                    Add items that respondents will rank in order of preference
                  </div>
                  {formData.rankingItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0d0f14] border border-gray-700 flex items-center justify-center">
                        {index + 1}
                      </div>
                      <Input
                        value={item}
                        onChange={(e) => handleArrayFieldChange('rankingItems', index, e.target.value)}
                        placeholder={`Item ${index + 1}`}
                        className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeArrayItem('rankingItems', index)}
                        className="text-gray-400 hover:text-white"
                        disabled={formData.rankingItems.length <= 2}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('rankingItems')}
                    className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                  
                  {/* Preview */}
                  <div className="mt-4">
                    <Label className="mb-2 block">Preview</Label>
                    <div className="p-4 bg-[#0d0f14] rounded-md border border-gray-700">
                      <div className="space-y-2">
                        {formData.rankingItems.map((item, index) => (
                          <div key={index} className="flex items-center p-2 bg-[#1a1d24] rounded border border-gray-700">
                            <div className="mr-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                              {index + 1}
                            </div>
                            <div className="flex-1">{item || `Item ${index + 1}`}</div>
                            <div className="flex-shrink-0">
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-800 flex justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="mr-2 border-gray-700 text-white hover:bg-gray-800"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
