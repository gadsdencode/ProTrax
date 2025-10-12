import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CustomField, InsertCustomField } from "@shared/schema";

interface CustomFieldsSettingsProps {
  projectId: number;
}

export function CustomFieldsSettings({ projectId }: CustomFieldsSettingsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "number" | "date" | "dropdown">("text");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const { toast } = useToast();

  const { data: customFields, isLoading } = useQuery<CustomField[]>({
    queryKey: [`/api/projects/${projectId}/custom-fields`],
  });

  const createFieldMutation = useMutation({
    mutationFn: async (data: InsertCustomField) => {
      return await apiRequest("POST", "/api/custom-fields", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/custom-fields`] });
      setShowAddDialog(false);
      resetForm();
      toast({
        title: "Custom field created",
        description: "The custom field has been added successfully",
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

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: number) => {
      return await apiRequest("DELETE", `/api/custom-fields/${fieldId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/custom-fields`] });
      toast({
        title: "Custom field deleted",
        description: "The custom field has been removed",
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

  const resetForm = () => {
    setFieldName("");
    setFieldType("text");
    setDropdownOptions([]);
    setNewOption("");
  };

  const handleAddOption = () => {
    if (newOption.trim() && !dropdownOptions.includes(newOption.trim())) {
      setDropdownOptions([...dropdownOptions, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (option: string) => {
    setDropdownOptions(dropdownOptions.filter(o => o !== option));
  };

  const handleCreateField = () => {
    if (!fieldName.trim()) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      });
      return;
    }

    if (fieldType === "dropdown" && dropdownOptions.length === 0) {
      toast({
        title: "Error",
        description: "At least one option is required for dropdown fields",
        variant: "destructive",
      });
      return;
    }

    const data: InsertCustomField = {
      projectId,
      name: fieldName,
      type: fieldType,
      options: fieldType === "dropdown" ? dropdownOptions : undefined,
    };

    createFieldMutation.mutate(data);
  };

  return (
    <>
      <Card data-testid="custom-fields-settings">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Custom Fields
            </span>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-custom-field"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Field
            </Button>
          </CardTitle>
          <CardDescription>
            Define custom fields to capture additional information for tasks in this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : customFields?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom fields defined. Click "Add Field" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {customFields?.map((field) => (
                <Card key={field.id} data-testid={`custom-field-item-${field.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{field.name}</span>
                          <Badge variant="secondary">{field.type}</Badge>
                        </div>
                        {field.type === "dropdown" && field.options && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.options.map(option => (
                              <Badge key={option} variant="outline" className="text-xs">
                                {option}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteFieldMutation.mutate(field.id)}
                        disabled={deleteFieldMutation.isPending}
                        data-testid={`button-delete-field-${field.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Field Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g., Customer Name, Sprint"
                data-testid="input-field-name"
              />
            </div>

            <div>
              <Label htmlFor="field-type">Field Type</Label>
              <Select
                value={fieldType}
                onValueChange={(value: any) => setFieldType(value)}
              >
                <SelectTrigger id="field-type" data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fieldType === "dropdown" && (
              <div>
                <Label>Dropdown Options</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Add option"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    data-testid="input-dropdown-option"
                  />
                  <Button
                    type="button"
                    onClick={handleAddOption}
                    data-testid="button-add-option"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {dropdownOptions.map(option => (
                    <Badge
                      key={option}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveOption(option)}
                      data-testid={`option-badge-${option}`}
                    >
                      {option}
                      <Trash2 className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateField}
                disabled={createFieldMutation.isPending}
                data-testid="button-create-field"
              >
                {createFieldMutation.isPending ? "Creating..." : "Create Field"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}