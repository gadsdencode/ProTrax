import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, User, MessageSquare, Paperclip, MoreVertical, Plus, ListTree, ChevronRight, Check, X, Edit2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<any>(null);
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

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<Task>) => {
      return await apiRequest("PATCH", `/api/tasks/${task?.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
      });
      setEditingField(null);
      setTempValue(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setEditingField(null);
      setTempValue(null);
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

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setTempValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue(null);
  };

  const saveField = (field: string, value: any) => {
    const updates: any = {};
    
    if (field === 'status' || field === 'priority' || field === 'assigneeId') {
      updates[field] = value;
    } else if (field === 'dueDate') {
      updates.dueDate = value ? value.toISOString() : null;
    } else if (field === 'estimatedHours') {
      updates.estimatedHours = value ? parseFloat(value) : null;
    }
    
    updateTaskMutation.mutate(updates);
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
            {/* Status inline editing */}
            {editingField === 'status' ? (
              <Select
                value={tempValue}
                onValueChange={(value) => {
                  setTempValue(value);
                  saveField('status', value);
                }}
              >
                <SelectTrigger className="w-[140px] h-7" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge 
                variant={task.status === 'done' ? 'default' : 'secondary'}
                className="cursor-pointer hover-elevate"
                onClick={() => startEditing('status', task.status)}
                data-testid="badge-status"
              >
                {task.status?.replace('_', ' ')}
              </Badge>
            )}
            
            {/* Priority inline editing */}
            {editingField === 'priority' ? (
              <Select
                value={tempValue}
                onValueChange={(value) => {
                  setTempValue(value);
                  saveField('priority', value);
                }}
              >
                <SelectTrigger className="w-[120px] h-7" data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge 
                variant={task.priority === 'urgent' ? 'destructive' : 'outline'}
                className="cursor-pointer hover-elevate"
                onClick={() => startEditing('priority', task.priority)}
                data-testid="badge-priority"
              >
                {task.priority}
              </Badge>
            )}
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
            {/* Assignee inline editing */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Assignee:</span>
              {editingField === 'assigneeId' ? (
                <Select
                  value={tempValue || ""}
                  onValueChange={(value) => {
                    setTempValue(value);
                    saveField('assigneeId', value === "unassigned" ? null : value);
                  }}
                >
                  <SelectTrigger className="w-[200px] h-7" data-testid="select-assignee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div 
                  className="flex items-center gap-2 cursor-pointer hover-elevate px-2 py-0.5 rounded-md -ml-2"
                  onClick={() => startEditing('assigneeId', task.assigneeId || "unassigned")}
                  data-testid="assignee-display"
                >
                  {assignee ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={assignee.profileImageUrl || undefined} />
                        <AvatarFallback>{assignee.email?.[0]}</AvatarFallback>
                      </Avatar>
                      <span>{assignee.firstName && assignee.lastName 
                        ? `${assignee.firstName} ${assignee.lastName}` 
                        : assignee.email}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                  <Edit2 className="h-3 w-3 ml-1 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Due Date inline editing */}
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              {editingField === 'dueDate' ? (
                <Popover open={true} onOpenChange={(open) => {
                  if (!open) {
                    saveField('dueDate', tempValue);
                  }
                }}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-7 px-2 justify-start text-left font-normal"
                      data-testid="button-due-date"
                    >
                      {tempValue ? format(tempValue, "MMM dd, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={tempValue}
                      onSelect={(date) => {
                        setTempValue(date);
                        saveField('dueDate', date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div 
                  className="flex items-center gap-1 cursor-pointer hover-elevate px-2 py-0.5 rounded-md -ml-2"
                  onClick={() => startEditing('dueDate', task.dueDate ? new Date(task.dueDate) : null)}
                  data-testid="due-date-display"
                >
                  <span>{task.dueDate ? format(new Date(task.dueDate), "MMM dd, yyyy") : "No due date"}</span>
                  <Edit2 className="h-3 w-3 ml-1 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Estimated Hours inline editing */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estimated:</span>
              {editingField === 'estimatedHours' ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={tempValue || ""}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={() => saveField('estimatedHours', tempValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveField('estimatedHours', tempValue);
                      } else if (e.key === 'Escape') {
                        cancelEditing();
                      }
                    }}
                    className="w-20 h-7"
                    data-testid="input-estimated-hours"
                    autoFocus
                  />
                  <span className="text-muted-foreground">hours</span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-1 cursor-pointer hover-elevate px-2 py-0.5 rounded-md -ml-2"
                  onClick={() => startEditing('estimatedHours', task.estimatedHours || "")}
                  data-testid="estimated-hours-display"
                >
                  <span>{task.estimatedHours ? `${task.estimatedHours}h` : "No estimate"}</span>
                  <Edit2 className="h-3 w-3 ml-1 text-muted-foreground" />
                </div>
              )}
            </div>
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
