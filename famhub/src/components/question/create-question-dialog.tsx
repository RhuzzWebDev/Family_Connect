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
import { QuestionTypeEnum, DEMOGRAPHIC_TYPE, isDemographicQuestion, adminQuestionServices } from '@/services/AdminQuestionServices';

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
}: CreateQuestionDialogProps) {
  const [userId, setUserId] = useState<string>('');
  const [formData, setFormData] = useState({
    question: "",
    mediaType: "text" as "text" | "image" | "audio" | "video",
    type: QuestionTypeEnum.OPEN_ENDED as QuestionTypeEnum | typeof DEMOGRAPHIC_TYPE,
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
    // Fields for demographic questions
    demographicFieldType: "age", // age, gender, education, income, location, ethnicity, etc.
    demographicIsRequired: true,
    demographicHasOtherOption: true,
    demographicOptions: ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65 or older", "Prefer not to say"], // For demographic
    demographicExampleQuestion: "What is your age group?", // Example question text
  })
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const [adminEmail, setAdminEmail] = useState<string>('');

  useEffect(() => {
    const fetchAdminUserId = async () => {
      try {
        // Get the admin email from session storage or use a default
        const email = sessionStorage.getItem('adminEmail') || 'admin@famhub.com';
        setAdminEmail(email);
        
        console.log('Using admin email:', email);
        
        // Store the admin email in session storage for future use
        sessionStorage.setItem('adminEmail', email);
        
        // Get the default admin user ID from AdminQuestionServices
        const adminUserId = await adminQuestionServices.getAdminUserId(email);
        setUserId(adminUserId);
        
        console.log('Admin user ID set:', adminUserId);
      } catch (error) {
        console.error('Error fetching admin user ID:', error);
        setFileError('Error: Unable to get the admin user ID. Please try again.');
      }
    };
    
    fetchAdminUserId();
  }, []);

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
        video: ['video/mp4', 'video/webm', 'video/quicktime']
        // Note: 'file'/'document' type removed to match database enum constraints
      }
      
      if (formData.mediaType !== 'text' && !validTypes[formData.mediaType]?.includes(file.type)) {
        setFileError(`Invalid file type for ${formData.mediaType}. Please select a valid file.`)
        return
      }
    }
    
    setFormData((prev) => ({ ...prev, file }))
  }

  const handleMediaTypeChange = (value: "text" | "image" | "audio" | "video") => {
    setFormData((prev) => ({ ...prev, mediaType: value }))
  }

  const handleTypeChange = (value: QuestionTypeEnum) => {
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

  // Simple validation function
  const validateFormData = (data: typeof formData) => {
    const errors: string[] = [];
    
    if (!data.question.trim()) {
      errors.push('Question text is required');
    }
    
    // Add validation for specific question types
    switch (data.type) {
      case QuestionTypeEnum.MULTIPLE_CHOICE:
        if (data.options.filter(opt => opt.trim()).length < 2) {
          errors.push('Multiple choice questions require at least 2 options');
        }
        break;
      case QuestionTypeEnum.DROPDOWN:
        if (data.dropdownOptions.filter(opt => opt.trim()).length < 2) {
          errors.push('Dropdown questions require at least 2 options');
        }
        break;
      case QuestionTypeEnum.LIKERT_SCALE:
        if (data.likertOptions.filter(opt => opt.trim()).length < 2) {
          errors.push('Likert scale questions require at least 2 options');
        }
        break;
      case QuestionTypeEnum.RANKING:
        if (data.rankingItems.filter(item => item.trim()).length < 2) {
          errors.push('Ranking questions require at least 2 items');
        }
        break;
      case QuestionTypeEnum.DEMOGRAPHIC:
        if (!data.demographicFieldType.trim()) {
          errors.push('Demographic field type is required');
        }
        if (data.demographicOptions.filter(opt => opt.trim()).length < 2) {
          errors.push('Demographic questions require at least 2 options');
        }
        break;
    }
    
    return errors;
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate the form data
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors([]);
    setFileError('');
    
    // Make sure we have a user ID
    if (!userId) {
      try {
        // Try to get the admin user ID again
        const email = sessionStorage.getItem('userEmail') || sessionStorage.getItem('adminEmail') || 'admin@famhub.com';
        const adminUserId = await adminQuestionServices.getAdminUserId(email);
        setUserId(adminUserId);
        
        if (!adminUserId) {
          // If we still don't have a user ID, create a temporary one
          // This is a workaround for the RLS policy
          const tempUserId = `temp-${Date.now()}`;
          console.log('Using temporary user ID:', tempUserId);
          setUserId(tempUserId);
        }
      } catch (error) {
        console.error('Error fetching admin user ID:', error);
        // Create a temporary user ID as a fallback
        const tempUserId = `temp-${Date.now()}`;
        console.log('Using temporary user ID after error:', tempUserId);
        setUserId(tempUserId);
      }
    }
    
    try {
      setIsUploading(true)
      
      // Get the current user's email to ensure proper authentication
      const currentUserEmail = sessionStorage.getItem('userEmail') || sessionStorage.getItem('adminEmail') || 'admin@famhub.com';
      
      // Prepare the question data
      const questionData: any = {
        question: formData.question,
        type: formData.type,
        user_id: userId,
        question_set_id: questionSetId,
        file_url: null,
        folder_path: null,
        media_type: formData.mediaType !== 'text' ? formData.mediaType : undefined,
        // Add these fields to help with RLS policies
        created_by: currentUserEmail,
        updated_by: currentUserEmail,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Add question type-specific data
      switch (formData.type) {
        case QuestionTypeEnum.MULTIPLE_CHOICE:
        case QuestionTypeEnum.DROPDOWN:
        case QuestionTypeEnum.LIKERT_SCALE:
        case QuestionTypeEnum.DICHOTOMOUS:
        case QuestionTypeEnum.RANKING:
          // For options-based questions
          const options = formData.type === QuestionTypeEnum.MULTIPLE_CHOICE ? formData.options :
                          formData.type === QuestionTypeEnum.DROPDOWN ? formData.dropdownOptions :
                          formData.type === QuestionTypeEnum.LIKERT_SCALE ? formData.likertOptions :
                          formData.type === QuestionTypeEnum.DICHOTOMOUS ? formData.dichotomousOptions :
                          formData.rankingItems;
          
          questionData.options = options
            .filter(opt => opt.trim() !== '')
            .map((text, index) => ({
              option_text: text,
              option_order: index
            }));
          break;
          
        case QuestionTypeEnum.RATING_SCALE:
        case QuestionTypeEnum.SLIDER:
          // For scale-based questions
          questionData.scale = {
            min_value: formData.type === QuestionTypeEnum.RATING_SCALE ? formData.minRating : formData.sliderMin,
            max_value: formData.type === QuestionTypeEnum.RATING_SCALE ? formData.maxRating : formData.sliderMax,
            step_value: formData.type === QuestionTypeEnum.SLIDER ? formData.sliderStep : 1,
            default_value: formData.type === QuestionTypeEnum.SLIDER ? formData.sliderDefaultValue : undefined
          };
          break;
          
        case QuestionTypeEnum.MATRIX:
          // For matrix questions
          questionData.matrix = {
            rows: formData.matrixRows
              .filter(row => row.trim() !== '')
              .map((content, index) => ({
                is_row: true,
                content,
                item_order: index
              })),
            columns: formData.matrixColumns
              .filter(col => col.trim() !== '')
              .map((content, index) => ({
                is_row: false,
                content,
                item_order: index
              }))
          };
          break;
          
        case QuestionTypeEnum.IMAGE_CHOICE:
          // For image choice questions
          // In a real implementation, you would upload the images to storage
          // and get the URLs to store in the database
          questionData.imageOptions = formData.imageOptions
            .filter(opt => opt.trim() !== '')
            .map((text, index) => ({
              option_text: text,
              image_url: formData.imageFiles[index] ? 
                `https://example.com/images/${Date.now()}_${index}` : 
                'https://example.com/images/placeholder.png',
              option_order: index
            }));
          break;
          
        case QuestionTypeEnum.OPEN_ENDED:
          // For open-ended questions
          // Get the answer format and character limit from the form
          const answerFormatSelect = document.querySelector('select[name="answer-format"]') as HTMLSelectElement;
          const characterLimitInput = document.getElementById('character-limit') as HTMLInputElement;
          const requiredCheckbox = document.getElementById('required') as HTMLInputElement;
          
          questionData.openEndedSettings = {
            answer_format: answerFormatSelect?.value || 'text',
            character_limit: characterLimitInput?.value ? parseInt(characterLimitInput.value, 10) : undefined
          };
          break;
          
        case QuestionTypeEnum.DEMOGRAPHIC:
          console.log('===== PREPARING DEMOGRAPHIC QUESTION DATA =====');
          
          // Use the demographic type from the enum to ensure consistency
          console.log('Using demographic type from enum:', QuestionTypeEnum.DEMOGRAPHIC);
          console.log('Enum type value type:', typeof QuestionTypeEnum.DEMOGRAPHIC);
          
          // IMPORTANT: Use the enum value to ensure consistency with the database
          questionData.type = QuestionTypeEnum.DEMOGRAPHIC;
          console.log('Question type after assignment:', questionData.type);
          
          console.log('Demographic field type from form:', formData.demographicFieldType);
          console.log('Is required value:', formData.demographicIsRequired);
          console.log('Has other option value:', formData.demographicHasOtherOption);
          
          // For demographic questions - exactly match the question_demographic table structure from the SQL schema
          questionData.demographic = {
            // id will be generated by the database with uuid_generate_v4()
            question_id: '', // This will be filled in by the createQuestion method
            field_type: formData.demographicFieldType,
            is_required: formData.demographicIsRequired,
            has_other_option: formData.demographicHasOtherOption
            // created_at will be set by the database with CURRENT_TIMESTAMP
          };
          
          console.log('Demographic data prepared:', JSON.stringify(questionData.demographic, null, 2));
          
          // Process demographic options if available
          if (formData.demographicOptions && formData.demographicOptions.length > 0) {
            console.log('Processing demographic options:', formData.demographicOptions);
            
            // Filter out empty options and map to the correct format
            questionData.demographicOptions = formData.demographicOptions
              .filter(option => option.trim() !== '')
              .map((option, index) => ({
                option_text: option,
                option_order: index,
                // demographic_id will be filled in by the createQuestion method
              }));
              
            console.log('Demographic options prepared:', JSON.stringify(questionData.demographicOptions, null, 2));
          } else {
            console.log('No demographic options provided');
            questionData.demographicOptions = [];
          }
          
          console.log('Demographic question data prepared:', {
            type: questionData.type,
            demographic: questionData.demographic,
            demographicOptions: questionData.demographicOptions
          });
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
      
      // Add admin email to the question data for the parent component to use
      questionData.adminEmail = adminEmail || sessionStorage.getItem('adminEmail') || 'admin@famhub.com';
      
      console.log('Preparing question data with admin email:', questionData.adminEmail);
      
      // Submit the question data to the parent component without creating it directly
      // This prevents double insertion
      onSubmit(questionData);
      
      // Reset form after successful submission
      setFormData({
        question: "",
        mediaType: "text" as "text" | "image" | "audio" | "video",
        type: QuestionTypeEnum.OPEN_ENDED,
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
        demographicFieldType: "age",
        demographicIsRequired: true,
        demographicHasOtherOption: true,
        demographicOptions: ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65 or older", "Prefer not to say"],
        demographicExampleQuestion: "What is your age group?",
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
      {/* Display validation errors if any */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-[60] bg-red-900/90 text-white p-4 rounded-lg shadow-lg max-w-md">
          <h3 className="font-bold mb-2">Please fix the following errors:</h3>
          <ul className="list-disc pl-5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <button 
            className="absolute top-2 right-2 text-white hover:text-gray-200"
            onClick={(e) => { e.stopPropagation(); setErrors([]); }}
          >
            <X size={16} />
          </button>
        </div>
      )}
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
                          </p>
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept={formData.mediaType === 'image' ? 'image/*' :
                                  formData.mediaType === 'audio' ? 'audio/*' :
                                  formData.mediaType === 'video' ? 'video/*' : ''}
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
                    <SelectItem value={QuestionTypeEnum.MULTIPLE_CHOICE} className="focus:bg-gray-700">
                      Multiple choice questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.RATING_SCALE} className="focus:bg-gray-700">
                      Rating scale questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.LIKERT_SCALE} className="focus:bg-gray-700">
                      Likert scale questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.MATRIX} className="focus:bg-gray-700">
                      Matrix questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.DROPDOWN} className="focus:bg-gray-700">
                      Dropdown questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.OPEN_ENDED} className="focus:bg-gray-700">
                      Open-ended questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.IMAGE_CHOICE} className="focus:bg-gray-700">
                      Image choice questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.SLIDER} className="focus:bg-gray-700">
                      Slider questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.DICHOTOMOUS} className="focus:bg-gray-700">
                      Dichotomous questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.RANKING} className="focus:bg-gray-700">
                      Ranking questions
                    </SelectItem>
                    <SelectItem value={QuestionTypeEnum.DEMOGRAPHIC} className="focus:bg-gray-700">
                      Demographic questions
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.type === QuestionTypeEnum.OPEN_ENDED && (
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
              
              {formData.type === QuestionTypeEnum.IMAGE_CHOICE && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  {/* Document/file type removed to match database constraints */}
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
              
              {formData.type === QuestionTypeEnum.SLIDER && (
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
              
              {formData.type === QuestionTypeEnum.DICHOTOMOUS && (
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
              
              {formData.type === QuestionTypeEnum.RANKING && (
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
              
              {formData.type === QuestionTypeEnum.DEMOGRAPHIC && (
                <div className="space-y-4 mt-4 bg-[#111318] p-4 rounded-md border border-gray-800">
                  <div className="space-y-2">
                    <Label htmlFor="demographic-field-type">Demographic Field Type</Label>
                    <Select
                      value={formData.demographicFieldType}
                      onValueChange={(value) => {
                        // Update options based on selected demographic field type
                        let newOptions: string[] = [];
                        let exampleQuestion = "";
                        
                        switch(value) {
                          case "age":
                            newOptions = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65 or older", "Prefer not to say"];
                            exampleQuestion = "What is your age group?";
                            break;
                          case "gender":
                            newOptions = ["Male", "Female", "Non-binary", "Prefer to self-describe", "Prefer not to say"];
                            exampleQuestion = "What is your gender?";
                            break;
                          case "education":
                            newOptions = ["Less than high school", "High school graduate", "Some college", "Associate degree", "Bachelor's degree", "Master's degree", "Professional degree", "Doctorate", "Prefer not to say"];
                            exampleQuestion = "What is your highest level of education?";
                            break;
                          case "income":
                            newOptions = ["Less than $25,000", "$25,000 - $49,999", "$50,000 - $74,999", "$75,000 - $99,999", "$100,000 - $149,999", "$150,000 or more", "Prefer not to say"];
                            exampleQuestion = "What is your annual household income?";
                            break;
                          case "location":
                            newOptions = ["Urban", "Suburban", "Rural", "Prefer not to say"];
                            exampleQuestion = "Which best describes the area where you live?";
                            break;
                          case "ethnicity":
                            newOptions = ["Asian", "Black or African American", "Hispanic or Latino", "Native American", "White", "Two or more races", "Other", "Prefer not to say"];
                            exampleQuestion = "What is your ethnicity?";
                            break;
                          case "occupation":
                            newOptions = ["Student", "Employed full-time", "Employed part-time", "Self-employed", "Homemaker", "Retired", "Unemployed", "Prefer not to say"];
                            exampleQuestion = "What is your current employment status?";
                            break;
                          case "marital_status":
                            newOptions = ["Single", "Married", "Domestic partnership", "Divorced", "Separated", "Widowed", "Prefer not to say"];
                            exampleQuestion = "What is your marital status?";
                            break;
                          case "household_size":
                            newOptions = ["1 person", "2 people", "3 people", "4 people", "5 people", "6 or more people", "Prefer not to say"];
                            exampleQuestion = "How many people live in your household?";
                            break;
                          default:
                            newOptions = ["Option 1", "Option 2", "Option 3"];
                            exampleQuestion = "Demographic question";
                        }
                        
                        // Update form data with new field type, options, and example question
                        setFormData(prev => ({
                          ...prev,
                          demographicFieldType: value,
                          demographicOptions: newOptions,
                          demographicExampleQuestion: exampleQuestion,
                          // If the question is empty, suggest the example question
                          question: prev.question.trim() === "" ? exampleQuestion : prev.question
                        }));
                      }}
                    >
                      <SelectTrigger id="demographic-field-type" className="bg-[#111318] border-gray-800 text-white">
                        <SelectValue placeholder="Select field type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d24] border-gray-800 text-white">
                        <SelectItem value="age" className="focus:bg-gray-700">Age</SelectItem>
                        <SelectItem value="gender" className="focus:bg-gray-700">Gender</SelectItem>
                        <SelectItem value="education" className="focus:bg-gray-700">Education</SelectItem>
                        <SelectItem value="income" className="focus:bg-gray-700">Income</SelectItem>
                        <SelectItem value="location" className="focus:bg-gray-700">Location</SelectItem>
                        <SelectItem value="ethnicity" className="focus:bg-gray-700">Ethnicity</SelectItem>
                        <SelectItem value="occupation" className="focus:bg-gray-700">Occupation</SelectItem>
                        <SelectItem value="marital_status" className="focus:bg-gray-700">Marital Status</SelectItem>
                        <SelectItem value="household_size" className="focus:bg-gray-700">Household Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="example-question">Example Question</Label>
                    <div className="text-sm text-gray-400 p-2 bg-[#0d0f14] border border-gray-800 rounded">
                      {formData.demographicExampleQuestion}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, question: formData.demographicExampleQuestion }))}
                        className="ml-2 text-blue-500 hover:text-blue-400"
                      >
                        Use as question
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is-required"
                      checked={formData.demographicIsRequired}
                      onChange={(e) => setFormData(prev => ({ ...prev, demographicIsRequired: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-600 bg-[#111318] text-blue-600 focus:ring-blue-600"
                    />
                    <Label htmlFor="is-required" className="text-sm font-normal">Required field</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="has-other-option"
                      checked={formData.demographicHasOtherOption}
                      onChange={(e) => setFormData(prev => ({ ...prev, demographicHasOtherOption: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-600 bg-[#111318] text-blue-600 focus:ring-blue-600"
                    />
                    <Label htmlFor="has-other-option" className="text-sm font-normal">Include "Other" option</Label>
                  </div>
                  
                  <div className="mt-4">
                    <Label className="mb-2 block">Demographic Options</Label>
                    <div className="text-xs text-gray-500 mb-2">Customize the options for this demographic question</div>
                    {formData.demographicOptions.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <Input
                          value={option}
                          onChange={(e) => handleArrayFieldChange('demographicOptions', index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="bg-[#0d0f14] border-gray-800 text-white flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeArrayItem('demographicOptions', index)}
                          className="text-gray-400 hover:text-white"
                          disabled={formData.demographicOptions.length <= 2}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayItem('demographicOptions')}
                      className="mt-2 border-gray-700 text-white hover:bg-gray-800 w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                  
                  {/* Preview */}
                  <div className="mt-4">
                    <Label className="mb-2 block">Preview</Label>
                    <div className="p-4 bg-[#0d0f14] rounded-md border border-gray-700">
                      <div className="mb-3 font-medium">
                        {formData.question || formData.demographicExampleQuestion}
                        {formData.demographicIsRequired && <span className="text-red-500 ml-1">*</span>}
                      </div>
                      <div className="space-y-2">
                        {formData.demographicOptions.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full border border-gray-600"></div>
                            <span>{option || `Option ${index + 1}`}</span>
                          </div>
                        ))}
                        {formData.demographicHasOtherOption && (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded-full border border-gray-600"></div>
                            <span>Other (please specify)</span>
                            <Input 
                              disabled 
                              placeholder="Please specify" 
                              className="ml-2 w-40 bg-[#0d0f14] border-gray-800 text-gray-500 text-sm" 
                            />
                          </div>
                        )}
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
