import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportEmailRequest {
  name: string;
  email: string;
  topic: string;
  eventCode?: string;
  message: string;
  originComponent?: string;
}

const topicLabels: Record<string, string> = {
  general: "General Support",
  bug: "Bug / Issue Report",
  feature: "Feature Request",
  feedback: "Feedback",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
    if (!SENDGRID_API_KEY) {
      console.error("SENDGRID_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email, topic, eventCode, message, originComponent }: SupportEmailRequest = await req.json();

    // Validate required fields
    if (!name || !email || !topic || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicLabel = topicLabels[topic] || topic;
    const timestamp = new Date().toISOString();

    // Build email HTML
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #142E26; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">SimplifiedHost Support</h1>
        </div>
        
        <div style="padding: 24px; background: #ffffff;">
          <h2 style="color: #142E26; margin-top: 0;">New Support Request</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;"><strong>From:</strong></td>
              <td style="padding: 8px 0;">${name} (${email})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Topic:</strong></td>
              <td style="padding: 8px 0;">${topicLabel}</td>
            </tr>
            ${eventCode ? `
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Event Code:</strong></td>
              <td style="padding: 8px 0;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px;">${eventCode}</code></td>
            </tr>
            ` : ''}
            ${originComponent ? `
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Source:</strong></td>
              <td style="padding: 8px 0;">${originComponent}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Submitted:</strong></td>
              <td style="padding: 8px 0;">${new Date(timestamp).toLocaleString()}</td>
            </tr>
          </table>
          
          <div style="margin-top: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #333;">Message</h3>
            <p style="color: #333; white-space: pre-wrap; margin-bottom: 0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
        </div>
        
        <div style="padding: 16px; background: #f5f5f5; text-align: center; color: #666; font-size: 12px;">
          <p style="margin: 0;">Reply directly to this email to respond to ${name}.</p>
        </div>
      </div>
    `;

    // Send email via SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: "support@simplifiedhost.com" }],
          },
        ],
        from: {
          email: "noreply@simplifiedhost.com",
          name: "SimplifiedHost Support",
        },
        reply_to: {
          email: email,
          name: name,
        },
        subject: `[${topicLabel}] Support Request from ${name}`,
        content: [
          {
            type: "text/html",
            value: htmlContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Support email sent successfully:", {
      from: email,
      topic: topicLabel,
      eventCode: eventCode || "N/A",
      timestamp,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-support-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
