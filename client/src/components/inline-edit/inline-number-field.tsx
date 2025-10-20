import { useState } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface InlineNumberFieldProps {
  value: number | null;
  onSave: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  testId?: string;
  label?: string;
  formatDisplay?: (value: number) => string;
}

export function InlineNumberField({
  value,
  onSave,
  placeholder = "No value",
  min,
  max,
  step = 1,
  suffix,
  prefix,
  triggerClassName = "",
  popoverClassName = "",
  testId,
  label,
  formatDisplay,
}: InlineNumberFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const validateValue = (val: string): boolean => {
    if (val === "") return true; // Allow empty value

    const num = parseFloat(val);
    if (isNaN(num)) {
      setError("Please enter a valid number");
      return false;
    }

    if (min !== undefined && num < min) {
      setError(`Value must be at least ${min}`);
      return false;
    }

    if (max !== undefined && num > max) {
      setError(`Value must be at most ${max}`);
      return false;
    }

    setError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateValue(tempValue)) return;

    const newValue = tempValue === "" ? null : parseFloat(tempValue);
    onSave(newValue);
    setIsOpen(false);
    setTempValue("");
    setError(null);
  };

  const handleCancel = () => {
    setTempValue("");
    setError(null);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Initialize temp value when opening
      setTempValue(value?.toString() || "");
      setError(null);
    } else {
      // Clear state when closing
      setTempValue("");
      setError(null);
    }
    setIsOpen(open);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTempValue(newValue);
    // Clear error on change to provide better UX
    if (error) setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const displayValue = value !== null
    ? formatDisplay 
      ? formatDisplay(value)
      : `${prefix || ""}${value}${suffix || ""}`
    : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div 
          className={`inline-flex items-center gap-1 cursor-pointer hover-elevate px-2 py-0.5 rounded-md ${triggerClassName}`}
          data-testid={testId ? `${testId}-trigger` : undefined}
        >
          <span className={value === null ? "text-muted-foreground" : ""}>
            {displayValue}
          </span>
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
          <div className="flex items-center gap-2">
            {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
            <Input
              type="number"
              value={tempValue}
              onChange={handleInputChange}
              onBlur={() => validateValue(tempValue)}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              step={step}
              className="w-32"
              data-testid={testId ? `${testId}-input` : undefined}
              autoFocus
            />
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
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
              disabled={
                !validateValue(tempValue) ||
                (tempValue === "" && value === null) ||
                (tempValue !== "" && parseFloat(tempValue) === value)
              }
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