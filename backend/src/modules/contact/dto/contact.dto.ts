import { z } from 'zod';

const headerValue = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^[^\r\n]+$/u, `${label} must not contain newlines`);

export const ContactSchema = z
  .object({
    name: headerValue('Name').min(2, 'Tên quá ngắn').max(100, 'Tên quá dài'),
    email: headerValue('Email').email('Email không hợp lệ').max(254, 'Email quá dài'),
    phone: z
      .string()
      .trim()
      .max(20, 'Số điện thoại quá dài')
      .regex(/^[^\r\n]*$/u, 'Phone must not contain newlines')
      .optional(),
    subject: headerValue('Subject').min(5, 'Tiêu đề quá ngắn').max(150, 'Tiêu đề quá dài'),
    message: z.string().min(20, 'Nội dung quá ngắn').max(5000, 'Nội dung quá dài'),
  })
  .strict();

export type ContactDto = z.infer<typeof ContactSchema>;
