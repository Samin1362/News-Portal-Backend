/**
 * Plain-HTML transactional templates with text fallbacks. Designers can
 * later swap these for `react-email` components — the public shape
 * `{ subject, html, text }` stays the same so `email.service.ts` is
 * unaffected.
 */

interface Out {
  subject: string;
  html: string;
  text: string;
}

const COLORS = {
  ink: '#1a1a1a',
  paper: '#ffffff',
  paper2: '#f4f4f3',
  muted: '#8a8378',
  accent: '#c8321b',
  accent2: '#2d6b3f',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(opts: { preheader: string; bodyHtml: string }): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deligo News</title>
<style>body{margin:0;padding:0;background:${COLORS.paper2};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${COLORS.ink};}</style>
</head><body>
<div style="display:none;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.paper2};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:${COLORS.paper};border:1.5px solid ${COLORS.ink};border-radius:3px;">
      <tr><td style="padding:24px 28px 16px 28px;border-bottom:1.5px solid ${COLORS.ink};">
        <div style="font-family:Georgia,'Source Serif 4',serif;font-size:22px;font-weight:800;letter-spacing:-0.01em;">
          Deligo<span style="color:${COLORS.accent};">·</span>News
        </div>
      </td></tr>
      <tr><td style="padding:24px 28px;font-size:15px;line-height:1.55;">${opts.bodyHtml}</td></tr>
      <tr><td style="padding:16px 28px 22px 28px;border-top:1.5px solid ${COLORS.paper2};font-size:12px;color:${COLORS.muted};">
        This is a transactional message from Deligo News. You're receiving it because of an action on your account.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function button(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${COLORS.accent};color:${COLORS.paper};text-decoration:none;font-weight:600;padding:10px 18px;border-radius:4px;">${escapeHtml(label)}</a>`;
}

export function otpEmail(args: {
  code: string;
  expiresInMinutes: number;
}): Out {
  const subject = 'Your Deligo verification code';
  const body = `
    <p style="margin:0 0 12px 0;">Use this code to verify your email:</p>
    <p style="margin:18px 0;font-size:30px;letter-spacing:6px;font-weight:700;color:${COLORS.ink};font-family:Menlo,monospace;">${escapeHtml(args.code)}</p>
    <p style="margin:0 0 6px 0;color:${COLORS.muted};">It expires in ${args.expiresInMinutes} minutes.</p>
    <p style="margin:18px 0 0 0;color:${COLORS.muted};font-size:13px;">Didn't request this code? You can safely ignore this email.</p>
  `;
  return {
    subject,
    html: shell({ preheader: `Code: ${args.code}`, bodyHtml: body }),
    text: `Your Deligo verification code: ${args.code}\nThis code expires in ${args.expiresInMinutes} minutes.`,
  };
}

export function roleApprovedEmail(args: {
  displayName: string;
  toRole: string;
}): Out {
  const subject = `You're now a ${args.toRole} at Deligo`;
  const body = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.displayName)},</p>
    <p style="margin:0 0 12px 0;">Your application was approved — welcome to the Deligo <strong>${escapeHtml(args.toRole)}</strong> desk.</p>
    <p style="margin:0 0 18px 0;">Sign in again to access your new dashboard. Existing tabs keep the old role until you sign out and back in.</p>
    <p style="margin:18px 0;">${button('Open your dashboard', 'https://deligo.news/dashboard')}</p>
    <p style="margin:18px 0 0 0;color:${COLORS.muted};font-size:13px;">A reminder: please review the Deligo code of conduct before publishing your first piece.</p>
  `;
  return {
    subject,
    html: shell({
      preheader: `Welcome to the Deligo ${args.toRole} desk.`,
      bodyHtml: body,
    }),
    text: `Hi ${args.displayName},\n\nYour application was approved — welcome to the Deligo ${args.toRole} desk. Sign in again to access your new dashboard.\n\nhttps://deligo.news/dashboard`,
  };
}

