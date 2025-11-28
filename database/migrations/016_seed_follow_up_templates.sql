-- Migration: 016_seed_follow_up_templates
-- Description: Seed initial follow-up message templates
-- Date: 2025-11-28

-- Insert pre-written follow-up templates
INSERT INTO follow_up_templates (name, description, message_template, category, sort_order) VALUES

-- General Check-in
('Friendly Check-In',
 'A warm, casual check-in to maintain the relationship',
 'Hi {client_name},

I hope you''re doing well! I wanted to check in and see how things are going on your end.

Is there anything I can help with or any projects you''re planning that I should know about?

Looking forward to hearing from you!',
 'general_checkin',
 1),

-- Project Update Request
('Project Status Update',
 'Request an update on ongoing project progress',
 'Hi {client_name},

I wanted to touch base regarding {project_name}. Could you provide a quick update on where things stand on your end?

I want to make sure we''re aligned and that I can support you with the next steps.

Let me know if you have any questions!',
 'project_update',
 2),

-- Payment Reminder (Professional)
('Professional Payment Reminder',
 'A courteous reminder about outstanding payment',
 'Hi {client_name},

I hope this message finds you well. I wanted to follow up on invoice #{invoice_number} that was sent on {invoice_date}.

If you''ve already processed the payment, please disregard this message. Otherwise, could you let me know if there are any questions or concerns I can address?

Thank you for your attention to this matter.',
 'payment_reminder',
 3),

-- Proposal Follow-Up
('Proposal Follow-Up',
 'Check in after sending a project proposal',
 'Hi {client_name},

I wanted to follow up on the proposal I sent over for {project_name}. Have you had a chance to review it?

I''m happy to hop on a quick call to discuss any questions or adjustments you might need.

Looking forward to your thoughts!',
 'proposal_followup',
 4),

-- Re-engagement (Long Time)
('Re-Engage After Silence',
 'Reconnect with a client you haven''t heard from in a while',
 'Hi {client_name},

It''s been a while since we last connected, and I wanted to reach out to see how things are going with you.

I''d love to catch up and hear about any new projects or initiatives you''re working on. If there''s anything I can support you with, please don''t hesitate to let me know.

Hope to hear from you soon!',
 'reengagement',
 5),

-- Project Completion Check
('Post-Project Check-In',
 'Follow up after completing a project',
 'Hi {client_name},

Now that we''ve wrapped up {project_name}, I wanted to check in and see how everything is working out for you.

Do you have any feedback or additional needs I should be aware of? I''m here to help with any adjustments or future projects.

Thanks again for the opportunity to work together!',
 'general_checkin',
 6),

-- Quick Status Request
('Quick Status Request',
 'Brief message requesting a status update',
 'Hi {client_name},

Just wanted to quickly check in on {project_name}. Could you let me know the current status when you have a moment?

This will help me plan my next steps and ensure we stay on track.

Thanks!',
 'project_update',
 7);
