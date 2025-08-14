import { z } from "zod";

// helpers
const numericString = /^-?\d+(\.\d+)?$/;
const decimalLike = z.union([
  z.number(),
  z.string().regex(numericString, "must be a number string"),
]);

const zInt = z.number().int();

// children
export const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: decimalLike.optional(),     // Prisma Decimal friendly
  unit_id: zInt.optional(),
});

export const instructionSchema = z.object({
  step_number: zInt.optional(),       // allow missing; DB can order or you assign
  text: z.string().min(1),
});

// base (shared shape)
const cocktailBase = z.object({
  // scalars
  image_url: z.string().url().optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  glass_type_id: zInt.optional(),
  method: z.string().optional().nullable(),
  garnish: z.string().optional().nullable(),
  difficulty: z.string().optional().nullable(),
  prep_time: zInt.optional(),
  nutrition_info: z.string().optional().nullable(),
  is_alcoholic: z.boolean().optional(),
  servings: zInt.optional(),
  alcohol_percentage: z.number().optional(),
  calories_per_serving: z.number().optional(),

  // children
  ingredients: z.array(ingredientSchema).optional(),
  instructions: z.array(instructionSchema).optional(),

  // M:N ids
  allergen_ids: z.array(zInt).optional(),
  category_ids: z.array(zInt).optional(),
  tag_ids: z.array(zInt).optional(),
})
.strict(); // reject unknown keys (change to .passthrough() if you want to allow)

// create: name required
export const cocktailCreateSchema = cocktailBase.extend({
  name: z.string().min(1),
});

// update: everything optional (including name)
export const cocktailUpdateSchema = cocktailBase.extend({
  name: z.string().min(1).optional(),
});


export const searchCocktailsQuery = z.object({
  q: z.string().min(1, 'q is required'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),

  // optional filters (use if you want)
  isAlcoholic: z.enum(['true','false']).optional(), // maps to boolean
  categoryId: z.coerce.number().int().optional(),
  tagId: z.coerce.number().int().optional(),
  glassTypeId: z.coerce.number().int().optional(),
});

// exported types
export type CocktailCreateInput = z.infer<typeof cocktailCreateSchema>;
export type CocktailUpdateInput = z.infer<typeof cocktailUpdateSchema>;


