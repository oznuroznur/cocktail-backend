"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPantryQuery = exports.addPantryBody = exports.listPantryQuery = void 0;
const zod_1 = require("zod");
exports.listPantryQuery = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
exports.addPantryBody = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    ingredientName: zod_1.z.string().min(1, 'ingredientName is required'),
    amount: zod_1.z.coerce.number().positive().optional(),
    unitId: zod_1.z.coerce.number().int().optional(),
    expiresAt: zod_1.z.coerce.date().optional(),
});
exports.searchPantryQuery = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    q: zod_1.z.string().min(1, 'q is required'),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
