import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, User, MessageSquare, Paperclip, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, Comment, InsertComment, User as UserType } from "@shared/schema";

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetail({ task, open, onOpenChange }: TaskDetailProps) {
  const [commentText, setCommentText] = useState("");
  const { toast } = useToast();

  const { data: comments } = useQuery<Comment[]>({
    queryKey: ["/api/comments", { taskId: task?.id }],
    enabled: !!task?.id && open,
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: InsertComment) => {
      return await apiRequest("POST", "/api/comments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments", { taskId: task?.id }] });
      setCommentText("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!task) return null;

  const assignee = users?.find(u => u.id === task.assigneeId);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    // userId will be set by the backend from the session
    createCommentMutation.mutate({
      taskId: task.id,
      content: commentText,
      userId: "", // Backend will override from session
    } as any);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto" data-testid="task-detail-sheet">
        <SheetHeader>
          <SheetTitle className="text-xl">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status & Priority */}
          <div className="flex items-center gap-2">
            <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
              {task.status?.replace('_', ' ')}
            </Badge>
            <Badge variant={task.priority === 'urgent' ? 'destructive' : 'outline'}>
              {task.priority}
            </Badge>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="grid gap-3">
            {assignee && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Assignee:</span>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignee.profileImageUrl || undefined} />
                    <AvatarFallback>{assignee.email?.[0]}</AvatarFallback>
                  </Avatar>
                  <span>{assignee.firstName && assignee.lastName 
                    ? `${assignee.firstName} ${assignee.lastName}` 
                    : assignee.email}</span>
                </div>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span>{format(new Date(task.dueDate), "MMM dd, yyyy")}</span>
              </div>
            )}

            {task.estimatedHours && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Estimated:</span>
                <span>{task.estimatedHours}h</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments?.length || 0})
            </h4>

            <div className="space-y-4 mb-4">
              {comments?.map(comment => {
                const commentAuthor = users?.find(u => u.id === comment.userId);
                return (
                  <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={commentAuthor?.profileImageUrl || undefined} />
                      <AvatarFallback>{commentAuthor?.email?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {commentAuthor?.firstName && commentAuthor?.lastName 
                            ? `${commentAuthor.firstName} ${commentAuthor.lastName}` 
                            : commentAuthor?.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {comment.createdAt && format(new Date(comment.createdAt), "MMM dd, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                data-testid="input-comment"
              />
              <Button
                onClick={handleAddComment}
                disabled={!commentText.trim() || createCommentMutation.isPending}
                size="sm"
                data-testid="button-add-comment"
              >
                {createCommentMutation.isPending ? "Adding..." : "Add Comment"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
