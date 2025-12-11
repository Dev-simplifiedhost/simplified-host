/**
 * Password strength checker
 * Returns score 0-4 and feedback
 */

export interface PasswordStrength {
  score: number; // 0 (weak) to 4 (very strong)
  feedback: string[];
  color: string;
  label: string;
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  // Minimum length check
  if (password.length < 8) {
    feedback.push("Use at least 8 characters");
    return {
      score: 0,
      feedback,
      color: "text-destructive",
      label: "Too short"
    };
  }

  // Length bonuses
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length;
  
  if (varietyCount >= 2) score += 1;
  if (varietyCount >= 3) score += 1;

  // Feedback based on score
  if (score <= 1) {
    feedback.push("Try a longer passphrase");
    feedback.push("Example: summer-lake-picnic-2024");
    return {
      score: 1,
      feedback,
      color: "text-destructive",
      label: "Weak"
    };
  }

  if (score === 2) {
    feedback.push("Good start! Add more characters for better security");
    return {
      score: 2,
      feedback,
      color: "text-orange-500",
      label: "Fair"
    };
  }

  if (score === 3) {
    feedback.push("Strong password!");
    return {
      score: 3,
      feedback,
      color: "text-blue-500",
      label: "Good"
    };
  }

  feedback.push("Excellent password!");
  return {
    score: 4,
    feedback,
    color: "text-green-500",
    label: "Strong"
  };
};

/**
 * Calculate progressive delay based on failed attempts
 */
export const calculateLoginDelay = (failedAttempts: number): number => {
  if (failedAttempts <= 3) return 0;
  if (failedAttempts === 4) return 10; // 10 seconds
  if (failedAttempts === 5) return 30; // 30 seconds
  if (failedAttempts === 6) return 60; // 1 minute
  return 120; // 2 minutes for 7+ attempts
};

/**
 * Format delay time for user display
 */
export const formatDelayTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
};
