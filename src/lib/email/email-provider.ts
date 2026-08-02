export type SendAdminNotificationEmailParams = {
  toEmail: string;
  businessName: string;
  categoryLabel: string;
  contactName: string;
  createdAt: string;
  adminUrl: string;
};

export type SendEmailResult = { status: "sent" | "failed" | "skipped"; error?: string };

/** Swappable email transport — the registration flow depends only on this interface, never on a concrete provider. */
export type EmailProviderAdapter = {
  sendAdminNotificationEmail(params: SendAdminNotificationEmailParams): Promise<SendEmailResult>;
};
