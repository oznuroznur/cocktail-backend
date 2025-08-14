"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchCocktailsQuery = exports.cocktailUpdateSchema = exports.cocktailCreateSchema = exports.instructionSchema = exports.ingredientSchema = void 0;
const zod_1 = require("zod");
// helpers
const numericString = /^-?\d+(\.\d+)?$/;
const decimalLike = zod_1.z.union([
    zod_1.z.number(),
    zod_1.z.string().regex(numericString, "must be a number string"),
]);
const zInt = zod_1.z.number().int();
// children
exports.ingredientSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    amount: decimalLike.optional(), // Prisma Decimal friendly
    unit_id: zInt.optional(),
});
exports.instructionSchema = zod_1.z.object({
    step_number: zInt.optional(), // allow missing; DB can order or you assign
    text: zod_1.z.string().min(1),
});
// base (shared shape)
const cocktailBase = zod_1.z.object({
    // scalars
    image_url: zod_1.z.string().url().optional().nullable(),
    video_url: zod_1.z.string().url().optional().nullable(),
    description: zod_1.z.string().optional().nullable(),
    glass_type_id: zInt.optional(),
    method: zod_1.z.string().optional().nullable(),
    garnish: zod_1.z.string().optional().nullable(),
    difficulty: zod_1.z.string().optional().nullable(),
    prep_time: zInt.optional(),
    nutrition_info: zod_1.z.string().optional().nullable(),
    is_alcoholic: zod_1.z.boolean().optional(),
    servings: zInt.optional(),
    alcohol_percentage: zod_1.z.number().optional(),
    calories_per_serving: zod_1.z.number().optional(),
    // children
    ingredients: zod_1.z.array(exports.ingredientSchema).optional(),
    instructions: zod_1.z.array(exports.instructionSchema).optional(),
    // M:N ids
    allergen_ids: zod_1.z.array(zInt).optional(),
    category_ids: zod_1.z.array(zInt).optional(),
    tag_ids: zod_1.z.array(zInt).optional(),
})
    .strict(); // reject unknown keys (change to .passthrough() if you want to allow)
// create: name required
exports.cocktailCreateSchema = cocktailBase.extend({
    name: zod_1.z.string().min(1),
});
// update: everything optional (including name)
exports.cocktailUpdateSchema = cocktailBase.extend({
    name: zod_1.z.string().min(1).optional(),
});
exports.searchCocktailsQuery = zod_1.z.object({
    q: zod_1.z.string().min(1, 'q is required'),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
    // optional filters (use if you want)
    isAlcoholic: zod_1.z.enum(['true', 'false']).optional(), // maps to boolean
    categoryId: zod_1.z.coerce.number().int().optional(),
    tagId: zod_1.z.coerce.number().int().optional(),
    glassTypeId: zod_1.z.coerce.number().int().optional(),
});
