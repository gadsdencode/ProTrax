import { useState, useMemo } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface InlineEstimatedHoursProps {
  value: string | null;
  onSave: (value: string | null) => void;
}

export function InlineEstimatedHours({
  value,
  onSave,
}: InlineEstimatedHoursProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Convert string value to number for display
  const numericValue = useMemo(() => {
    if (!value) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }, [value]);

  const validateValue = (val: string): boolean => {
    if (val === "") return true; // Allow empty value

    const num = parseFloat(val);
    if (isNaN(num)) {
      setError("Please enter a valid number");
      return false;
    }

    if (num < 0) {
      setError("Value must be positive");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateValue(tempValue)) return;

    const newValue = tempValue === "" ? null : tempValue;
    onSave(newValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue("");
    setError(null);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Initialize with numeric value as string
      setTempValue(numericValue?.toString() || "");
      setError(null);
    } else {
      // Clear when closing
      setTempValue("");
      setError(null);
    }
    setIsOpen(open);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTempValue(newValue);
    // Clear error when user types
    if (error) setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const displayValue = numericValue !== null
    ? `${numericValue}h`
    : "No estimate";

  const hasChanges = () => {
    if (tempValue === "" && !value) return false;
    if (tempValue === "" && value) return true;
    const tempNum = parseFloat(tempValue);
    return !isNaN(tempNum) && tempNum !== numericValue;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div 
          className="inline-flex items-center gap-1 cursor-pointer hover-elevate px-2 py-0.5 rounded-md"
          data-testid="estimated-hours-trigger"
        >
          <span className={numericValue === null ? "text-muted-foreground" : ""}>
            {displayValue}
          </span>
          <Edit2 className="h-3 w-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-3"
        align="start"
        data-testid="estimated-hours-popover"
      >
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Estimated Hours
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={tempValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => validateValue(tempValue)}
              min="0"
              step="0.5"
              className="w-32"
              placeholder="0"
              data-testid="estimated-hours-input"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              data-testid="estimated-hours-cancel"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!validateValue(tempValue) || !hasChanges()}
              data-testid="estimated-hours-save"
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