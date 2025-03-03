"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Camera, ImageIcon, Mic, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

interface NewQuestionFormProps {
  onSubmit: (question: any) => void
}

export function NewQuestionForm({ onSubmit }: NewQuestionFormProps) {
  const [text, setText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingType, setRecordingType] = useState<"audio" | "video" | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
  }

  const handleStartRecording = (type: "audio" | "video") => {
    setIsRecording(true)
    setRecordingType(type)
    // In a real app, you would start recording here
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    // In a real app, you would stop recording and get the media file
    // For now, we'll just set a placeholder preview
    if (recordingType === "audio") {
      setMediaPreview("/placeholder.svg?height=50&width=300&text=Audio+Recording")
      setMediaType("audio")
    } else if (recordingType === "video") {
      setMediaPreview("/placeholder.svg?height=200&width=300&text=Video+Recording")
      setMediaType("video")
    }
    setRecordingType(null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // In a real app, you would upload the file to a storage service
    // For now, we'll just set a placeholder preview
    if (file.type.startsWith("image/")) {
      setMediaPreview("/placeholder.svg?height=200&width=300&text=Image+Upload")
      setMediaType("image")
    } else if (file.type.startsWith("audio/")) {
      setMediaPreview("/placeholder.svg?height=50&width=300&text=Audio+Upload")
      setMediaType("audio")
    } else if (file.type.startsWith("video/")) {
      setMediaPreview("/placeholder.svg?height=200&width=300&text=Video+Upload")
      setMediaType("video")
    }
  }

  const handleClearMedia = () => {
    setMediaPreview(null)
    setMediaType(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      text,
      mediaType,
      mediaUrl: mediaPreview,
    })

    // Reset form
    setText("")
    setMediaPreview(null)
    setMediaType(null)
  }

  const renderMediaPreview = () => {
    if (!mediaPreview) return null

    return (
      <div className="relative mt-2 rounded-md border">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 h-6 w-6 rounded-full bg-background/80"
          onClick={handleClearMedia}
        >
          <X className="h-4 w-4" />
        </Button>
        {mediaType === "image" && (
          <div className="relative h-[200px] w-full overflow-hidden rounded-md">
            <Image src={mediaPreview || "/placeholder.svg"} alt="Preview" fill className="object-cover" />
          </div>
        )}
        {mediaType === "audio" && (
          <div className="flex items-center justify-center p-4">
            <div className="h-[50px] w-full bg-muted"></div>
          </div>
        )}
        {mediaType === "video" && (
          <div className="relative h-[200px] w-full overflow-hidden rounded-md bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Ask your family a question..."
        value={text}
        onChange={handleTextChange}
        className="min-h-[100px]"
      />

      <Tabs defaultValue="image">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8">
            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">Drag and drop an image or click to browse</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Choose Image
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="audio" className="space-y-4">
          {isRecording && recordingType === "audio" ? (
            <div className="flex flex-col items-center space-y-4 rounded-md border p-4">
              <div className="h-4 w-full animate-pulse rounded-full bg-red-500"></div>
              <p className="text-sm">Recording audio...</p>
              <Button onClick={handleStopRecording}>Stop Recording</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => handleStartRecording("audio")}>
              <Mic className="mr-2 h-4 w-4" />
              Record Audio
            </Button>
          )}
        </TabsContent>
        <TabsContent value="video" className="space-y-4">
          {isRecording && recordingType === "video" ? (
            <div className="flex flex-col items-center space-y-4 rounded-md border p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                <div className="absolute right-2 top-2 h-3 w-3 animate-pulse rounded-full bg-red-500"></div>
              </div>
              <Button onClick={handleStopRecording}>Stop Recording</Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => handleStartRecording("video")}>
              <Camera className="mr-2 h-4 w-4" />
              Record Video
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {renderMediaPreview()}

      <div className="flex justify-end">
        <Button type="submit" disabled={!text.trim()}>
          Post Question
        </Button>
      </div>
    </form>
  )
}
