'use client';

import { useState } from 'react';
import FilterDropdown, { ViewType } from './FilterDropdown';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateQuestionForm from './CreateQuestionForm';
import { format, formatDistanceToNow } from 'date-fns';
import { ThumbsUp, MessageSquare, Image as ImageIcon, Video, Music, Trash2, AlertTriangle, PlusCircle, X, Heart, MoreHorizontal, Share2, Maximize2, Minimize2 } from 'lucide-react';
import Image from 'next/image';
import { CommentSection } from '@/components/comment-section';
import { cn } from '@/lib/utils';
import { QuestionSetCard } from './QuestionSetCard';

// Define types
export interface QuestionLike {
  user_id: string;
}

export interface QuestionSet {
  id: string;
  title: string;
  description: string | null;
  author_name: string | null;
  resource_url: string | null;
  donate_url: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
  question_count?: number;
}

export interface Question {
  id: string;
  question: string;
  created_at: string;
  file_url: string | null;
  media_type: string | null;
  like_count: number;
  comment_count: number;
  question_set_id: string | null;
  question_set: QuestionSet | null;
  user: {
    first_name: string;
    last_name: string;
    role: string;
    persona: string;
    family_id: string;
  };
  has_liked?: boolean;
  question_likes?: QuestionLike[];
  comments?: any[];
  sortKey?: number;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  question_id: string;
  like_count: number;
  file_url: string | null;
  media_type: string | null;
  folder_path: string | null;
  parent_id: string | null;
  user: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface QuestionGridBaseProps {
  questions: Question[];
  questionSets: QuestionSet[];
  loading: boolean;
  error: string | null;
  showHeader?: boolean;
  limitCards?: number;
  onLike: (questionId: string) => Promise<void>;
  isLiking: boolean;
  onCreateQuestion?: () => void;
  onCreateQuestionSet?: () => void;
}

export default function QuestionGridBase({
  questions,
  questionSets,
  loading,
  error,
  showHeader = true,
  limitCards,
  onLike,
  isLiking,
  onCreateQuestion,
  onCreateQuestionSet
}: QuestionGridBaseProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('card');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Helper functions
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  // Handle opening comment section
  const handleCommentClick = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      setSelectedQuestionId(questionId);
      setSelectedQuestion(question);
    }
  };

  // Filter questions if limitCards is provided
  const displayQuestions = limitCards ? questions.slice(0, limitCards) : questions;

  // Media type icon component
  const MediaTypeIcon = ({ type }: { type: string | null }) => {
    if (!type) return null;
    
    switch (type.toLowerCase()) {
      case 'image':
        return <ImageIcon className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Media preview component
  const MediaPreview = ({ type, url }: { type: string | null, url: string | null }) => {
    if (!url) return null;
    
    try {
      switch (type?.toLowerCase()) {
        case 'image':
          return (
            <div className="relative aspect-video w-full overflow-hidden rounded-md">
              <Image
                src={url}
                alt="Question image"
                fill
                className="object-cover"
                unoptimized={true}
              />
            </div>
          );
        case 'video':
          return (
            <video 
              src={url} 
              controls 
              className="w-full rounded-md"
              style={{ maxHeight: '400px' }}
            />
          );
        case 'audio':
          return (
            <audio 
              src={url} 
              controls 
              className="w-full mt-2"
            />
          );
        default:
          return (
            <div className="flex items-center justify-center p-4 bg-gray-100 text-gray-500 rounded-md">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <span>Unsupported media type</span>
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering media preview:', error);
      return (
        <div className="flex items-center justify-center p-4 bg-gray-100 text-gray-500 rounded-md">
          <AlertTriangle className="h-6 w-6 mr-2" />
          <span>Error loading media</span>
        </div>
      );
    }
  };

  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#fff' }}>Family Feed</h1>
            <p className="text-muted-foreground">Share and respond to family questions</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="w-full sm:w-auto"
                  style={{ background: '#232336', color: '#fff' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCreateDialogOpen(true);
                    if (onCreateQuestion) onCreateQuestion();
                  }}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ask Question
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]" style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}>
                <CreateQuestionForm onQuestionCreated={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
            
            <FilterDropdown viewType={viewType} setViewType={setViewType} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className={viewType === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {/* Question Sets */}
          {viewType === 'card' && questionSets.map(set => (
            <QuestionSetCard key={set.id} questionSet={set} />
          ))}
          
          {/* Questions */}
          {viewType === 'card' ? (
            displayQuestions.map((question) => (
              <Card 
                key={question.id} 
                className="overflow-hidden"
                style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback style={{ background: '#0F1017', color: '#60a5fa' }}>
                        {getInitials(question.user.first_name, question.user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{`${question.user.first_name} ${question.user.last_name}`}</div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>{question.user.role}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="mb-3">{question.question}</p>
                  
                  {/* Question set badge */}
                  {question.question_set && (
                    <div className="mb-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300">
                        {question.question_set.title}
                      </span>
                    </div>
                  )}
                  
                  {question.file_url && question.media_type && (
                    <div className="mt-3">
                      <MediaPreview type={question.media_type} url={question.file_url} />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-8 px-2", { "text-red-500": question.has_liked })}
                    onClick={() => onLike(question.id)}
                    disabled={isLiking}
                  >
                    <Heart className={cn("h-4 w-4 mr-1", { "fill-current text-red-500": question.has_liked })} />
                    <span>{question.like_count > 0 ? question.like_count : "Like"}</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleCommentClick(question.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>{question.comment_count > 0 ? question.comment_count : "Comment"}</span>
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            // List view
            displayQuestions.map((question) => (
              <div 
                key={question.id}
                className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg border"
                style={{ background: '#181926', color: '#fff', border: '1px solid #232336' }}
                onClick={() => handleCommentClick(question.id)}
              >
                <div className="flex items-start gap-3 sm:w-1/4">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold" style={{ background: '#0F1017', color: '#60a5fa' }}>
                    {getInitials(question.user.first_name, question.user.last_name)}
                  </div>
                  <div>
                    <p className="font-medium">{`${question.user.first_name} ${question.user.last_name}`}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <p className="text-xs text-muted-foreground">{question.user.role}</p>
                      <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <p className="text-base mb-2">{question.question}</p>
                  
                  {/* Question set badge in list view */}
                  {question.question_set && (
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-900 text-blue-300">
                        {question.question_set.title}
                      </span>
                      {question.question_set.author_name && (
                        <span className="text-xs text-gray-400">
                          by {question.question_set.author_name}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Media preview removed from list view */}
                  {question.media_type && (
                    <span className="flex items-center gap-1 text-gray-500 mb-3">
                      <MediaTypeIcon type={question.media_type} />
                      <span className="text-xs capitalize">{question.media_type} attached</span>
                    </span>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 px-2", { "text-red-500": question.has_liked })}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLike(question.id);
                      }}
                    >
                      <Heart className={cn("h-4 w-4 mr-1", { "fill-current text-red-500": question.has_liked })} />
                      <span className="text-xs">{question.like_count > 0 ? question.like_count : "Like"}</span>
                    </Button>
                    
                    <span className="flex items-center gap-1 text-gray-500">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-xs">{question.comment_count > 0 ? `${question.comment_count} comments` : "Comment"}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Custom Side Panel for Comments */}
      {selectedQuestionId && selectedQuestion && (
        <div 
          className={`fixed inset-y-0 right-0 z-50 w-full ${isFullWidth ? 'md:w-full' : 'md:w-1/2'} bg-black/70 transform transition-all duration-300 ease-in-out ${!!selectedQuestionId ? "translate-x-0" : "translate-x-full"}`}
          onClick={() => {
            setSelectedQuestionId(null);
            setSelectedQuestion(null);
          }}
        >
          <div
            className="h-full flex flex-col overflow-hidden rounded-l-2xl"
            style={{ background: '#181926', color: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4" style={{ background: '#20212b', color: '#e5e7eb' }}>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-gray-900 mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullWidth(!isFullWidth);
                  }}
                >
                  {isFullWidth ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden">
                  <Image
                    src="/logo.svg"
                    alt="Community logo"
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <span className="font-medium">All Community Members</span>
              </div>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-500 hover:text-gray-900" 
                  onClick={() => {
                    setSelectedQuestionId(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Author info */}
            <div className="p-4 border-b" style={{ background: '#20212b', color: '#e5e7eb', borderColor: '#232336' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold" style={{ background: '#0F1017', color: '#60a5fa' }}>
                  {selectedQuestion.user.first_name.charAt(0)}{selectedQuestion.user.last_name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {`${selectedQuestion.user.first_name} ${selectedQuestion.user.last_name}`}
                    <span className="bg-orange-500 rounded-full w-2 h-2"></span>
                  </div>
                  <div className="text-sm text-gray-500">{selectedQuestion.user.role}</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-grow overflow-y-auto" style={{ background: '#181926', color: '#fff' }}>
              <div className="max-w-lg mx-auto" style={{ color: '#fff' }}>
                {/* Media if available */}
                {selectedQuestion.file_url && (
                  <div className="w-full rounded-md overflow-hidden mb-6">
                    <MediaPreview type={selectedQuestion.media_type} url={selectedQuestion.file_url} />
                  </div>
                )}
                
                <h2 className="text-2xl font-semibold mb-4" style={{ color: '#fff' }}>{selectedQuestion.question}</h2>
                
                {/* Question set details in detail view */}
                {selectedQuestion.question_set && (
                  <div className="mb-6 p-4 rounded-lg" style={{ background: '#20212b' }}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedQuestion.question_set.cover_image && (
                        <div className="w-10 h-10 rounded overflow-hidden">
                          <Image
                            src={selectedQuestion.question_set.cover_image}
                            alt="Set cover"
                            width={40}
                            height={40}
                            className="object-cover"
                            unoptimized={true}
                          />
                        </div>
                      )}
                      <h3 className="text-lg font-medium text-blue-400">
                        {selectedQuestion.question_set.title}
                      </h3>
                    </div>
                    
                    {selectedQuestion.question_set.description && (
                      <p className="text-sm text-gray-300 mb-3">
                        {selectedQuestion.question_set.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {selectedQuestion.question_set.author_name && (
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">
                          By {selectedQuestion.question_set.author_name}
                        </span>
                      )}
                      
                      {selectedQuestion.question_set.resource_url && (
                        <a 
                          href={selectedQuestion.question_set.resource_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-900 text-blue-300 px-2 py-1 rounded-full hover:bg-blue-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Resource
                        </a>
                      )}
                      
                      {selectedQuestion.question_set.donate_url && (
                        <a 
                          href={selectedQuestion.question_set.donate_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full hover:bg-green-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Support
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Comments section */}
                <div className="mt-8">
                  {selectedQuestionId && <CommentSection questionId={selectedQuestionId} />}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t" style={{ background: '#20212b', color: '#e5e7eb', borderColor: '#232336' }}>
              <div className="flex items-center justify-center mb-4">
                <Button 
                  variant="ghost" 
                  className={cn("text-gray-500 hover:text-gray-900 relative", { "text-red-500": selectedQuestion.has_liked })}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onLike(selectedQuestion.id);
                  }}
                  disabled={isLiking}
                >
                  <Heart className={cn("h-5 w-5 mr-2", { "fill-current text-red-500": selectedQuestion.has_liked })} />
                  <span className="relative">
                    {selectedQuestion.like_count > 0 ? `${selectedQuestion.like_count} cheers` : "Be the first to cheer this"}
                    {isLiking && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="animate-pulse">...</span>
                      </span>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
