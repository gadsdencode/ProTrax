import { useState } from "react";
import { Check, X, Edit2, User } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

interface InlineAssigneeFieldProps {
  value: string | null;
  users: User[];
  onSave: (value: string | null) => void;
  triggerClassName?: string;
  popoverClassName?: string;
  testId?: string;
  label?: string;
}

export function InlineAssigneeField({
  value,
  users,
  onSave,
  triggerClassName = "",
  popoverClassName = "",
  testId,
  label,
}: InlineAssigneeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || "unassigned");

  const handleSave = () => {
    onSave(tempValue === "unassigned" ? null : tempValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value || "unassigned");
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempValue(value || "unassigned");
    }
    setIsOpen(open);
  };

  const currentUser = value ? users.find(u => u.id === value) : null;

  const getUserDisplayName = (user: User) => {
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user.email || "Unknown";
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div 
          className={`inline-flex items-center gap-2 cursor-pointer hover-elevate px-2 py-0.5 rounded-md ${triggerClassName}`}
          data-testid={testId ? `${testId}-trigger` : undefined}
        >
          {currentUser ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={currentUser.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {currentUser.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{getUserDisplayName(currentUser)}</span>
            </>
          ) : (
            <>
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unassigned</span>
            </>
          )}
          <Edit2 className="h-3 w-3 text-muted-foreground opacity-60 hover:opacity-100 transition-opacity ml-auto" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className={`w-auto p-3 ${popoverClassName}`}
        align="start"
        sideOffset={5}
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
              className="w-[250px]" 
              data-testid={testId ? `${testId}-select` : undefined}
            >
              <SelectValue>
                {tempValue === "unassigned" ? (
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Unassigned
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {(() => {
                      const user = users.find(u => u.id === tempValue);
                      return user ? (
                        <>
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {user.email?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {getUserDisplayName(user)}
                        </>
                      ) : "Select user...";
                    })()}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Unassigned</span>
                </div>
              </SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{getUserDisplayName(user)}</span>
                  </div>
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
              disabled={tempValue === (value || "unassigned")}
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