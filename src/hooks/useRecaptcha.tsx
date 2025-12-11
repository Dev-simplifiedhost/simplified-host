import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRecaptcha = () => {
  let executeRecaptcha = null;
  
  try {
    const recaptcha = useGoogleReCaptcha();
    executeRecaptcha = recaptcha.executeRecaptcha;
  } catch (error) {
    // reCAPTCHA context not available - gracefully degrade
    console.warn('reCAPTCHA not configured, security verification disabled');
  }

  const verifyRecaptcha = async (action: string): Promise<boolean> => {
    if (!executeRecaptcha) {
      console.warn('reCAPTCHA not initialized, allowing request through');
      return true; // Allow through if reCAPTCHA isn't configured (graceful degradation)
    }

    try {
      // Get the reCAPTCHA token
      const token = await executeRecaptcha(action);

      // Verify the token with our edge function
      const { data, error } = await supabase.functions.invoke('verify-recaptcha', {
        body: { token, action },
      });

      if (error) {
        console.error('reCAPTCHA verification error:', error);
        toast.error('Security verification failed. Please try again.');
        return false;
      }

      if (!data?.success) {
        console.warn('reCAPTCHA verification failed:', data);
        if (data?.score !== undefined && data.score < 0.5) {
          toast.error('Suspicious activity detected. Please try again later.');
        } else {
          toast.error('Security verification failed. Please try again.');
        }
        return false;
      }

      console.log('reCAPTCHA verification successful:', data);
      return true;
    } catch (error) {
      console.error('Error during reCAPTCHA verification:', error);
      // Gracefully degrade on error
      console.warn('reCAPTCHA error, allowing request through');
      return true;
    }
  };

  return { verifyRecaptcha };
};
