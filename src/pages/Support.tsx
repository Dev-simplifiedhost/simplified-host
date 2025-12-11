import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Helmet } from "react-helmet-async";
import { Send, CheckCircle2, HelpCircle, Copy, Mail, ArrowDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Analytics helper
const trackEvent = (eventName: string, data?: Record<string, unknown>) => {
  console.log(`[Analytics] ${eventName}`, data || {});
};

// Topic mapping from URL params
const topicParamMapping: Record<string, string> = {
  bug: "bug",
  payment: "general",
  feature: "feature",
  feedback: "feedback",
  general: "general"
};

// Dynamic hints based on topic
const topicHints: Record<string, string> = {
  bug: "Include what you were trying to do, what happened instead, and your event code if relevant.",
  feature: "Describe the scenario and the outcome you'd like to achieve.",
  general: "Tell us what you'd like help with.",
  feedback: "Share any thoughts or suggestions — we read every message."
};

// FAQs with 3-part structure
const faqs = [
  {
    id: "faq-share",
    question: "How do I share my event with guests?",
    answer: {
      why: "Guests need a direct link or event code to find and interact with your event.",
      steps: [
        "Go to your Event Center and tap the Share icon",
        "Copy the link or event code provided",
        "Send via text, email, or any messaging app",
        "Guests can also use the event code on the Find Event page"
      ],
      contact: "If guests report the link isn't working, contact Support with your event code."
    }
  },
  {
    id: "faq-rsvp",
    question: "My guests aren't receiving RSVP confirmations",
    answer: {
      why: "RSVP confirmations are sent via SMS only to guests who opted in during RSVP. Email confirmations are not currently supported.",
      steps: [
        "Confirm the guest entered a valid phone number",
        "Check that they opted into SMS notifications during RSVP",
        "Ask guests to check their SMS inbox (not email)",
        "Note: Some carriers may delay or filter messages"
      ],
      contact: "If a guest opted in but didn't receive anything, contact Support with their name and your event code."
    }
  },
  {
    id: "faq-payments",
    question: "How do payments and contributions work?",
    answer: {
      why: "SimplifiedHost uses Stripe Connect so guests can pay directly to your bank account. Manual payment options (Venmo, Zelle) are also supported.",
      steps: [
        "Enable contributions in your Event Settings",
        "Complete Stripe onboarding (60-90 seconds) for card payments",
        "Guests see payment options when viewing your event",
        "Card payments auto-verify; manual payments require your confirmation"
      ],
      contact: "If a payment isn't showing up or Stripe setup failed, contact Support."
    }
  },
  {
    id: "faq-collaborator",
    question: "Can I add a co-host or collaborator?",
    answer: {
      why: "Collaborators can help manage your event without needing your login credentials.",
      steps: [
        "Go to Event Settings → Collaborators section",
        "Enter their phone number and send an invite",
        "They'll receive a link to accept and join",
        "Free tier allows 1 collaborator per event"
      ],
      contact: "If invites aren't being received or the link expired, contact Support."
    }
  },
  {
    id: "faq-duplicate",
    question: "How do I duplicate or reuse an event?",
    answer: {
      why: "Currently, SimplifiedHost doesn't support event duplication. Each event must be created fresh.",
      steps: [
        "Use Plan with a Click to quickly generate a new event plan",
        "Copy text from your old event manually if needed",
        "Save your task lists for reference in future events"
      ],
      contact: "If you'd like to see this feature added, submit a Feature Request below."
    }
  },
  {
    id: "faq-pwa",
    question: "How do I install SimplifiedHost on my phone?",
    answer: {
      why: "SimplifiedHost can be added to your home screen for quick access, like a native app.",
      steps: [
        "On iPhone: Open in Safari → tap Share → Add to Home Screen",
        "On Android: Open in Chrome → tap ⋮ menu → Add to Home Screen",
        "Once installed, you'll have one-tap access and an app-like experience"
      ],
      contact: "If installation isn't working on your device, contact Support with your phone model and browser."
    }
  }
];

const Support = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [message, setMessage] = useState("");
  const [originComponent, setOriginComponent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string>("");

  // Pre-fill from user auth
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.user_metadata?.display_name) {
      setName(user.user_metadata.display_name);
    }
  }, [user]);

  // Handle URL params and auto-detection
  useEffect(() => {
    trackEvent("support_page_viewed");

    // Parse URL params
    const topicParam = searchParams.get("t");
    const eventCodeParam = searchParams.get("eventCode");
    const sourceParam = searchParams.get("s");

    if (topicParam && topicParamMapping[topicParam]) {
      setTopic(topicParamMapping[topicParam]);
      trackEvent("support_topic_selected", { value: topicParamMapping[topicParam], source: "url" });
    }

    if (eventCodeParam) {
      setEventCode(eventCodeParam.toUpperCase());
      trackEvent("support_event_code_autofilled", { autofilled: true, source: "url" });
    }

    if (sourceParam) {
      setOriginComponent(sourceParam);
    }

    // Auto-detect event from referrer if no eventCode param
    if (!eventCodeParam && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer, window.location.origin);
        const eventIdMatch = referrerUrl.pathname.match(/\/events\/([a-zA-Z0-9-]+)/);
        const eventIdParam = referrerUrl.searchParams.get("event");
        const eventId = eventIdMatch?.[1] || eventIdParam;

        if (eventId) {
          supabase
            .from("events")
            .select("event_code")
            .eq("id", eventId)
            .single()
            .then(({ data }) => {
              if (data?.event_code) {
                setEventCode(data.event_code);
                trackEvent("support_event_code_autofilled", { autofilled: true, source: "referrer" });
              }
            });
        }
      } catch {
        // Invalid referrer URL
      }
    }

    // Auto-scroll to form if topic pre-filled
    if (topicParam) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [searchParams]);

  // Track topic changes
  const handleTopicChange = (value: string) => {
    setTopic(value);
    trackEvent("support_topic_selected", { value });
  };

  // Track FAQ opens
  const handleFaqChange = (value: string) => {
    setExpandedFaq(value);
    if (value) {
      trackEvent("support_faq_opened", { faqId: value });
    }
  };

  // Scroll to FAQ and expand item
  const scrollToFaq = (faqId: string) => {
    setExpandedFaq(faqId);
    setTimeout(() => {
      const element = document.getElementById(faqId);
      element?.scrollIntoView({ behavior: "auto" });
    }, 50);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "auto" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(false);
    
    if (!name.trim() || !email.trim() || !topic || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: name.trim(),
          email: email.trim(),
          topic,
          eventCode: eventCode.trim() || undefined,
          message: message.trim(),
          originComponent: originComponent || undefined
        },
      });

      if (error) throw error;

      setSubmitted(true);
      trackEvent("support_form_submitted", { topic, originComponent: originComponent || "direct" });
      toast.success("Your message has been sent!");
    } catch (error) {
      console.error("Error sending support request:", error);
      setSubmissionError(true);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewRequest = () => {
    setSubmitted(false);
    setSubmissionError(false);
    setTopic("");
    setEventCode("");
    setMessage("");
  };

  const copyEmail = () => {
    navigator.clipboard.writeText("support@simplifiedhost.com");
    toast.success("Email address copied");
  };

  // Show event code field for general and bug topics only
  const showEventCode = topic === "general" || topic === "bug";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Support Center | SimplifiedHost</title>
        <meta name="description" content="Get help with SimplifiedHost. Find answers to common questions or contact our support team." />
      </Helmet>

      {/* Header - hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>

      <main className="flex-1 pb-24 md:pb-16">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 bg-background border-b pt-safe">
          <div className="h-14 flex items-center justify-center px-4">
            <h1 className="text-lg font-semibold">Support</h1>
          </div>
        </div>

        {/* Hero Section - Compact */}
        <section className="bg-muted/30 border-b">
          <div className="container mx-auto px-4 py-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-primary/10">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Support Center</h1>
            <p className="text-muted-foreground max-w-[65ch] mx-auto text-sm sm:text-base">
              Find answers, troubleshoot issues, or contact our team.
            </p>
            
            {/* Anchor Navigation */}
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => scrollToSection("quick-answers")}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Quick Answers <ArrowDown className="h-3 w-3" />
              </button>
              <button
                onClick={() => scrollToSection("contact-support")}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Contact Support <ArrowDown className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-6 max-w-3xl">
          {/* FAQ Section */}
          <section id="quick-answers" className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Quick Answers</h2>
            <Accordion 
              type="single" 
              collapsible 
              className="w-full space-y-2"
              value={expandedFaq}
              onValueChange={handleFaqChange}
            >
              {faqs.map((faq) => (
                <AccordionItem 
                  key={faq.id} 
                  id={faq.id}
                  value={faq.id}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="text-left font-medium text-sm sm:text-base py-3">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm pb-4 space-y-3">
                    <div>
                      <p className="font-medium text-foreground mb-1">Why this happens</p>
                      <p className="max-w-[65ch]">{faq.answer.why}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">What to check</p>
                      <ul className="list-disc list-inside space-y-1 max-w-[65ch]">
                        {faq.answer.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {faq.answer.contact}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Contact Form Section */}
          <section ref={formRef}>
            <h2 id="contact-support" className="text-lg font-semibold mb-2">Contact Support</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Request a feature, report an issue, or ask a question — we read every message.
            </p>
            
            {submitted ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Thanks — your message has been sent.</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-[65ch] mx-auto">
                    We'll email you soon.
                  </p>
                  
                  {/* Helpful FAQ Links */}
                  <div className="border-t pt-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-3">While you wait, you might find these helpful:</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => scrollToFaq("faq-share")}
                        className="text-sm text-primary hover:underline"
                      >
                        How do guests RSVP?
                      </button>
                      <button
                        onClick={() => scrollToFaq("faq-duplicate")}
                        className="text-sm text-primary hover:underline"
                      >
                        Why can't I duplicate my event?
                      </button>
                      <button
                        onClick={() => scrollToFaq("faq-payments")}
                        className="text-sm text-primary hover:underline"
                      >
                        How do payments work?
                      </button>
                    </div>
                  </div>

                  <Button variant="outline" onClick={handleNewRequest} className="h-12">
                    Send Another Message
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-12"
                        />
                        {!user && (
                          <p className="text-xs text-muted-foreground">We'll reply to this email address.</p>
                        )}
                      </div>
                    </div>

                    <div className={`grid gap-4 ${showEventCode ? 'sm:grid-cols-2' : ''}`}>
                      <div className="space-y-2">
                        <Label htmlFor="topic">Topic *</Label>
                        <Select value={topic} onValueChange={handleTopicChange} required>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General support</SelectItem>
                            <SelectItem value="bug">Bug / something isn't working</SelectItem>
                            <SelectItem value="feature">Feature request</SelectItem>
                            <SelectItem value="feedback">Feedback on SimplifiedHost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {showEventCode && (
                        <div className="space-y-2">
                          <Label htmlFor="eventCode">Event Code (optional)</Label>
                          <Input
                            id="eventCode"
                            placeholder="e.g., ABC123"
                            value={eventCode}
                            onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                            maxLength={10}
                            className="h-12 uppercase"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      {topic && topicHints[topic] && (
                        <p className="text-xs text-muted-foreground">{topicHints[topic]}</p>
                      )}
                      <Textarea
                        id="message"
                        placeholder="Tell us how we can help..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        rows={5}
                        className="resize-none"
                      />
                    </div>

                    {submissionError && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <p className="text-sm text-destructive font-medium mb-2">
                          Something went wrong sending your message.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span>You can also email us at</span>
                          <a href="mailto:support@simplifiedhost.com" className="text-primary hover:underline">
                            support@simplifiedhost.com
                          </a>
                          <button
                            type="button"
                            onClick={copyEmail}
                            className="p-1 hover:bg-muted rounded"
                            title="Copy email address"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-12" 
                      disabled={isSubmitting || !topic}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {isSubmitting ? "Sending..." : "Send to Support"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>

      {/* Footer - hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default Support;
