import { z } from 'zod';
import { OTP_PURPOSES } from '../config/constants.js';

// Empty body schema — /auth/sync only requires the Bearer token (validated by middleware).
export const syncBodySchema = z.object({}).strict();
export type SyncBody = z.infer<typeof syncBodySchema>;

export const otpSendBodySchema = z
  .object({
    email: z.string().email().max(254),
    purpose: z.enum(OTP_PURPOSES),
  })
  .strict();
export type OtpSendBody = z.infer<typeof otpSendBodySchema>;

export const otpVerifyBodySchema = z
  .object({
    email: z.string().email().max(254),
    code: z
      .string()
      .trim()
      .regex(/^\d{4,8}$/u, 'Code must be 4-8 digits'),
    purpose: z.enum(OTP_PURPOSES),
  })
  .strict();
export type OtpVerifyBody = z.infer<typeof otpVerifyBodySchema>;
