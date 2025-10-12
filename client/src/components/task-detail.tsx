import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Clock, User, MessageSquare, Paperclip, MoreVertical, Plus, ListTree, ChevronRight } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task, Comment, InsertComment, InsertTask, User as UserType, CustomField, TaskCustomFieldValue } from "@shared/schema";
import { TaskForm } from "./task-form";

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetail({ task, open, onOpenChange }: TaskDetailProps) {
  const [commentText, setCommentText] = useState("");
  const [showSubtaskDialog, setShowSubtaskDialog] = useState(false);
  const [quickSubtaskTitle, setQuickSubtaskTitle] = useState("");
  const { toast } = useToast();

  const { data: comments } = useQuery<Comment[]>({
    queryKey: ["/api/comments", { taskId: task?.id }],
    enabled: !!task?.id && open,
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: subtasks } = useQuery<Task[]>({
    queryKey: [`/api/tasks/${task?.id}/subtasks`],
    enabled: !!task?.id && open,
  });

  const { data: customFields } = useQuery<CustomField[]>({
    queryKey: [`/api/projects/${task?.projectId}/custom-fields`],
    enabled: !!task?.projectId && open,
  });

  const { data: customFieldValues } = useQuery<TaskCustomFieldValue[]>({
    queryKey: [`/api/tasks/${task?.id}/custom-field-values`],
    enabled: !!task?.id && open,
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

  const createSubtaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const result = await apiRequest("POST", "/api/tasks", data);
      console.log('Created subtask:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate both the subtasks query and the parent task query
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/subtasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowSubtaskDialog(false);
      setQuickSubtaskTitle("");
      toast({
        title: "Subtask created",
        description: "The subtask has been added successfully",
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

  const updateCustomFieldValueMutation = useMutation({
    mutationFn: async ({ fieldId, value }: { fieldId: number; value: string }) => {
      return await apiRequest("PUT", `/api/tasks/${task?.id}/custom-field-values/${fieldId}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}/custom-field-values`] });
      toast({
        title: "Field updated",
        description: "Custom field value has been updated",
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

  const handleQuickAddSubtask = async () => {
    if (!quickSubtaskTitle.trim()) return;
    await createSubtaskMutation.mutateAsync({
      title: quickSubtaskTitle,
      projectId: task.projectId,
      parentId: task.id,
      status: "todo",
      priority: "medium"
    } as InsertTask);
  };


  const getCustomFieldValue = (fieldId: number) => {
    return customFieldValues?.find(v => v.customFieldId === fieldId)?.value || "";
  };

  const handleCustomFieldChange = (fieldId: number, value: string) => {
    updateCustomFieldValueMutation.mutate({ fieldId, value });
  };

  return (
    <>
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

          {/* Subtasks */}
          <div>
            <h4 className="font-medium mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ListTree className="h-4 w-4" />
                Subtasks ({subtasks?.length || 0})
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSubtaskDialog(true)}
                data-testid="button-add-subtask-dialog"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Subtask
              </Button>
            </h4>

            {/* Quick add subtask */}
            <div className="flex gap-2 mb-4">
              <Input
                value={quickSubtaskTitle}
                onChange={(e) => setQuickSubtaskTitle(e.target.value)}
                placeholder="Quick add subtask..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAddSubtask();
                  }
                }}
                data-testid="input-quick-subtask"
              />
              <Button
                onClick={handleQuickAddSubtask}
                disabled={!quickSubtaskTitle.trim() || createSubtaskMutation.isPending}
                data-testid="button-quick-add-subtask"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Subtask list */}
            <div className="space-y-2">
              {subtasks?.map(subtask => {
                const subtaskAssignee = users?.find(u => u.id === subtask.assigneeId);
                return (
                  <Card key={subtask.id} className="p-3" data-testid={`subtask-${subtask.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{subtask.title}</span>
                        </div>
                        {subtask.description && (
                          <p className="text-xs text-muted-foreground mt-1 ml-5">
                            {subtask.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={subtask.status === 'done' ? 'default' : 'secondary'} className="text-xs">
                          {subtask.status?.replace('_', ' ')}
                        </Badge>
                        {subtaskAssignee && (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={subtaskAssignee.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {subtaskAssignee.email?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Custom Fields */}
          {customFields && customFields.length > 0 && (
            <>
              <div>
                <h4 className="font-medium mb-3">Custom Fields</h4>
                <div className="space-y-3">
                  {customFields.map(field => {
                    const currentValue = getCustomFieldValue(field.id);
                    return (
                      <div key={field.id} data-testid={`custom-field-${field.id}`}>
                        <label className="text-sm font-medium">{field.name}</label>
                        {field.type === 'text' && (
                          <Input
                            value={currentValue}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            className="mt-1"
                            data-testid={`custom-field-input-${field.id}`}
                          />
                        )}
                        {field.type === 'number' && (
                          <Input
                            type="number"
                            value={currentValue}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            className="mt-1"
                            data-testid={`custom-field-input-${field.id}`}
                          />
                        )}
                        {field.type === 'dropdown' && field.options && (
                          <select
                            value={currentValue}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            data-testid={`custom-field-select-${field.id}`}
                          >
                            <option value="">Select...</option>
                            {field.options.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        )}
                        {field.type === 'date' && (
                          <Input
                            type="date"
                            value={currentValue}
                            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                            className="mt-1"
                            data-testid={`custom-field-input-${field.id}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <Separator />
            </>
          )}

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

    {/* Subtask Dialog */}
    <Dialog open={showSubtaskDialog} onOpenChange={setShowSubtaskDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Subtask</DialogTitle>
        </DialogHeader>
        <TaskForm
          onSubmit={async (data) => {
            const result = await createSubtaskMutation.mutateAsync({
              ...data,
              parentId: task.id,
              projectId: task.projectId
            });
            return result;
          }}
          isLoading={createSubtaskMutation.isPending}
          projectId={task?.projectId}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
