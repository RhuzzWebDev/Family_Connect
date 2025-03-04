'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, Video, FileUp, Send } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

export function AnswerForm({ questionId }: { questionId: string }) {
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFile(acceptedFiles[0]);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handle submission logic here
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <Textarea
          placeholder="Write your answer..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <div className="absolute bottom-2 right-2">
          <Button type="submit" size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={isRecording ? 'destructive' : 'outline'}
          onClick={() => setIsRecording(!isRecording)}
        >
          <Mic className="w-4 h-4 mr-2" />
          {isRecording ? 'Stop Recording' : 'Record Audio'}
        </Button>
        <Button type="button" variant="outline">
          <Video className="w-4 h-4 mr-2" />
          Record Video
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 dark:border-gray-700'
          }`}
      >
        <input {...getInputProps()} />
        <FileUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {uploadedFile
            ? `File selected: ${uploadedFile.name}`
            : 'Drag & drop files here, or click to select'}
        </p>
      </div>
    </form>
  );
}
