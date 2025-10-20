import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface InlineDateFieldProps {
  value: Date | null;
  onSave: (value: Date | null) => void;
  placeholder?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  testId?: string;
  label?: string;
}

export function InlineDateField({
  value,
  onSave,
  placeholder = "No date set",
  triggerClassName = "",
  popoverClassName = "",
  testId,
  label,
}: InlineDateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState<Date | null>(value);

  const handleSave = () => {
    onSave(tempValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempValue(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempValue(value);
    }
    setIsOpen(open);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div 
          className={`inline-flex items-center gap-1 cursor-pointer hover-elevate px-2 py-0.5 rounded-md ${triggerClassName}`}
          data-testid={testId ? `${testId}-trigger` : undefined}
        >
          {value ? (
            <>
              <CalendarIcon className="h-3 w-3 text-muted-foreground mr-1" />
              {format(value, "MMM dd, yyyy")}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
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
          <Calendar
            mode="single"
            selected={tempValue || undefined}
            onSelect={(date) => setTempValue(date || null)}
            initialFocus
          />
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              disabled={!tempValue}
              data-testid={testId ? `${testId}-clear` : undefined}
            >
              Clear
            </Button>
            <div className="flex items-center gap-2">
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
                disabled={
                  (tempValue?.getTime() === value?.getTime()) ||
                  (!tempValue && !value)
                }
                data-testid={testId ? `${testId}-save` : undefined}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}