export function roleRejectedEmail(args: {
  displayName: string;
  toRole: string;
  reason: string;
}): Out {
  const subject = `Update on your ${args.toRole} application`;
  const body = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.displayName)},</p>
    <p style="margin:0 0 12px 0;">Thank you for applying to become a ${escapeHtml(args.toRole)} at Deligo. We're unable to approve your request at this time.</p>
    <p style="margin:0 0 6px 0;font-weight:600;">Reviewer note:</p>
    <blockquote style="margin:0 0 16px 0;padding:12px 14px;border-left:3px solid ${COLORS.accent};background:${COLORS.paper2};white-space:pre-wrap;">${escapeHtml(args.reason)}</blockquote>
    <p style="margin:0 0 0 0;color:${COLORS.muted};font-size:13px;">You can reapply after 30 days. We hope you'll keep reading and contributing in the comments in the meantime.</p>
  `;
  return {
    subject,
    html: shell({
      preheader: 'We have an update on your application.',
      bodyHtml: body,
    }),
    text: `Hi ${args.displayName},\n\nWe're unable to approve your ${args.toRole} application at this time.\n\nReviewer note:\n${args.reason}\n\nYou can reapply after 30 days.`,
  };
}

export function roleChangedEmail(args: {
  displayName: string;
  fromRole: string;
  toRole: string;
  changedBy: string;
}): Out {
  const subject = 'Your Deligo role has changed';
  const body = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.displayName)},</p>
    <p style="margin:0 0 12px 0;">An administrator (${escapeHtml(args.changedBy)}) updated your role on Deligo:</p>
    <p style="margin:16px 0;font-size:16px;"><strong>${escapeHtml(args.fromRole)}</strong> → <strong style="color:${COLORS.accent};">${escapeHtml(args.toRole)}</strong></p>
    <p style="margin:0 0 0 0;color:${COLORS.muted};font-size:13px;">If this was unexpected, contact editors@deligo.news right away.</p>
  `;
  return {
    subject,
    html: shell({
      preheader: `You're now a ${args.toRole}.`,
      bodyHtml: body,
    }),
    text: `Hi ${args.displayName},\n\nAn administrator (${args.changedBy}) updated your role: ${args.fromRole} → ${args.toRole}.\n\nIf this was unexpected, contact editors@deligo.news right away.`,
  };
}

export function accountSuspendedEmail(args: {
  displayName: string;
}): Out {
  const subject = 'Your Deligo account is suspended';
  const body = `
    <p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.displayName)},</p>
    <p style="margin:0 0 12px 0;">Your Deligo account has been suspended. You won't be able to sign in or post while this is in effect.</p>
    <p style="margin:0 0 0 0;color:${COLORS.muted};font-size:13px;">To appeal this decision, reply to this email or write to editors@deligo.news.</p>
  `;
  return {
    subject,
    html: shell({ preheader: 'Account suspended.', bodyHtml: body }),
    text: `Hi ${args.displayName},\n\nYour Deligo account has been suspended. You won't be able to sign in or post while this is in effect.\n\nTo appeal, write to editors@deligo.news.`,
  };
}

export function accountRestoredEmail(args: {
  displayName: string;
}): Out {
  const subject = 'Your Deligo account is active again';
  const body = `
    <p style="margin:0 0 12px 0;">Welcome back, ${escapeHtml(args.displayName)}.</p>
    <p style="margin:0 0 18px 0;">Your account has been restored — you can sign in and resume where you left off.</p>
    <p style="margin:18px 0;">${button('Open dashboard', 'https://deligo.news/dashboard')}</p>
  `;
  return {
    subject,
    html: shell({ preheader: 'Account restored.', bodyHtml: body }),
    text: `Welcome back, ${args.displayName}.\n\nYour Deligo account has been restored — you can sign in and resume where you left off.\nhttps://deligo.news/dashboard`,
  };
}
