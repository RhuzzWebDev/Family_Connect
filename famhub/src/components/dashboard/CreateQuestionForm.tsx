'use client';

import { useState, useRef, useEffect } from "react";
import { supabase } from '@/lib/supabase';
import { Camera, ImageIcon, Mic, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSession } from '@/hooks/useSession';
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface CreateQuestionFormProps {
  onQuestionCreated: () => void;
  type?: 'question' | 'answer';
}

interface MediaDevice {
  deviceId: string;
  label: string;
  status?: 'ready' | 'error' | 'testing';
}

const SUPPORTED_FILE_TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.gif'],
  video: ['.mp4', '.webm', '.mov'],
  audio: ['.mp3', '.wav', '.ogg']
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export default function CreateQuestionForm({ onQuestionCreated, type = 'question' }: CreateQuestionFormProps) {
  const { isClient, userEmail } = useSession();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<"audio" | "video" | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("");
  const [isTestingDevice, setIsTestingDevice] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoFeedRef = useRef<HTMLVideoElement>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  // Function to test a device
  const testDevice = async (deviceId: string, type: 'audio' | 'video') => {
    try {
      setIsTestingDevice(true);
      const constraints = {
        audio: type === 'audio' ? { deviceId: { exact: deviceId } } : false,
        video: type === 'video' ? { deviceId: { exact: deviceId } } : false
      };

      const testStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Update device status to ready
      if (type === 'audio') {
        setAudioDevices(prev => prev.map(device => ({
          ...device,
          status: device.deviceId === deviceId ? 'ready' : device.status
        })));
      } else {
        setVideoDevices(prev => prev.map(device => ({
          ...device,
          status: device.deviceId === deviceId ? 'ready' : device.status
        })));
      }

      // Clean up test stream
      testStream.getTracks().forEach(track => track.stop());
    } catch (err) {
      // Update device status to error
      if (type === 'audio') {
        setAudioDevices(prev => prev.map(device => ({
          ...device,
          status: device.deviceId === deviceId ? 'error' : device.status
        })));
      } else {
        setVideoDevices(prev => prev.map(device => ({
          ...device,
          status: device.deviceId === deviceId ? 'error' : device.status
        })));
      }
      console.error(`Error testing ${type} device:`, err);
    } finally {
      setIsTestingDevice(false);
    }
  };

  useEffect(() => {
    // Get available media devices when component mounts
    const getMediaDevices = async () => {
      try {
        // Request permission to access devices
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then(stream => {
            // Immediately stop the test stream
            stream.getTracks().forEach(track => track.stop());
          });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
            status: 'ready' as const
          }));
        
        const videoInputs = devices
          .filter(device => device.kind === 'videoinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
            status: 'ready' as const
          }));

        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);

        // Set default devices
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.error("Error getting media devices:", err);
        setError("Unable to access media devices. Please check your permissions.");
      }
    };

    if (isClient) {
      getMediaDevices();
    }

    return () => {
      // Cleanup function
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
      if (videoFeedRef.current) {
        videoFeedRef.current.srcObject = null;
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.src = '';
      }
    };
  }, [isClient]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleStartRecording = async (type: "audio" | "video") => {
    try {
      // Clean up any existing recordings
      handleClearMedia();

      const constraints = {
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
        video: type === "video" ? {
          deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
          facingMode: "user",
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 }
        } : false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set up video feed first before starting recording
      if (type === "video" && videoFeedRef.current) {
        const videoElement = videoFeedRef.current;
        videoElement.srcObject = mediaStream;
        videoElement.muted = true;
        
        // Force a layout reflow
        videoElement.style.display = 'none';
        videoElement.offsetHeight; // Force reflow
        videoElement.style.display = 'block';
        
        // Wait for video element to be ready
        await new Promise<void>((resolve) => {
          const checkReady = () => {
            if (videoElement.readyState >= 2) {
              resolve();
            } else {
              videoElement.onloadeddata = () => resolve();
            }
          };
          checkReady();
        });
        
        try {
          await videoElement.play();
        } catch (err) {
          console.error('Failed to play video:', err);
          throw new Error('Could not start video preview');
        }
      }

      setStream(mediaStream);
      setIsRecording(true);
      setRecordingType(type);
      setError(null);
      chunksRef.current = [];

      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000
      });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: 'video/webm'
        });
        
        // Clean up old preview URL
        if (mediaPreview) {
          URL.revokeObjectURL(mediaPreview);
        }
        
        const blobUrl = URL.createObjectURL(blob);
        setMediaPreview(blobUrl);
        setMediaType(type);
        
        // Create file but don't upload yet - wait for form submission
        setFile(new File([blob], `recording_${Date.now()}.webm`, { 
          type: 'video/webm'
        }));

        // Clean up recording resources
        if (videoFeedRef.current) {
          videoFeedRef.current.srcObject = null;
        }
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setMediaRecorder(null);
      };

      // Request data every second for smoother recording
      recorder.start(1000);
      setMediaRecorder(recorder);
    } catch (err) {
      console.error("Media error:", err);
      handleClearMedia();
      setError("Failed to access camera. Please check your permissions.");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      
      // Stop the stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      setRecordingDuration(0);
    }
  };

  const handleClearMedia = () => {
    // Clean up existing media resources
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (videoFeedRef.current) {
      videoFeedRef.current.srcObject = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.src = '';
    }
    
    // Reset all media-related state
    setMediaPreview(null);
    setMediaType(null);
    setFile(null);
    setStream(null);
    setMediaRecorder(null);
    setIsRecording(false);
    setRecordingType(null);
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    setRecordingDuration(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 25MB');
      return;
    }

    // Check file type
    const fileExtension = selectedFile.name.toLowerCase().match(/\.[^.]*$/)?.[0];
    const isValidType = fileExtension && Object.values(SUPPORTED_FILE_TYPES)
      .flat()
      .includes(fileExtension);

    if (!isValidType) {
      setError(`Unsupported file type. Allowed types:\nImages: ${SUPPORTED_FILE_TYPES.image.join(', ')}\nVideos: ${SUPPORTED_FILE_TYPES.video.join(', ')}\nAudio: ${SUPPORTED_FILE_TYPES.audio.join(', ')}`);
      return;
    }

    // Set file and preview
    setFile(selectedFile);
    setMediaType(selectedFile.type.startsWith("image/") ? "image" : 
                 selectedFile.type.startsWith("audio/") ? "audio" : 
                 selectedFile.type.startsWith("video/") ? "video" : null);
    const previewUrl = URL.createObjectURL(selectedFile);
    setMediaPreview(previewUrl);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) {
      setError("Please enter a question or attach media");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      let fileUrl = '';
      let folderPath = '';
      
      if (file) {
        try {
          // Get user details for folder path
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name, role')
            .eq('email', userEmail)
            .single();

          if (userError) {
            console.error("Error fetching user data:", userError);
            throw new Error("Could not retrieve user information");
          }

          if (!userData) {
            throw new Error("User data not found");
          }

          // Determine folder path based on role following the established pattern
          const persona = userData.role === 'Father' || userData.role === 'Mother' || 
                         userData.role === 'Grandfather' || userData.role === 'Grandmother' 
                         ? 'Parent' : 'Children';
          
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name}`;
          
          console.log("Preparing file upload with user data:", {
            lastName: userData.last_name,
            firstName: userData.first_name,
            role: userData.role,
            persona
          });
          
          // Create FormData for native file upload
          const formData = new FormData();
          formData.append('file', file);
          formData.append('lastName', userData.last_name);
          formData.append('firstName', userData.first_name);
          formData.append('role', userData.role);
          formData.append('persona', persona);
          formData.append('fileName', fileName);
          
          // Use fetch to upload to your API endpoint
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error("File upload error:", errorData);
            throw new Error(`File upload failed: ${JSON.stringify(errorData)}`);
          }
          
          const uploadResult = await uploadResponse.json();
          // Get the URL and folderPath from the response
          fileUrl = uploadResult.url;
          folderPath = uploadResult.folderPath;
        } catch (fileError) {
          console.error("File handling error:", fileError);
          throw new Error(`File processing failed: ${fileError instanceof Error ? fileError.message : JSON.stringify(fileError)}`);
        }
      }

      console.log("Creating question record with data:", {
        user_id: userEmail,
        question: text,
        file_url: fileUrl,
        folder_path: folderPath,
        media_type: mediaType
      });

      // Create question record
      try {
        // First, try to get the user's UUID from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .single();

        if (userError) {
          console.error("Error fetching user ID:", userError);
          throw new Error(`Could not retrieve user ID: ${userError.message || JSON.stringify(userError)}`);
        }

        if (!userData || !userData.id) {
          console.error("User not found or ID missing:", userEmail);
          throw new Error(`User not found or ID missing for email: ${userEmail}`);
        }

        console.log("Found user ID:", userData.id);

        // Now insert the question with the proper user_id (UUID)
        const { error: insertError, data: insertData } = await supabase
          .from('questions')
          .insert({
            user_id: userData.id, // Use the UUID from the users table
            question: text,
            file_url: fileUrl,
            folder_path: folderPath,
            media_type: mediaType,
            like_count: 0,
            comment_count: 0,
            created_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error("Database insertion error:", insertError);
          throw new Error(`Database error: ${insertError.message || JSON.stringify(insertError)}`);
        }

        console.log("Question created successfully:", insertData);
        
        // Clean up after successful submission
        setText("");
        handleClearMedia();
        
        // Notify parent component that a question was created
        // This should trigger the modal to close and refresh the question list
        onQuestionCreated();
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
        throw new Error(`Database operation failed: ${dbError instanceof Error ? dbError.message : JSON.stringify(dbError)}`);
      }
    } catch (err) {
      console.error("Error creating question:", err);
      setError(`Failed to create question: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Don't close the modal on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMediaPreview = () => {
    if (!mediaPreview) return null;

    // Don't render video preview here since it's handled in the video tab
    if (mediaType === "video") return null;

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
            <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
          </div>
        )}
        {mediaType === "audio" && (
          <div className="flex items-center justify-center p-4">
            <audio src={mediaPreview} controls className="w-full" />
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder={type === 'question' ? "What would you like to ask?" : "Share your answer..."}
        value={text}
        onChange={handleTextChange}
        className="min-h-[100px] w-full resize-none bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
      />

      <Tabs defaultValue="image" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8">
            <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">Drag and drop an image or click to browse</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept={SUPPORTED_FILE_TYPES.image.join(',')} 
              onChange={handleFileUpload} 
            />
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
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 space-y-4">
              <Mic className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">Upload audio or record</p>
              <div className="w-full max-w-sm space-y-4 overflow-hidden">
                <div className="mb-2">
                  <h3 className="text-sm font-medium mb-2">Select microphone:</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {audioDevices.map(device => (
                      <div 
                        key={device.deviceId} 
                        className={`flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer ${selectedAudioDevice === device.deviceId ? 'bg-blue-50 border-blue-200' : ''}`}
                        onClick={() => {
                          setSelectedAudioDevice(device.deviceId);
                          testDevice(device.deviceId, 'audio');
                        }}
                      >
                        <Mic className="h-4 w-4 flex-shrink-0 mr-2" />
                        <span className="flex-1 truncate text-sm">{device.label}</span>
                        <span className="flex-shrink-0 ml-2">
                          {device.status === 'ready' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {device.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          {device.status === 'testing' && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {audioDevices.length === 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No audio devices found. Please check your microphone connection.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={SUPPORTED_FILE_TYPES.audio.join(',')} 
                onChange={handleFileUpload} 
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload Audio
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleStartRecording("audio")}
                  disabled={!selectedAudioDevice || isTestingDevice}
                >
                  Record Audio
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
        <TabsContent value="video" className="space-y-4">
          {!isRecording && !mediaPreview ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 space-y-4">
              <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">Upload video or record</p>
              <div className="w-full max-w-sm space-y-4 overflow-hidden">
                <div className="mb-2">
                  <h3 className="text-sm font-medium mb-2">Select camera:</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                    {videoDevices.map(device => (
                      <div 
                        key={device.deviceId} 
                        className={`flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer ${selectedVideoDevice === device.deviceId ? 'bg-blue-50 border-blue-200' : ''}`}
                        onClick={() => {
                          setSelectedVideoDevice(device.deviceId);
                          testDevice(device.deviceId, 'video');
                        }}
                      >
                        <Camera className="h-4 w-4 flex-shrink-0 mr-2" />
                        <span className="flex-1 truncate text-sm">{device.label}</span>
                        <span className="flex-shrink-0 ml-2">
                          {device.status === 'ready' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {device.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          {device.status === 'testing' && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {videoDevices.length === 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No video devices found. Please check your camera connection.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept={SUPPORTED_FILE_TYPES.video.join(',')} 
                onChange={handleFileUpload} 
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Upload Video
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleStartRecording("video")}
                  disabled={!selectedVideoDevice || isTestingDevice}
                >
                  Record Video
                </Button>
              </div>
            </div>
          ) : null}

          {isRecording && recordingType === "video" ? (
            <div className="flex flex-col items-center space-y-4 rounded-md border p-4">
              <Card className="p-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video 
                    ref={videoFeedRef}
                    className="w-full aspect-video object-cover"
                    autoPlay 
                    playsInline 
                    muted
                  />
                  <div className="absolute top-2 right-2 z-10">
                    <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse shadow-lg" />
                  </div>
                  <div className="absolute bottom-2 left-2 z-10 bg-black/50 px-2 py-1 rounded text-white text-sm font-medium">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              </Card>
              <Button 
                variant="destructive" 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
                onClick={handleStopRecording}
              >
                Stop Recording
              </Button>
            </div>
          ) : null}

          {mediaPreview && mediaType === "video" && !isRecording ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="bg-black rounded-lg overflow-hidden">
                  <video 
                    ref={videoPreviewRef}
                    className="w-full aspect-video object-cover" 
                    controls 
                    src={mediaPreview}
                  />
                </div>
              </Card>
              <div className="flex space-x-2">
                <Button 
                  variant="destructive" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleClearMedia}
                >
                  Discard
                </Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleStartRecording("video")}
                >
                  Record Again
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {renderMediaPreview()}

      {error && (
        <Alert variant="destructive" className="mt-4 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={!text.trim() || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? 'Posting...' : 'Post Question'}
        </Button>
      </div>
    </form>
  );
}
