import { useState } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SelectOption {
  value: string;
  label: string;
}

interface InlineSelectFieldProps {
  value: string;
  displayValue?: React.ReactNode;
  options: SelectOption[];
  onSave: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  renderDisplay?: (value: string) => React.ReactNode;
  testId?: string;
  label?: string;
}

export function InlineSelectField({
  value,
  displayValue,
  options,
  onSave,
  placeholder = "Select an option",
  triggerClassName = "",
  popoverClassName = "",
  renderDisplay,
  testId,
  label,
}: InlineSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onSave(tempValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempValue(value);
    }
    setIsOpen(open);
  };

  const displayContent = renderDisplay 
    ? renderDisplay(value) 
    : (displayValue || options.find(opt => opt.value === value)?.label || placeholder);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div 
          className={`inline-flex items-center gap-1 cursor-pointer hover-elevate px-2 py-0.5 rounded-md ${triggerClassName}`}
          data-testid={testId ? `${testId}-trigger` : undefined}
        >
          {displayContent}
          <Edit2 className="h-3 w-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className={`w-auto p-3 ${popoverClassName}`}
        align="start"
        data-testid={testId ? `${testId}-popover` : undefined}
      >
        <div className="space-y-3">
          {label && (
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
          )}
          <Select
            value={tempValue}
            onValueChange={setTempValue}
          >
            <SelectTrigger 
              className="w-[200px]" 
              data-testid={testId ? `${testId}-select` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              data-testid={testId ? `${testId}-cancel` : undefined}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={tempValue === value}
              data-testid={testId ? `${testId}-save` : undefined}
            >
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}