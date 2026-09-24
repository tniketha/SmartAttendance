import { RequestHandler } from 'express';
import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const latitude = z.number().finite().min(-90).max(90);
const longitude = z.number().finite().min(-180).max(180);
export const scanSchema = z.object({
  qrToken: z.string().min(1).max(2048),
  latitude: latitude.optional(), longitude: longitude.optional(),
  accuracy: z.number().finite().nonnegative().optional(),
  locationTimestamp: z.number().finite().optional(),
  mocked: z.boolean().optional(),
});
export const sessionSchema = z.object({
  moduleId: objectId,
  durationMinutes: z.number().int().min(1).max(180).default(10),
  lateThresholdMinutes: z.number().int().min(0).max(180).default(5),
  geoValidationEnabled: z.boolean().default(false),
  latitude: latitude.optional(), longitude: longitude.optional(),
  allowedRadius: z.number().finite().min(20).max(500).default(100),
}).refine(v => v.lateThresholdMinutes <= v.durationMinutes, 'Late threshold must not exceed duration')
  .refine(v => !v.geoValidationEnabled || (v.latitude !== undefined && v.longitude !== undefined), 'Classroom coordinates are required');
export const validate = (schema: z.ZodTypeAny): RequestHandler => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) { res.status(400).json({ success: false, error: result.error.issues[0].message }); return; }
  req.body = result.data;
  next();
};
export const validateIds: RequestHandler = (req, res, next) => {
  if (Object.entries(req.params).some(([key, value]) => /id$/i.test(key) && !objectId.safeParse(value).success)) {
    res.status(400).json({ success: false, error: 'Invalid resource identifier' }); return;
  }
  next();
};
