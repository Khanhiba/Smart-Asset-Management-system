import { z } from 'zod';

export const assetInput = z.object({
  assetTag: z.string().trim().toUpperCase().regex(/^AST-[A-Z0-9-]{3,}$/, 'Use an asset tag such as AST-IT-001.'),
  name: z.string().trim().min(2).max(120), category: z.string().trim().min(2).max(60),
  manufacturer: z.string().trim().max(80).optional().or(z.literal('')), model: z.string().trim().max(80).optional().or(z.literal('')),
  serialNumber: z.string().trim().max(100).optional().or(z.literal('')), location: z.string().trim().min(2).max(100),
  department: z.string().trim().max(80).optional(), condition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  status: z.enum(['available', 'assigned', 'maintenance', 'retired', 'lost']).optional(), purchaseDate: z.coerce.date().optional().nullable(),
  purchaseCost: z.coerce.number().min(0).optional().nullable(), warrantyExpiry: z.coerce.date().optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal('')), notes: z.string().max(1000).optional().or(z.literal('')),
  maintenanceIntervalDays: z.coerce.number().int().min(1).max(3650).optional(), lastMaintenanceDate: z.coerce.date().optional().nullable(),
});

export const assignmentInput = z.object({
  assigneeName: z.string().trim().min(2).max(100), assigneeEmail: z.string().email().optional().or(z.literal('')),
  assigneeDepartment: z.string().trim().max(80).optional().or(z.literal('')), dueDate: z.coerce.date(),
  conditionOut: z.enum(['excellent', 'good', 'fair', 'poor']).optional(), checkoutNotes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const returnInput = z.object({ conditionIn: z.enum(['excellent', 'good', 'fair', 'poor']), returnNotes: z.string().trim().max(500).optional().or(z.literal('')) });
export const maintenanceInput = z.object({
  assetId: z.string().min(1), title: z.string().trim().min(3).max(160), type: z.enum(['preventive', 'repair', 'inspection', 'calibration']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(), dueDate: z.coerce.date(), assignedTo: z.string().optional().nullable(), notes: z.string().trim().max(1200).optional().or(z.literal('')),
});
export const maintenanceResolution = z.object({ status: z.enum(['in_progress', 'resolved']), cost: z.coerce.number().min(0).optional().nullable(), resolutionNotes: z.string().trim().max(1200).optional().or(z.literal('')) });
