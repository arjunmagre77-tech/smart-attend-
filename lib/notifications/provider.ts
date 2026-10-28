// lib/notifications/provider.ts
// Abstract notification provider interface

export interface NotificationPayload {
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  checkInTime: string;
  checkInDate: string;
  channel: "whatsapp" | "sms" | "email" | "simulator";
  isDemo?: boolean;
}

export interface NotificationResult {
  success: boolean;
  providerResponseId?: string;
  errorDetails?: string;
  channel: string;
}

/**
 * Build the standard attendance notification message
 */
export function buildNotificationMessage(payload: NotificationPayload): string {
  const prefix = payload.isDemo ? "[DEMO] " : "";
  return `${prefix}Attendance Update: Your child ${payload.studentName} checked in at ${payload.checkInTime} on ${payload.checkInDate}.`;
}

/**
 * Send a notification via the appropriate channel.
 * All channel-specific secrets are read from environment variables server-side.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const message = buildNotificationMessage(payload);

  switch (payload.channel) {
    case "simulator":
      return sendSimulated(payload, message);
    case "whatsapp":
      return sendWhatsApp(payload, message);
    case "sms":
      return sendSms(payload, message);
    case "email":
      return sendEmail(payload, message);
    default:
      return {
        success: false,
        errorDetails: `Unknown notification channel: ${payload.channel}`,
        channel: payload.channel,
      };
  }
}

// ──────────────────────────────────────────────
// Simulator (development only)
// ──────────────────────────────────────────────
async function sendSimulated(
  payload: NotificationPayload,
  message: string
): Promise<NotificationResult> {
  // Simulate a short network delay
  await new Promise((r) => setTimeout(r, Math.random() * 200 + 100));

  console.log(`[SIMULATOR] Notification to ${payload.parentName} (${payload.parentPhone}):`);
  console.log(`  Message: ${message}`);

  return {
    success: true,
    providerResponseId: `SIM_${Date.now()}`,
    channel: "simulator",
  };
}

// ──────────────────────────────────────────────
// WhatsApp Business Platform
// ──────────────────────────────────────────────
async function sendWhatsApp(
  payload: NotificationPayload,
  message: string
): Promise<NotificationResult> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      success: false,
      errorDetails: "WhatsApp credentials not configured. Set WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
      channel: "whatsapp",
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: payload.parentPhone.replace(/\D/g, ""),
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        errorDetails: JSON.stringify(data),
        channel: "whatsapp",
      };
    }

    return {
      success: true,
      providerResponseId: data.messages?.[0]?.id,
      channel: "whatsapp",
    };
  } catch (err) {
    return {
      success: false,
      errorDetails: err instanceof Error ? err.message : "Unknown error",
      channel: "whatsapp",
    };
  }
}

// ──────────────────────────────────────────────
// SMS (Twilio placeholder)
// ──────────────────────────────────────────────
async function sendSms(
  payload: NotificationPayload,
  message: string
): Promise<NotificationResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      errorDetails: "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.",
      channel: "sms",
    };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: payload.parentPhone,
          Body: message,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return { success: false, errorDetails: data.message, channel: "sms" };
    }

    return { success: true, providerResponseId: data.sid, channel: "sms" };
  } catch (err) {
    return {
      success: false,
      errorDetails: err instanceof Error ? err.message : "Unknown error",
      channel: "sms",
    };
  }
}

// ──────────────────────────────────────────────
// Email (placeholder — integrate SendGrid / Resend)
// ──────────────────────────────────────────────
async function sendEmail(
  payload: NotificationPayload,
  message: string
): Promise<NotificationResult> {
  const apiKey = process.env.EMAIL_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS;

  if (!apiKey || !fromEmail) {
    return {
      success: false,
      errorDetails: "Email credentials not configured. Set EMAIL_API_KEY and EMAIL_FROM_ADDRESS.",
      channel: "email",
    };
  }

  // Placeholder — integrate SendGrid, Resend, or similar
  return {
    success: false,
    errorDetails: "Email provider integration pending. Implement in lib/notifications/provider.ts.",
    channel: "email",
  };
}
