import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertTaskSchema, type InsertTask, type User, type CustomField, type Task } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUIStore } from "@/stores/useUIStore";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Repeat } from "lucide-react";

interface TaskFormProps {
  onSubmit: (data: InsertTask) => void;
  isLoading?: boolean;
  defaultValues?: Partial<InsertTask>;
  projectId?: number;
  parentId?: number;
  presetStatus?: string;
}

export function TaskForm({ onSubmit, isLoading, defaultValues, projectId, parentId, presetStatus }: TaskFormProps) {
  const { selectedProjectId } = useUIStore();
  // Use prop projectId if provided, otherwise fall back to selectedProjectId from store
  const effectiveProjectId = projectId || selectedProjectId || undefined;
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecurring, setIsRecurring] = useState(!!defaultValues?.recurrenceType);
  const { toast } = useToast();
  
  // Fetch users for assignee selection
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch custom fields for the project
  const { data: customFields } = useQuery<CustomField[]>({
    queryKey: [`/api/projects/${effectiveProjectId}/custom-fields`],
    enabled: !!effectiveProjectId,
  });

  // Create mutation for updating custom field values in batch
  const updateCustomFieldValuesBatchMutation = useMutation({
    mutationFn: async ({ taskId, values }: { taskId: number; values: Array<{ customFieldId: string; value: string }> }) => {
      return await apiRequest("PUT", `/api/tasks/${taskId}/custom-field-values/batch`, { values });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving custom fields",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Wrapped submit handler to also save custom field values
  const handleSubmit = async (data: InsertTask) => {
    setIsProcessing(true);
    try {
      // First create the task - this should return the created task with ID
      const createdTask = await onSubmit(data) as unknown as Task;
      console.log('Created task response:', createdTask);
      console.log('Created task ID:', createdTask?.id);
      console.log('Created task type:', typeof createdTask);
      console.log('Custom field values to save:', customFieldValues);
      console.log('Custom fields:', customFields);
      
      // If we have custom field values and task was created, save them
      if (createdTask?.id && customFields && customFields.length > 0) {
        const valuesToSave = Object.entries(customFieldValues)
          .filter(([_, value]) => value) // Only save non-empty values
          .map(([fieldId, value]) => ({
            customFieldId: fieldId,
            value
          }));
        
        if (valuesToSave.length > 0) {
          console.log(`Saving ${valuesToSave.length} custom field values for task ${createdTask.id} in batch`);
          console.log('Values being sent to batch endpoint:', valuesToSave);
          await updateCustomFieldValuesBatchMutation.mutateAsync({
            taskId: createdTask.id,
            values: valuesToSave
          });
          console.log('Custom field values saved successfully in batch');
        } else {
          console.log('No custom field values to save');
        }
      } else {
        console.log('Skipping custom fields - task ID:', createdTask?.id, 'customFields:', customFields?.length);
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      status: (presetStatus || "todo") as any,
      priority: "medium",
      projectId: effectiveProjectId,
      parentId: parentId,
      assigneeId: undefined,
      startDate: undefined,
      dueDate: undefined,
      estimatedHours: undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter task title"
                  data-testid="input-task-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  placeholder="Task description"
                  data-testid="input-task-description"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignee</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                <FormControl>
                  <SelectTrigger data-testid="select-task-assignee">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {!presetStatus && (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-task-status">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-task-priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    data-testid="input-task-start-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    data-testid="input-task-due-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="estimatedHours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Hours</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.5"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0"
                  data-testid="input-task-estimated-hours"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recurring Task Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-recurring"
              checked={isRecurring}
              onCheckedChange={(checked) => {
                setIsRecurring(!!checked);
                if (!checked) {
                  form.setValue('recurrenceType', undefined);
                  form.setValue('recurrenceInterval', undefined);
                  form.setValue('recurrenceEndDate', undefined);
                }
              }}
              data-testid="checkbox-recurring-task"
            />
            <label
              htmlFor="is-recurring"
              className="text-sm font-medium flex items-center gap-2 cursor-pointer"
            >
              <Repeat className="h-4 w-4" />
              Recurring Task
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-4 pl-6">
              <FormField
                control={form.control}
                name="recurrenceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence Pattern</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-recurrence-type">
                          <SelectValue placeholder="Select recurrence pattern" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom Interval</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('recurrenceType') === 'custom' && (
                <FormField
                  control={form.control}
                  name="recurrenceInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interval (in days)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Enter number of days"
                          data-testid="input-recurrence-interval"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="recurrenceEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        data-testid="input-recurrence-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Custom Fields */}
        {customFields && customFields.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Custom Fields</h4>
            {customFields.map(field => (
              <div key={field.id} data-testid={`custom-field-${field.id}`}>
                <label className="text-sm font-medium">{field.name}</label>
                {field.type === 'text' && (
                  <Input
                    value={customFieldValues[field.id] || ""}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.id]: e.target.value
                    })}
                    className="mt-1"
                    data-testid={`custom-field-input-${field.id}`}
                  />
                )}
                {field.type === 'number' && (
                  <Input
                    type="number"
                    value={customFieldValues[field.id] || ""}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.id]: e.target.value
                    })}
                    className="mt-1"
                    data-testid={`custom-field-input-${field.id}`}
                  />
                )}
                {field.type === 'dropdown' && field.options && (
                  <select
                    value={customFieldValues[field.id] || ""}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.id]: e.target.value
                    })}
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
                    value={customFieldValues[field.id] || ""}
                    onChange={(e) => setCustomFieldValues({
                      ...customFieldValues,
                      [field.id]: e.target.value
                    })}
                    className="mt-1"
                    data-testid={`custom-field-input-${field.id}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isLoading || isProcessing}
            data-testid="button-submit-task"
          >
            {isLoading || isProcessing ? "Saving..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
