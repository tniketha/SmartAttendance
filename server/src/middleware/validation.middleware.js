const { z } = require("zod");
const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const scanSchema = z.object({ qrToken: z.string().min(1).max(512) }).strict();
const sessionSchema = z
  .object({
    moduleId: objectId,
    durationMinutes: z.number().int().min(1).max(180).default(10),
    lateThresholdMinutes: z.number().int().min(0).max(180).default(5),
  })
  .strict()
  .refine(
    (value) => value.lateThresholdMinutes <= value.durationMinutes,
    "Late threshold must not exceed class duration.",
  );
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return res
        .status(400)
        .json({ success: false, error: result.error.issues[0].message });
    req.body = result.data;
    next();
  };
}
function validateIds(req, res, next) {
  if (
    Object.values(req.params).some(
      (value) => !objectId.safeParse(value).success,
    )
  )
    return res
      .status(400)
      .json({ success: false, error: "Invalid resource identifier." });
  next();
}
module.exports = { validate, validateIds, scanSchema, sessionSchema };
