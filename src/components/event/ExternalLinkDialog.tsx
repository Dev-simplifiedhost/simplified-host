import { ExternalLink, Globe } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { extractDomain } from "@/lib/contentFilter";

interface ExternalLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  itemName: string;
}

export const ExternalLinkDialog = ({ open, onOpenChange, url, itemName }: ExternalLinkDialogProps) => {
  const handleContinue = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  const domain = extractDomain(url);
  const truncatedUrl = url.length > 60 ? url.substring(0, 60) + '...' : url;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            You are now leaving SimplifiedHost
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                You're about to visit an external website for "{itemName}".
              </p>
              {domain && (
                <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
                  <Globe className="h-3 w-3" />
                  {domain}
                </Badge>
              )}
              <div className="p-2 bg-muted rounded-md">
                <p className="text-xs break-all text-muted-foreground font-mono">
                  {truncatedUrl}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleContinue}>
            Continue to Site
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
