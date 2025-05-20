"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, FileText, ImageIcon, Mic, Video, File, Loader2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { adminQuestionServices } from "@/services/AdminQuestionServices";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  mediaType: "text" | "image" | "audio" | "video" | "file";
  type: string;
  createdAt: string;
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
  
  // Add state for loading the complete question data
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [completeQuestionData, setCompleteQuestionData] = useState<import("../../services/AdminQuestionServices").QuestionData | null>(null)
  
  // Add state for editing mode and saving
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedData, setEditedData] = useState<Record<string, any>>({})

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
    if (question && open) {
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
      
      // Set editing state to true when dialog opens
      setIsEditing(true);
      setEditedData({});
      
      // Fetch the complete question data with type-specific properties
      const fetchCompleteQuestionData = async () => {
        try {
          setLoadingDetails(true);
          // Use the admin email from session storage or a default
          const adminEmail = sessionStorage.getItem('adminEmail') || 'sysadmin@familyconnect.com';
          
          // Fetch the complete question data with all type-specific properties
          const completeData = await adminQuestionServices.getQuestionWithTypeData(question.id, adminEmail);
          console.log('Fetched complete question data:', completeData);
          
          setCompleteQuestionData(completeData);
        } catch (error) {
          console.error('Error fetching complete question data:', error);
        } finally {
          setLoadingDetails(false);
        }
      };
      
      fetchCompleteQuestionData();
    } else {
      // Reset the complete question data when the dialog closes
      setCompleteQuestionData(null);
      setIsEditing(false);
      setEditedData({});
    }
  }, [question, open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  // Handle changes to editable fields
  const handleEditableChange = (field: string, value: any, parentField?: string) => {
    if (parentField) {
      // For nested fields like scale.min_value
      setEditedData({
        ...editedData,
        [parentField]: {
          ...(editedData[parentField] as Record<string, any> || {}),
          [field]: value
        }
      });
    } else {
      // For top-level fields
      setEditedData({
        ...editedData,
        [field]: value
      });
    }
  };
  
  // Save changes to the question
  const handleSaveChanges = async () => {
    if (!completeQuestionData || !question) return;
    
    try {
      setIsSaving(true);
      const adminEmail = sessionStorage.getItem('adminEmail') || 'sysadmin@familyconnect.com';
      
      // Create a new object for the updated data to avoid TypeScript issues
      const updatedData: import("../../services/AdminQuestionServices").QuestionData = {
        ...completeQuestionData
      };
      
      // Apply edits to the question data using a type-safe approach
      if (editedData.question) {
        updatedData.question = editedData.question;
      }
      
      // Handle scale edits
      if (editedData.scale && updatedData.scale) {
        updatedData.scale = {
          ...updatedData.scale,
          ...editedData.scale
        };
      }
      
      // Handle options edits
      if (editedData.options && updatedData.options) {
        updatedData.options = editedData.options;
      }
      
      // Handle imageOptions edits
      if (editedData.imageOptions && updatedData.imageOptions) {
        updatedData.imageOptions = editedData.imageOptions;
      }
      
      // Handle demographic edits
      if (editedData.demographic && updatedData.demographic) {
        updatedData.demographic = {
          ...updatedData.demographic,
          ...editedData.demographic
        };
      }
      
      // Handle demographicOptions edits
      if (editedData.demographicOptions && updatedData.demographicOptions) {
        updatedData.demographicOptions = editedData.demographicOptions;
      }
      
      // Handle openEndedSettings edits
      if (editedData.openEndedSettings && updatedData.openEndedSettings) {
        updatedData.openEndedSettings = {
          ...updatedData.openEndedSettings,
          ...editedData.openEndedSettings
        };
      }
      
      // Handle matrix edits
      if (editedData.matrix && updatedData.matrix) {
        updatedData.matrix = {
          rows: editedData.matrix.rows || updatedData.matrix.rows,
          columns: editedData.matrix.columns || updatedData.matrix.columns
        };
      }
      
      // Update the question
      await adminQuestionServices.updateQuestion(updatedData.id, updatedData, adminEmail);
      
      // Refresh the data
      const refreshedData = await adminQuestionServices.getQuestionWithTypeData(question.id, adminEmail);
      setCompleteQuestionData(refreshedData);
      
      // Update form data if question text was changed
      if (editedData.question) {
        setFormData({
          ...formData,
          question: editedData.question
        });
      }
      
      // Reset editing state
      setIsEditing(false);
      setEditedData({});
      
      toast.success("Changes saved", {
        description: "Your changes to the question have been saved."
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error("Error saving changes", {
        description: "There was an error saving your changes. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMediaTypeChange = (value: "text" | "image" | "audio" | "video" | "file") => {
    setFormData((prev: typeof formData) => ({ ...prev, mediaType: value }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: typeof formData) => ({ ...prev, [name]: value }))
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

  // Type guard: is QuestionData
  function isQuestionData(q: unknown): q is import("../../services/AdminQuestionServices").QuestionData {
    // Log the question object to debug
    console.log('Question object in isQuestionData:', q);
    
    // Check if it's an object
    if (typeof q !== 'object' || q === null) {
      console.log('Not an object or null');
      return false;
    }
    
    // Check for any of the type-specific properties
    const hasTypeSpecificData = 
      ('options' in q) || 
      ('imageOptions' in q) || 
      ('scale' in q) || 
      ('matrix' in q) || 
      ('demographic' in q) || 
      ('demographicOptions' in q) || 
      ('openEndedSettings' in q);
    
    console.log('Has type-specific data:', hasTypeSpecificData);
    return hasTypeSpecificData;
  }
  
  // Helper function to check if a property exists in an object
  function hasProperty<T, K extends PropertyKey>(obj: T, prop: K): obj is T & Record<K, unknown> {
    return obj !== null && typeof obj === 'object' && prop in obj;
  }

  // Render question type-specific data
  let typeSpecificContent = null;
  
  // Add debug information about the question
  console.log('Question type:', question?.type);
  console.log('Full question object:', question);
  console.log('Complete question data:', completeQuestionData);
  
  // Create a loading display
  const loadingContent = (
    <div className="my-4">
      <div className="bg-gray-900/30 p-4 rounded-md border border-gray-800 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-400" />
        <span className="text-gray-300">Loading question details...</span>
      </div>
    </div>
  );
  
  // Create a fallback display for when type-specific data isn't available
  const fallbackContent = (
    <div className="my-4">
      <div className="text-xs text-blue-300 mb-1">Question Type: {question?.type}</div>
      <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800">
        <div className="text-sm text-gray-300">
          <p>This is a {question?.type} question.</p>
          <p className="mt-2 text-xs text-amber-400">
            No additional type-specific data is available for this question.
          </p>
        </div>
      </div>
    </div>
  );
  
  // Use the complete question data if available
  if (completeQuestionData && isQuestionData(completeQuestionData)) {
    // Display the current question text if available
    if (!formData.question && completeQuestionData.question) {
      setFormData(prev => ({
        ...prev,
        question: completeQuestionData.question
      }));
    }
    
    switch (completeQuestionData.type) {
      case "multiple-choice":
      case "dropdown":
      case "likert-scale":
      case "dichotomous":
      case "ranking":
        // Option-based question types
        if (Array.isArray(completeQuestionData.options) && completeQuestionData.options.length > 0) {
          typeSpecificContent = (
            <div className="my-4">
              <div className="text-xs text-blue-300 mb-1">Options:</div>
              <ul className="space-y-2 bg-gray-900/30 p-3 rounded-md border border-gray-800">
                {completeQuestionData.options.map((option: any, idx: number) => (
                  <li key={option.id || idx} className="flex items-center gap-3 text-gray-300 mb-2 p-2 bg-gray-800/30 rounded border border-gray-700">
                    <div className="flex items-center gap-2 flex-grow">
                      <span className="text-gray-400 font-mono text-sm">{option.option_order}</span>
                      {isEditing ? (
                        <Input
                          value={editedData.options?.[idx]?.option_text ?? option.option_text}
                          onChange={(e) => {
                            const updatedOptions = [...(editedData.options || [])];
                            updatedOptions[idx] = {
                              ...option,
                              option_text: e.target.value
                            };
                            handleEditableChange('options', updatedOptions);
                          }}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span className="text-white">{option.option_text}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        break;
        
      case "image-choice":
        // Image choice questions
        if (Array.isArray(completeQuestionData.imageOptions) && completeQuestionData.imageOptions.length > 0) {
          typeSpecificContent = (
            <div className="my-4">
              <div className="text-xs text-blue-300 mb-1">Image Options:</div>
              <ul className="space-y-2 bg-gray-900/30 p-3 rounded-md border border-gray-800">
                {completeQuestionData.imageOptions.map((option: any, idx: number) => (
                  <li key={option.id || idx} className="flex items-center gap-3 text-gray-300 mb-2 p-2 bg-gray-800/30 rounded border border-gray-700">
                    <div className="flex items-center gap-2 flex-grow">
                      <span className="text-gray-400 font-mono text-sm">{option.option_order}</span>
                      {isEditing ? (
                        <Input
                          value={editedData.imageOptions?.[idx]?.option_text ?? option.option_text}
                          onChange={(e) => {
                            const updatedOptions = [...(editedData.imageOptions || [])];
                            updatedOptions[idx] = {
                              ...option,
                              option_text: e.target.value
                            };
                            handleEditableChange('imageOptions', updatedOptions);
                          }}
                          className="h-7 text-sm"
                        />
                      ) : (
                        <span className="text-white">{option.option_text}</span>
                      )}
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
        break;
        
      case "rating-scale":
      case "slider":
        // Scale-based questions
        if (completeQuestionData.scale) {
          typeSpecificContent = (
            <div className="my-4">
              <div className="text-xs text-blue-300 mb-1">Scale Settings:</div>
              <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="text-gray-400">Min Value:</span>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.scale?.min_value ?? completeQuestionData.scale.min_value}
                        onChange={(e) => handleEditableChange('min_value', parseInt(e.target.value), 'scale')}
                        className="h-7 text-sm ml-2 w-16 inline-block"
                      />
                    ) : (
                      <span className="ml-2 text-white">{completeQuestionData.scale.min_value}</span>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Max Value:</span>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedData.scale?.max_value ?? completeQuestionData.scale.max_value}
                        onChange={(e) => handleEditableChange('max_value', parseInt(e.target.value), 'scale')}
                        className="h-7 text-sm ml-2 w-16 inline-block"
                      />
                    ) : (
                      <span className="ml-2 text-white">{completeQuestionData.scale.max_value}</span>
                    )}
                  </div>
                  {completeQuestionData.scale.step_value && (
                    <div className="text-sm">
                      <span className="text-gray-400">Step Size:</span>
                      <span className="ml-2 text-white">{completeQuestionData.scale.step_value}</span>
                    </div>
                  )}
                  {completeQuestionData.scale.default_value !== undefined && (
                    <div className="text-sm">
                      <span className="text-gray-400">Default Value:</span>
                      <span className="ml-2 text-white">{completeQuestionData.scale.default_value}</span>
                    </div>
                  )}
                </div>
                
                {/* Visual representation of scale */}
                <div className="mt-4">
                  <div className="flex justify-between">
                    {completeQuestionData.scale && Array.from({ length: completeQuestionData.scale.max_value - completeQuestionData.scale.min_value + 1 }, (_, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center mb-1">
                          {completeQuestionData.scale && (completeQuestionData.scale.min_value + i)}
                        </div>
                        {i === 0 && <div className="text-xs text-gray-400">Low</div>}
                        {completeQuestionData.scale && i === completeQuestionData.scale.max_value - completeQuestionData.scale.min_value && <div className="text-xs text-gray-400">High</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        }
        break;
        
      case "matrix":
        // Matrix questions
        if (completeQuestionData.matrix && completeQuestionData.matrix.rows && completeQuestionData.matrix.columns) {
          const rows = completeQuestionData.matrix.rows || [];
          const columns = completeQuestionData.matrix.columns || [];
          
          typeSpecificContent = (
            <div className="my-4">
              <div className="text-xs text-blue-300 mb-1">Matrix Structure:</div>
              <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 border-b border-gray-700"></th>
                      {columns.map((col: any) => (
                        <th key={col.id || col.item_order} className="p-2 border-b border-gray-700 text-center text-gray-300">
                          {col.content}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: any) => (
                      <tr key={row.id || row.item_order}>
                        <td className="p-2 border-b border-gray-700 text-white">
                          {row.content}
                        </td>
                        {columns.map((col: any) => (
                          <td key={col.id || col.item_order} className="p-2 border-b border-gray-700 text-center">
                            <div className="w-4 h-4 rounded-full border border-gray-600 mx-auto"></div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        break;
        
      case "demographic":
        // Demographic questions
        if (completeQuestionData.demographic) {
          typeSpecificContent = (
            <div className="my-4">
              <div className="text-xs text-blue-300 mb-1">Demographic Settings:</div>
              <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="text-gray-400">Field Type:</span>
                    <span className="ml-2 text-white">{completeQuestionData.demographic.field_type}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Required:</span>
                    <span className="ml-2 text-white">{completeQuestionData.demographic.is_required ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Has Other Option:</span>
                    <span className="ml-2 text-white">{completeQuestionData.demographic.has_other_option ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                
                {/* Demographic options */}
                {Array.isArray(completeQuestionData.demographicOptions) && completeQuestionData.demographicOptions.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-gray-400 mb-2">Options:</div>
                    <ul className="space-y-2">
                      {completeQuestionData.demographicOptions.map((option: any, idx: number) => (
                        <li key={option.id || idx} className="flex items-center gap-2 p-2 bg-gray-800/30 rounded border border-gray-700">
                          <span className="text-gray-400 font-mono text-sm">{option.option_order}</span>
                          <span className="text-white">{option.option_text}</span>
                        </li>
                      ))}
                      {completeQuestionData.demographic.has_other_option && (
                        <li className="flex items-center gap-2 p-2 bg-gray-800/30 rounded border border-gray-700">
                          <span className="text-white">Other (please specify)</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        }
        break;
        
      case "open-ended":
        // Open-ended questions
        if (completeQuestionData.openEndedSettings) {
          typeSpecificContent = (
            <div className="my-4">
              <div className="text-xs text-blue-300 mb-1">Open-Ended Settings:</div>
              <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="text-gray-400">Answer Format:</span>
                    <span className="ml-2 text-white">{completeQuestionData.openEndedSettings.answer_format}</span>
                  </div>
                  {completeQuestionData.openEndedSettings.character_limit && (
                    <div className="text-sm">
                      <span className="text-gray-400">Character Limit:</span>
                      <span className="ml-2 text-white">{completeQuestionData.openEndedSettings.character_limit}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
        break;
        
      case "demographic":
        // Demographic questions
        if (completeQuestionData.demographic) {
          typeSpecificContent = (
            <div className="my-4">
              <div className="text-xs text-blue-300 mb-1">Demographic Settings:</div>
              <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Field Type:</div>
                    {isEditing ? (
                      <Select 
                        value={editedData.demographic?.field_type || completeQuestionData.demographic.field_type}
                        onValueChange={(value) => {
                          handleEditableChange('demographic', {
                            ...completeQuestionData.demographic,
                            field_type: value
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select field type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="location">Location</SelectItem>
                          <SelectItem value="ethnicity">Ethnicity</SelectItem>
                          <SelectItem value="age">Age</SelectItem>
                          <SelectItem value="gender">Gender</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="marital_status">Marital Status</SelectItem>
                          <SelectItem value="occupation">Occupation</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-white">
                        {completeQuestionData.demographic.field_type}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Required:</div>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="is_required"
                          checked={editedData.demographic?.is_required ?? completeQuestionData.demographic.is_required}
                          onChange={(e) => {
                            handleEditableChange('demographic', {
                              ...completeQuestionData.demographic,
                              is_required: e.target.checked
                            });
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="is_required" className="text-sm text-white">Required</label>
                      </div>
                    ) : (
                      <div className="text-sm text-white">
                        {completeQuestionData.demographic.is_required ? 'Yes' : 'No'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Other Option:</div>
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="has_other_option"
                        checked={editedData.demographic?.has_other_option ?? completeQuestionData.demographic.has_other_option}
                        onChange={(e) => {
                          handleEditableChange('demographic', {
                            ...completeQuestionData.demographic,
                            has_other_option: e.target.checked
                          });
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="has_other_option" className="text-sm text-white">Include "Other" option</label>
                    </div>
                  ) : (
                    <div className="text-sm text-white">
                      {completeQuestionData.demographic.has_other_option ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>
                
                {/* Demographic Options */}
                {Array.isArray(completeQuestionData.demographicOptions) && completeQuestionData.demographicOptions.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Options:</div>
                    <ul className="space-y-2">
                      {completeQuestionData.demographicOptions.map((option: any, idx: number) => (
                        <li key={option.id || idx} className="flex items-center gap-3 text-gray-300 p-2 bg-gray-800/30 rounded border border-gray-700">
                          <div className="flex items-center gap-2 flex-grow">
                            <span className="text-gray-400 font-mono text-sm">{option.option_order}</span>
                            {isEditing ? (
                              <Input
                                value={editedData.demographicOptions?.[idx]?.option_text ?? option.option_text}
                                onChange={(e) => {
                                  const updatedOptions = [...(editedData.demographicOptions || [])];
                                  updatedOptions[idx] = {
                                    ...option,
                                    option_text: e.target.value
                                  };
                                  handleEditableChange('demographicOptions', updatedOptions);
                                }}
                                className="h-7 text-sm"
                              />
                            ) : (
                              <span className="text-white">{option.option_text}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        }
        break;
        
      default:
        // For any other question types
        typeSpecificContent = (
          <div className="my-4">
            <div className="text-xs text-blue-300 mb-1">Question Type:</div>
            <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800">
              <div className="text-sm text-gray-300">
                {question.type}
              </div>
            </div>
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
              <Badge variant="outline" className="border-gray-700 text-gray-300 bg-gray-800/50">
                Created: {formatDate(question.createdAt)}
              </Badge>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                {isEditing ? (
                  <Textarea
                    id="question"
                    name="question"
                    value={editedData.question !== undefined ? editedData.question : formData.question}
                    onChange={(e) => {
                      handleEditableChange('question', e.target.value);
                    }}
                    className="min-h-[80px] resize-none"
                  />
                ) : (
                  <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800 min-h-[80px]">
                    {formData.question}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Question Type</Label>
                {isEditing ? (
                  <Select 
                    value={editedData.type || formData.type}
                    onValueChange={(value) => {
                      handleEditableChange('type', value);
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      {allQuestionTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-gray-900/30 p-3 rounded-md border border-gray-800">
                    {formData.type.charAt(0).toUpperCase() + formData.type.slice(1).replace(/-/g, ' ')}
                  </div>
                )}
              </div>
              
              {/* Type-specific content moved below question type */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Question Details</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={loadingDetails || isSaving}
                  >
                    {isEditing ? "Cancel Editing" : "Edit Details"}
                  </Button>
                </div>
                {loadingDetails ? loadingContent : (typeSpecificContent || fallbackContent)}
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
              Close
            </Button>
            {isEditing && (
              <Button 
                onClick={handleSaveChanges} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSaving || Object.keys(editedData).length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving Changes
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
