import { Resend } from 'resend';
import type { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { recordSend } from '../models/emailLog.model.js';
import type { EmailTemplate } from '../config/constants.js';
import * as templates from './emailTemplates.service.js';

interface SendArgs {
  to: string;
  template: EmailTemplate;
  subject: string;
  html: string;
  text: string;
  relatedUserId?: ObjectId | null;
  relatedRoleRequestId?: ObjectId | null;
}

// Cached singleton — the SDK is cheap to construct but lazy is friendlier
// when RESEND_API_KEY is missing (tests, CI, fresh boots).
let cachedClient: Resend | null = null;
function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

/**
 * Lowest-level send. Always writes an `email_log` row regardless of outcome
 * so the audit feed has a complete record. When RESEND_API_KEY is missing
 * the call is logged as `queued` with a clear errorMessage — useful for
 * local dev without provider configured.
 */
export async function sendEmail(args: SendArgs): Promise<void> {
  const client = getClient();
  if (!client) {
    await recordSend({
      to: args.to,
      template: args.template,
      subject: args.subject,
      providerMessageId: null,
      status: 'queued',
      errorMessage: 'RESEND_API_KEY not configured — email skipped',
      relatedUserId: args.relatedUserId ?? null,
      relatedRoleRequestId: args.relatedRoleRequestId ?? null,
      sentAt: new Date(),
    });
    logger.warn(
      { template: args.template, to: args.to },
      'Email skipped: RESEND_API_KEY missing',
    );
    return;
  }

  try {
    const result = await client.emails.send({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      ...(env.EMAIL_REPLY_TO ? { replyTo: env.EMAIL_REPLY_TO } : {}),
    });
    if (result.error) {
      await recordSend({
        to: args.to,
        template: args.template,
        subject: args.subject,
        providerMessageId: null,
        status: 'failed',
        errorMessage: result.error.message ?? 'Resend returned an error',
        relatedUserId: args.relatedUserId ?? null,
        relatedRoleRequestId: args.relatedRoleRequestId ?? null,
        sentAt: new Date(),
      });
      logger.error({ error: result.error }, 'Resend send failed');
      return;
    }
    await recordSend({
      to: args.to,
      template: args.template,
      subject: args.subject,
      providerMessageId: result.data?.id ?? null,
      status: 'sent',
      errorMessage: null,
      relatedUserId: args.relatedUserId ?? null,
      relatedRoleRequestId: args.relatedRoleRequestId ?? null,
      sentAt: new Date(),
    });
  } catch (err) {
    await recordSend({
      to: args.to,
      template: args.template,
      subject: args.subject,
      providerMessageId: null,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : String(err),
      relatedUserId: args.relatedUserId ?? null,
      relatedRoleRequestId: args.relatedRoleRequestId ?? null,
      sentAt: new Date(),
    });
    logger.error({ err }, 'Email send threw');
  }
}

// ── Public template-keyed helpers ───────────────────────────────────────────

export async function sendOtpEmail(args: {
  to: string;
  code: string;
  expiresInMinutes: number;
}): Promise<void> {
  const { subject, html, text } = templates.otpEmail(args);
  await sendEmail({ to: args.to, template: 'otp', subject, html, text });
}

export async function sendRoleApprovedEmail(args: {
  to: string;
  displayName: string;
  toRole: string;
  relatedUserId: ObjectId;
  relatedRoleRequestId: ObjectId;
}): Promise<void> {
  const { subject, html, text } = templates.roleApprovedEmail(args);
  await sendEmail({
    to: args.to,
    template: 'role-approved',
    subject,
    html,
    text,
    relatedUserId: args.relatedUserId,
    relatedRoleRequestId: args.relatedRoleRequestId,
  });
}

export async function sendRoleRejectedEmail(args: {
  to: string;
  displayName: string;
  toRole: string;
  reason: string;
  relatedUserId: ObjectId;
  relatedRoleRequestId: ObjectId;
}): Promise<void> {
  const { subject, html, text } = templates.roleRejectedEmail(args);
  await sendEmail({
    to: args.to,
    template: 'role-rejected',
    subject,
    html,
    text,
    relatedUserId: args.relatedUserId,
    relatedRoleRequestId: args.relatedRoleRequestId,
  });
}

export async function sendRoleChangedEmail(args: {
  to: string;
  displayName: string;
  fromRole: string;
  toRole: string;
  changedBy: string;
  relatedUserId: ObjectId;
}): Promise<void> {
  const { subject, html, text } = templates.roleChangedEmail(args);
  await sendEmail({
    to: args.to,
    template: 'role-changed',
    subject,
    html,
    text,
    relatedUserId: args.relatedUserId,
  });
}

export async function sendAccountSuspendedEmail(args: {
  to: string;
  displayName: string;
  relatedUserId: ObjectId;
}): Promise<void> {
  const { subject, html, text } = templates.accountSuspendedEmail(args);
  await sendEmail({
    to: args.to,
    template: 'account-suspended',
    subject,
    html,
    text,
    relatedUserId: args.relatedUserId,
  });
}

export async function sendAccountRestoredEmail(args: {
  to: string;
  displayName: string;
  relatedUserId: ObjectId;
}): Promise<void> {
  const { subject, html, text } = templates.accountRestoredEmail(args);
  await sendEmail({
    to: args.to,
    template: 'account-restored',
    subject,
    html,
    text,
    relatedUserId: args.relatedUserId,
  });
}
