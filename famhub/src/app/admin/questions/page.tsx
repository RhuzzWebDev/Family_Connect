'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { SupabaseService } from '@/services/supabaseService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  MessageSquare,
  ChevronRight, 
  Trash2,
  Eye,
  Filter,
  Image,
  Video,
  FileAudio,
  FileText,
  ThumbsUp,
  MessageCircle
} from 'lucide-react';
import { Question, User } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extended Question type with user information
type QuestionWithUser = Question & {
  user: User | null;
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithUser | null>(null);
  const [isViewQuestionOpen, setIsViewQuestionOpen] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<string>('all');
  const [currentTab, setCurrentTab] = useState<string>('all');
  
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await SupabaseService.getAllQuestionsWithUserDetails();
        setQuestions(data);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await SupabaseService.deleteQuestion(questionId);
      
      // Refresh the questions list
      const updatedQuestions = await SupabaseService.getAllQuestionsWithUserDetails();
      setQuestions(updatedQuestions);
      
      // Close dialog if open
      if (isViewQuestionOpen) {
        setIsViewQuestionOpen(false);
        setSelectedQuestion(null);
      }
    } catch (err) {
      console.error('Error deleting question:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete question');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getMediaIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <FileAudio className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Filter questions based on search term, media type, and tab
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (question.user?.first_name + ' ' + question.user?.last_name).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMedia = mediaFilter === 'all' || question.media_type === mediaFilter;
    
    const matchesTab = currentTab === 'all' || 
                      (currentTab === 'withMedia' && question.media_type !== null) ||
                      (currentTab === 'withoutMedia' && question.media_type === null) ||
                      (currentTab === 'mostLiked' && question.like_count > 0) ||
                      (currentTab === 'mostCommented' && question.comment_count > 0);
    
    return matchesSearch && matchesMedia && matchesTab;
  });

  // Sort questions based on tab
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (currentTab === 'mostLiked') {
      return b.like_count - a.like_count;
    } else if (currentTab === 'mostCommented') {
      return b.comment_count - a.comment_count;
    } else {
      // Default sort by date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  if (loading && questions.length === 0) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold">Question Management</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search questions..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter Media
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setMediaFilter('all')}>
                  <FileText className="h-4 w-4 mr-2" />
                  All Types
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMediaFilter('image')}>
                  <Image className="h-4 w-4 mr-2" />
                  Images
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMediaFilter('video')}>
                  <Video className="h-4 w-4 mr-2" />
                  Videos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMediaFilter('audio')}>
                  <FileAudio className="h-4 w-4 mr-2" />
                  Audio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMediaFilter('text')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Text Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="all" onValueChange={setCurrentTab}>
          <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
            <TabsTrigger value="all">All Questions</TabsTrigger>
            <TabsTrigger value="withMedia">With Media</TabsTrigger>
            <TabsTrigger value="withoutMedia">Text Only</TabsTrigger>
            <TabsTrigger value="mostLiked">Most Liked</TabsTrigger>
            <TabsTrigger value="mostCommented">Most Commented</TabsTrigger>
          </TabsList>
          
          <TabsContent value={currentTab}>
            <Card className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Posted By</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedQuestions.length > 0 ? (
                    sortedQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium max-w-xs">
                          {truncateText(question.question, 80)}
                        </TableCell>
                        <TableCell>
                          {question.user ? (
                            <div className="flex flex-col">
                              <span>{question.user.first_name} {question.user.last_name}</span>
                              <span className="text-xs text-gray-500">{question.user.role}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">Unknown User</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {question.media_type ? (
                            <div className="flex items-center">
                              {getMediaIcon(question.media_type)}
                              <span className="ml-2 capitalize">{question.media_type}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="flex items-center">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {question.like_count}
                            </Badge>
                            <Badge variant="outline" className="flex items-center">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {question.comment_count}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(question.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <span className="sr-only">Open menu</span>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Dialog open={isViewQuestionOpen && selectedQuestion?.id === question.id}
                                      onOpenChange={(open) => {
                                        setIsViewQuestionOpen(open);
                                        if (!open) setSelectedQuestion(null);
                                      }}>
                                <DialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    setSelectedQuestion(question);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Question Details</DialogTitle>
                                    <DialogDescription>
                                      Full details of the selected question.
                                    </DialogDescription>
                                  </DialogHeader>
                                  {selectedQuestion && (
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-500">Posted By</Label>
                                        <div className="flex items-center space-x-2">
                                          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            {selectedQuestion.user?.first_name.charAt(0)}
                                            {selectedQuestion.user?.last_name.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="font-medium">
                                              {selectedQuestion.user?.first_name} {selectedQuestion.user?.last_name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                              {selectedQuestion.user?.role} • {selectedQuestion.user?.persona}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-500">Question</Label>
                                        <div className="p-4 bg-gray-50 rounded-md">
                                          <p>{selectedQuestion.question}</p>
                                        </div>
                                      </div>
                                      
                                      {selectedQuestion.media_type && selectedQuestion.file_url && (
                                        <div className="space-y-2">
                                          <Label className="text-sm font-medium text-gray-500">Media</Label>
                                          <div className="p-4 bg-gray-50 rounded-md">
                                            {selectedQuestion.media_type === 'image' && (
                                              <img 
                                                src={selectedQuestion.file_url} 
                                                alt="Question media" 
                                                className="max-h-64 rounded-md mx-auto"
                                              />
                                            )}
                                            {selectedQuestion.media_type === 'video' && (
                                              <video 
                                                src={selectedQuestion.file_url} 
                                                controls 
                                                className="max-h-64 w-full rounded-md"
                                              />
                                            )}
                                            {selectedQuestion.media_type === 'audio' && (
                                              <audio 
                                                src={selectedQuestion.file_url} 
                                                controls 
                                                className="w-full"
                                              />
                                            )}
                                            <p className="text-sm text-gray-500 mt-2">
                                              File path: {selectedQuestion.folder_path}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label className="text-sm font-medium text-gray-500">Likes</Label>
                                          <div className="flex items-center space-x-2">
                                            <ThumbsUp className="h-4 w-4 text-blue-500" />
                                            <span className="text-lg font-medium">{selectedQuestion.like_count}</span>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-sm font-medium text-gray-500">Comments</Label>
                                          <div className="flex items-center space-x-2">
                                            <MessageCircle className="h-4 w-4 text-blue-500" />
                                            <span className="text-lg font-medium">{selectedQuestion.comment_count}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-500">Posted</Label>
                                        <p>{formatDate(selectedQuestion.created_at)}</p>
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button variant="destructive" onClick={() => selectedQuestion && handleDeleteQuestion(selectedQuestion.id)}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Question
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                handleDeleteQuestion(question.id);
                              }}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        <MessageSquare className="h-8 w-8 mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">
                          {searchTerm || mediaFilter !== 'all' ? 'No questions match your filters' : 'No questions found'}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
