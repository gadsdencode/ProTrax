import { useState } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InlineEstimatedHoursSimpleProps {
  value: string | null;
  onSave: (value: string | null) => void;
}

export function InlineEstimatedHoursSimple({
  value,
  onSave,
}: InlineEstimatedHoursSimpleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState("");

  // Parse the numeric value for display
  const getDisplayValue = () => {
    if (!value) return "No estimate";
    const parsed = parseFloat(value);
    return isNaN(parsed) ? "No estimate" : `${parsed}h`;
  };

  const startEdit = () => {
    if (!value) {
      setTempValue("");
    } else {
      const parsed = parseFloat(value);
      setTempValue(isNaN(parsed) ? "" : parsed.toString());
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = tempValue.trim();
    if (trimmed === "") {
      onSave(null);
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num >= 0) {
        // Convert to string format that backend expects (decimal string)
        onSave(num.toString());
      }
    }
    setIsEditing(false);
    setTempValue("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempValue("");
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

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1">
        <Input
          type="number"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          min="0"
          step="0.5"
          className="w-20 h-7"
          placeholder="0"
          data-testid="estimated-hours-input"
          autoFocus
        />
        <span className="text-sm text-muted-foreground">hours</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-1"
          onClick={handleSave}
          data-testid="estimated-hours-save"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-1"
          onClick={handleCancel}
          data-testid="estimated-hours-cancel"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="inline-flex items-center gap-1 cursor-pointer hover-elevate px-2 py-0.5 rounded-md"
      onClick={startEdit}
      data-testid="estimated-hours-trigger"
    >
      <span className={!value ? "text-muted-foreground" : ""}>
        {getDisplayValue()}
      </span>
      <Edit2 className="h-3 w-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity" />
    </div>
  );
}