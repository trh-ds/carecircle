import { z } from 'zod';

export const CreateCircleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  tenant_timezone: z.string().min(1, 'Timezone is required').max(50),
});

export const UpdateCircleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  tenant_timezone: z.string().min(1).max(50).optional(),
}).refine((data) => data.name !== undefined || data.tenant_timezone !== undefined, {
  message: 'At least one field (name or tenant_timezone) must be provided',
});

export const AddMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['coordinator', 'recipient', 'caregiver', 'professional_viewer'], {
    message: 'Role must be one of: coordinator, recipient, caregiver, professional_viewer',
  }),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['coordinator', 'recipient', 'caregiver', 'professional_viewer'], {
    message: 'Role must be one of: coordinator, recipient, caregiver, professional_viewer',
  }),
});

export type CreateCircleInput = z.infer<typeof CreateCircleSchema>;
export type UpdateCircleInput = z.infer<typeof UpdateCircleSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
