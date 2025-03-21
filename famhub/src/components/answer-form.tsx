'use client';

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileUp, Mic, Video } from "lucide-react"

interface AnswerFormProps {
  questionId: string
}

export function AnswerForm({ questionId }: AnswerFormProps) {
  return (
    <div className="space-y-4">
      <Textarea placeholder="Write your answer..." className="min-h-[100px]" />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Video className="h-4 w-4 mr-2" />
          Video
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <Mic className="h-4 w-4 mr-2" />
          Audio
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          <FileUp className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
      <Button className="w-full">Submit Answer</Button>
    </div>
  )
}
