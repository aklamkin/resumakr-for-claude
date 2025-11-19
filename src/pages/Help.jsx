
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Send, Loader2, Mail, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { NotificationPopup } from "../components/ui/notification";

export default function Help() {
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ open: false, title: "", message: "", type: "success" });
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch FAQs
  const { data: faqs = [] } = useQuery({
    queryKey: ['faqs'],
    queryFn: async () => {
      const items = await base44.entities.FAQItem.filter({ is_published: true }, "order");
      return items;
    },
  });

  // Fetch Help Config
  const { data: helpConfig } = useQuery({
    queryKey: ['help-config'],
    queryFn: async () => {
      const configs = await base44.entities.HelpConfig.list();
      return configs.length > 0 ? configs[0] : {
        intro_text: "Welcome to our Help Center! Browse our FAQs below or contact us directly.",
        recipient_emails: [],
        sender_name: "Resumakr Support",
        contact_form_enabled: true
      };
    },
  });

  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.category || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {});

  const onSubmit = async (data) => {
    if (!helpConfig?.recipient_emails || helpConfig.recipient_emails.length === 0) {
      setNotification({
        open: true,
        title: "Configuration Error",
        message: "Contact form is not properly configured. Please contact an administrator.",
        type: "error"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Send email to all configured recipients
      const emailPromises = helpConfig.recipient_emails.map(email => 
        base44.integrations.Core.SendEmail({
          from_name: helpConfig.sender_name || "Resumakr Support",
          to: email,
          subject: `Help Request: ${data.subject}`,
          body: `
            <h2>New Help Request</h2>
            <p><strong>From:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <hr>
            <h3>Message:</h3>
            <p>${data.message.replace(/\n/g, '<br>')}</p>
          `
        })
      );

      await Promise.all(emailPromises);

      setNotification({
        open: true,
        title: "Message Sent!",
        message: "Thank you for contacting us. We'll get back to you as soon as possible.",
        type: "success"
      });
      
      reset();
    } catch (error) {
      console.error("Error sending help request:", error);
      setNotification({
        open: true,
        title: "Error",
        message: "Failed to send your message. Please try again later.",
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 rounded-2xl mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">Help Center</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {helpConfig?.intro_text || "Welcome to our Help Center! Browse our FAQs below or contact us directly."}
          </p>
        </motion.div>

        {/* FAQ Section */}
        {Object.keys(groupedFaqs).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <Card className="p-8 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Frequently Asked Questions</h2>
              </div>

              {Object.entries(groupedFaqs).map(([category, items]) => (
                <div key={category} className="mb-8 last:mb-0">
                  <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-400 mb-4">{category}</h3>
                  <Accordion type="single" collapsible className="w-full">
                    {items.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id} className="border-slate-200 dark:border-slate-700">
                        <AccordionTrigger className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </Card>
          </motion.div>
        )}

        {/* Contact Form */}
        {helpConfig?.contact_form_enabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-8 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <Mail className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contact Us</h2>
              </div>
              
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Can't find what you're looking for? Send us a message and we'll get back to you as soon as possible.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="text-slate-900 dark:text-slate-100">Name *</Label>
                    <Input
                      id="name"
                      {...register("name", { required: "Name is required" })}
                      placeholder="Your full name"
                      className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-slate-900 dark:text-slate-100">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email", { 
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address"
                        }
                      })}
                      placeholder="your.email@example.com"
                      className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject" className="text-slate-900 dark:text-slate-100">Subject *</Label>
                  <Input
                    id="subject"
                    {...register("subject", { required: "Subject is required" })}
                    placeholder="What is your question about?"
                    className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                  {errors.subject && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.subject.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="message" className="text-slate-900 dark:text-slate-100">Message *</Label>
                  <Textarea
                    id="message"
                    {...register("message", { 
                      required: "Message is required",
                      minLength: {
                        value: 10,
                        message: "Message must be at least 10 characters"
                      }
                    })}
                    placeholder="Tell us more about your question or issue..."
                    className="mt-1 min-h-32 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                  />
                  {errors.message && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        )}
      </div>

      <NotificationPopup
        open={notification.open}
        onClose={() => setNotification({ ...notification, open: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}
