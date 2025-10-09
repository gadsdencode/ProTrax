import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, Mail } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project, User } from "@shared/schema";

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
  initialReportType?: string;
}

export function EmailReportDialog({ open, onOpenChange, projectId, initialReportType }: EmailReportDialogProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>(initialReportType || "summary");
  const [emailInput, setEmailInput] = useState("");
  const [recipients, setRecipients] = useState<Array<{ email: string; name?: string }>>([]);

  // Update report type when initialReportType changes
  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
    }
  }, [initialReportType, open]);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const selectedProject = projectId 
    ? projects?.find(p => p.id === projectId) 
    : projects?.[0];

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject) {
        throw new Error("No project selected");
      }
      if (recipients.length === 0) {
        throw new Error("Please add at least one recipient");
      }

      const res = await apiRequest("POST", "/api/email/send-report", {
        projectId: selectedProject.id,
        reportType,
        recipients: recipients.map(r => ({ email: r.email, name: r.name }))
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email Sent",
        description: `Report successfully sent to ${data.recipientCount} recipient(s)`,
      });
      onOpenChange(false);
      setRecipients([]);
      setEmailInput("");
      setReportType(initialReportType || "summary");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  const addRecipient = () => {
    const email = emailInput.trim().toLowerCase();
    
    if (!email) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Check if email already added
    if (recipients.some(r => r.email === email)) {
      toast({
        title: "Duplicate Email",
        description: "This email has already been added",
        variant: "destructive",
      });
      return;
    }

    // Try to find user name
    const user = users?.find(u => u.email?.toLowerCase() === email);
    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined;

    setRecipients([...recipients, { email, name }]);
    setEmailInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const addProjectStakeholders = () => {
    if (!selectedProject || !users) return;

    const stakeholders: Array<{ email: string; name?: string }> = [];
    
    // Add project manager
    const manager = users.find(u => u.id === selectedProject.managerId);
    if (manager?.email) {
      const name = `${manager.firstName || ''} ${manager.lastName || ''}`.trim();
      stakeholders.push({ email: manager.email, name });
    }

    // Add all users not already in recipients
    stakeholders.forEach(stakeholder => {
      if (!recipients.some(r => r.email === stakeholder.email)) {
        setRecipients(prev => [...prev, stakeholder]);
      }
    });

    toast({
      title: "Stakeholders Added",
      description: `Added ${stakeholders.length} stakeholder(s)`,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRecipient();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-email-report">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Project Report
          </DialogTitle>
          <DialogDescription>
            Send a project report to team members and stakeholders via email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type" data-testid="select-report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Project Summary</SelectItem>
                <SelectItem value="status">Status Report</SelectItem>
                <SelectItem value="gantt">Gantt Chart Data</SelectItem>
                <SelectItem value="kanban">Kanban Board Data</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-input">Recipients</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addProjectStakeholders}
                data-testid="button-add-stakeholders"
                className="h-7 text-xs"
              >
                Add Project Stakeholders
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                id="email-input"
                type="email"
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={handleKeyPress}
                data-testid="input-recipient-email"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addRecipient}
                data-testid="button-add-recipient"
              >
                Add
              </Button>
            </div>
          </div>

          {recipients.length > 0 && (
            <div className="space-y-2">
              <Label>Recipients ({recipients.length})</Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/50 max-h-32 overflow-y-auto">
                {recipients.map((recipient) => (
                  <Badge
                    key={recipient.email}
                    variant="secondary"
                    className="gap-1 pr-1"
                    data-testid={`recipient-${recipient.email}`}
                  >
                    <span className="text-xs">
                      {recipient.name ? `${recipient.name} (${recipient.email})` : recipient.email}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive/20"
                      onClick={() => removeRecipient(recipient.email)}
                      data-testid={`button-remove-${recipient.email}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {selectedProject && (
            <div className="p-3 rounded-md bg-primary/5 border">
              <p className="text-sm font-medium">Project: {selectedProject.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedProject.description || "No description"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-email"
          >
            Cancel
          </Button>
          <Button
            onClick={() => sendEmailMutation.mutate()}
            disabled={sendEmailMutation.isPending || recipients.length === 0 || !selectedProject}
            data-testid="button-send-email"
          >
            {sendEmailMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
