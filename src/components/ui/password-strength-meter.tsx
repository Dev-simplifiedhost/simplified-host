import { Progress } from "@/components/ui/progress";
import { checkPasswordStrength } from "@/lib/passwordStrength";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
  showFeedback?: boolean;
}

export const PasswordStrengthMeter = ({ 
  password, 
  showFeedback = true 
}: PasswordStrengthMeterProps) => {
  if (!password) return null;

  const strength = checkPasswordStrength(password);
  const progressValue = (strength.score / 4) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Progress value={progressValue} className="h-2" />
        <span className={`text-sm font-medium ${strength.color}`}>
          {strength.label}
        </span>
      </div>
      
      {showFeedback && strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((tip, index) => (
            <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
              {strength.score >= 3 ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
              )}
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
