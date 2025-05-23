"use client"

import React from "react"
import { FileStorageService } from "@/services/fileStorageService";
const fileStorageService = new FileStorageService();

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Save, Plus, Trash2, FolderPlus, Upload, Heart, Link as LinkIcon, Eye } from "lucide-react"
import { Question, QuestionSet } from "@/types/question"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import QuestionViewDialog from "@/components/question/question-view-dialog"



interface CreateEditQuestionSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Partial<QuestionSet>) => void
  onDelete?: (id: string) => void
  questionSet?: QuestionSet | null
}

export default function CreateEditQuestionSetDialog({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  questionSet,
}: CreateEditQuestionSetDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    author_name: "",
    resource_url: "",
    donate_url: "",
    cover_image: ""
  })
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [viewQuestionSet, setViewQuestionSet] = useState<QuestionSet | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageAreaClick = () => {
    fileInputRef.current?.click();
  }

  useEffect(() => {
    if (questionSet) {
      // Log the question set data to ensure we have all fields
      console.log('Editing question set:', questionSet);
      
      // Ensure all fields are properly extracted from the questionSet object
      setFormData({
        title: questionSet.title,
        description: questionSet.description || "",
        author_name: questionSet.author_name || "", // Ensure author_name is fetched
        resource_url: questionSet.resource_url || "", // Ensure resource_url is fetched
        donate_url: questionSet.donate_url || "",
        cover_image: questionSet.cover_image || ""
      })
      
      // Log the form data to verify it's correctly populated
      console.log('Form data populated:', {
        title: questionSet.title,
        description: questionSet.description || "",
        author_name: questionSet.author_name || "",
        resource_url: questionSet.resource_url || "",
        donate_url: questionSet.donate_url || "",
        cover_image: questionSet.cover_image || ""
      });
      
      if (questionSet.cover_image) {
        setImagePreview(questionSet.cover_image)
      } else {
        setImagePreview(null)
      }
      
      // Set the question set for viewing
      setViewQuestionSet(questionSet)
    } else {
      setFormData({
        title: "",
        description: "",
        author_name: "",
        resource_url: "",
        donate_url: "",
        cover_image: ""
      })
      setImagePreview(null)
      setViewQuestionSet(null)
    }
    setImageFile(null)
  }, [questionSet, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (15MB limit)
      const maxSize = 15 * 1024 * 1024 // 15MB in bytes
      if (file.size > maxSize) {
        alert('File size exceeds 15MB limit. Please choose a smaller file.')
        return
      }
      
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userEmail = sessionStorage.getItem("adminEmail") || "admin@example.com";
      // If editing, keep old logic
      if (questionSet && questionSet.id) {
        let coverImageUrl = formData.cover_image;
        if (imageFile) {
          const folderPath = await fileStorageService.getUserFolderPath(userEmail, questionSet.id);
          coverImageUrl = await fileStorageService.uploadFile(imageFile, folderPath);
        }
        const submissionData = {
          id: questionSet.id,
          ...formData,
          ...(coverImageUrl ? { cover_image: coverImageUrl } : {})
        };
        await onSubmit(submissionData);
        onOpenChange(false);
      } else {
        // 1. Create the question set without the image
        const baseData = { ...formData, cover_image: undefined };
        // onSubmit must return a QuestionSet or Partial<QuestionSet> with an id
        const createdSet = (await onSubmit(baseData)) as { id: string } | undefined;
        // 2. If image, upload and update
        let coverImageUrl = "";
        if (imageFile && createdSet && createdSet.id) {
          const folderPath = await fileStorageService.getUserFolderPath(userEmail, createdSet.id);
          coverImageUrl = await fileStorageService.uploadFile(imageFile, folderPath);
          // 3. Call onSubmit again to update with image URL
          await onSubmit({ id: createdSet.id, cover_image: coverImageUrl });
        }
        onOpenChange(false);
      }
    } catch (error) {
      alert("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = () => {
    if (questionSet && onDelete) {
      onDelete(questionSet.id)
      setDeleteDialogOpen(false)
      onOpenChange(false)
    }
  }

  const isEditing = !!questionSet

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
    <>
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
                  {isEditing ? <FolderPlus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </div>
                <span className="font-medium text-lg">
                  {isEditing ? "Edit Question Set" : "Create Question Set"}
                </span>
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
              <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="cover_image">Cover Image (Optional)</Label>
                  <div className="mt-1 flex items-center">
                  <div
                    className="relative w-full h-40 bg-[#111318] border border-gray-800 rounded-md overflow-hidden"
                    onClick={handleImageAreaClick}
                    style={{ cursor: "pointer" }}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Upload className="h-8 w-8 mb-2" />
                        <span>Upload cover image</span>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      id="cover_image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                  <p className="text-xs text-gray-400">Recommended size: 1200 x 630 pixels. Maximum size: 15MB</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter question set title"
                    className="bg-[#111318] border-gray-800 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author_name">Author Name</Label>
                  <Input
                    id="author_name"
                    name="author_name"
                    value={formData.author_name}
                    onChange={handleChange}
                    placeholder="Enter author name"
                    className="bg-[#111318] border-gray-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resource_url">Resource URL (Optional)</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <LinkIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="resource_url"
                      name="resource_url"
                      value={formData.resource_url}
                      onChange={handleChange}
                      placeholder="https://example.com/resource"
                      className="bg-[#111318] border-gray-800 text-white pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter a brief description of this question set"
                    className="bg-[#111318] border-gray-800 text-white min-h-[100px]"
                  />
                </div>
                
                {/* Donate URL Field */}
                <div className="space-y-2">
                  <Label htmlFor="donate_url">Donation Link (Optional)</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Heart className="h-4 w-4 text-pink-400" />
                    </div>
                    <Input
                      id="donate_url"
                      name="donate_url"
                      value={formData.donate_url}
                      onChange={handleChange}
                      placeholder="https://example.com/donate"
                      className="bg-[#111318] border-gray-800 text-white pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-400">This will be displayed as a donate button on the question set</p>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <span>Submitting...</span>
                    ) : isEditing ? (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 flex items-center justify-between">
              <div>
                {isEditing && onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="border-red-900 text-red-500 hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setViewDialogOpen(true)}
                    className="border-blue-700 text-blue-400 hover:bg-blue-900/30"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Questions
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  Cancel
                </Button>
                {/* Move the submit button inside the form below */}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1a1d24] text-white border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete the question set "{questionSet?.title}" and all its questions. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-gray-700 text-white hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {viewQuestionSet && (
        <QuestionViewDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          questionSet={{
            ...viewQuestionSet,
            // Ensure questionCount is available
            questionCount: viewQuestionSet.questionCount || 0,
            // Ensure questions array is available and properly formatted
            // Use type assertion to fix type compatibility issues
            questions: Array.isArray(viewQuestionSet.questions) ? viewQuestionSet.questions.map(q => ({
              ...q,
              // Ensure all required fields are present with correct naming
              media_type: q.media_type || q.mediaType || 'text',
              mediaType: (q.mediaType || q.media_type || 'text') as "text" | "image" | "audio" | "video" | "file",
              created_at: q.created_at || q.createdAt || new Date().toISOString(),
              createdAt: q.createdAt || q.created_at || new Date().toISOString(),
              like_count: q.like_count || 0,
              comment_count: q.comment_count || 0
            })) : []
          }}
        />
      )}
    </>
  )
}
