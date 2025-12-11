import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  user_id: string;
  notification_type: "payment_pending" | "new_comment" | "new_message";
  event_name: string;
  preview_text: string;
  action_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      user_id,
      notification_type,
      event_name,
      preview_text,
      action_url,
    }: NotificationEmailRequest = await req.json();

    // Get user profile with email and preferences
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("notification_preferences")
      .eq("id", user_id)
      .single();

    if (profileError) throw profileError;

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(user_id);
    if (userError) throw userError;

    const userEmail = userData.user.email;
    if (!userEmail) {
      throw new Error("User email not found");
    }

    // Check if user wants email notifications for this type
    const prefs = profile.notification_preferences;
    const emailFrequency = prefs?.email?.digest_frequency;
    
    if (emailFrequency === "never" || emailFrequency === "daily" || emailFrequency === "weekly") {
      console.log(`User has ${emailFrequency} email preference, skipping instant notification`);
      return new Response(
        JSON.stringify({ message: "User prefers digest emails" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if this notification type is enabled for email
    const typeMap = {
      payment_pending: "payments",
      new_message: "messages",
      new_comment: "comments",
    };
    
    const prefKey = typeMap[notification_type];
    if (!prefs?.email?.[prefKey]) {
      console.log(`User has disabled email for ${notification_type}`);
      return new Response(
        JSON.stringify({ message: "User disabled this notification type" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get email subject and content based on type
    const emailContent = getEmailContent(notification_type, event_name, preview_text, action_url);

    // Send email using Resend
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Events <notifications@yourdomain.com>", // Update with your verified domain
        to: [userEmail],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error("Resend API error:", error);
      throw new Error(`Resend API error: ${error}`);
    }

    const emailResult = await resendResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function getEmailContent(
  type: string,
  eventName: string,
  preview: string,
  actionUrl?: string
): { subject: string; html: string } {
  switch (type) {
    case "payment_pending":
      return {
        subject: `💰 New payment to verify for ${eventName}`,
        html: `
          <h2>Payment Verification Required</h2>
          <p>You have a new payment that needs verification for <strong>${eventName}</strong>.</p>
          <p>${preview}</p>
          ${actionUrl ? `<p><a href="${actionUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Verify Payment</a></p>` : ""}
          <p style="color: #666; font-size: 14px; margin-top: 24px;">Log in to your dashboard to manage this notification.</p>
        `,
      };
    case "new_message":
      return {
        subject: `✉️ New message from a guest for ${eventName}`,
        html: `
          <h2>New Guest Message</h2>
          <p>You received a message about <strong>${eventName}</strong>.</p>
          <p style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">${preview}</p>
          ${actionUrl ? `<p><a href="${actionUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Reply to Message</a></p>` : ""}
          <p style="color: #666; font-size: 14px; margin-top: 24px;">Log in to your dashboard to respond.</p>
        `,
      };
    case "new_comment":
      return {
        subject: `💬 New comment on ${eventName}`,
        html: `
          <h2>New Comment</h2>
          <p>Someone left a comment on <strong>${eventName}</strong>.</p>
          <p style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">${preview}</p>
          ${actionUrl ? `<p><a href="${actionUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">View & Reply</a></p>` : ""}
          <p style="color: #666; font-size: 14px; margin-top: 24px;">Log in to your dashboard to moderate and respond.</p>
        `,
      };
    default:
      return {
        subject: `New notification for ${eventName}`,
        html: `<p>You have a new notification for ${eventName}.</p><p>${preview}</p>`,
      };
  }
}

serve(handler);
