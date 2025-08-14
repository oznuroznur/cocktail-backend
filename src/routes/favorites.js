"use strict";
// src/routes/favorites.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("../prisma/client");
const zod_1 = require("zod");
const library_1 = require("@prisma/client/runtime/library");
const favoritesRouter = express_1.default.Router();
/** ---------- Zod Schemas ---------- */
const favBodySchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid(),
    cocktail_id: zod_1.z.number().int().positive(),
});
const listQuerySchema = zod_1.z.object({
    user_id: zod_1.z.string().uuid(),
    with: zod_1.z.enum(["basic", "full"]).optional(),
    skip: zod_1.z.coerce.number().int().min(0).default(0),
    take: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
/** ---------- Helpers ---------- */
const cocktailInclude = (mode) => mode === "full"
    ? {
        ingredients: true,
        instructions: true,
        glass_types: true,
        cocktail_allergens: { include: { allergens: true } },
        cocktail_categories: { include: { categories: true } },
        cocktail_tags: { include: { tags: true } },
    }
    : { glass_types: true };
/** ---------- POST /api/favorites ----------
 * Body: { user_id (uuid), cocktail_id (int) }
 * 201 -> created, 409 -> already exists
 */
favoritesRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, cocktail_id } = favBodySchema.parse(req.body);
        const fav = yield client_1.prisma.favorites.create({
            data: { user_id, cocktail_id },
        });
        return res.status(201).json(fav);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: err.format() });
        }
        // Unique constraint (user_id, cocktail_id)
        if (err instanceof library_1.PrismaClientKnownRequestError && err.code === "P2002") {
            return res.status(409).json({ error: "Already favorited" });
        }
        console.error(err);
        return res.status(500).json({ error: "Failed to add favorite" });
    }
}));
/** ---------- DELETE /api/favorites ----------
 * Body: { user_id, cocktail_id }
 * 204 -> deleted, 404 -> not found
 */
favoritesRouter.delete("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, cocktail_id } = favBodySchema.parse(req.body);
        const existing = yield client_1.prisma.favorites.findFirst({
            where: { user_id, cocktail_id },
            select: { id: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Favorite not found" });
        yield client_1.prisma.favorites.delete({ where: { id: existing.id } });
        return res.status(204).send();
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: err.format() });
        }
        console.error(err);
        return res.status(500).json({ error: "Failed to remove favorite" });
    }
}));
/** ---------- POST /api/favorites/toggle ----------
 * Body: { user_id, cocktail_id }
 * 200 -> { status: 'added' | 'removed' }
 */
favoritesRouter.post("/toggle", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user_id, cocktail_id } = favBodySchema.parse(req.body);
        const existing = yield client_1.prisma.favorites.findFirst({
            where: { user_id, cocktail_id },
            select: { id: true },
        });
        if (existing) {
            yield client_1.prisma.favorites.delete({ where: { id: existing.id } });
            return res.json({ status: "removed" });
        }
        else {
            yield client_1.prisma.favorites.create({ data: { user_id, cocktail_id } });
            return res.json({ status: "added" });
        }
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: err.format() });
        }
        console.error(err);
        return res.status(500).json({ error: "Failed to toggle favorite" });
    }
}));
/** ---------- GET /api/favorites?user_id=UUID&with=basic|full&skip=&take= ----------
 * Kullanıcının favori kokteyllerini listeler.
 */
favoritesRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const q = listQuerySchema.parse(req.query);
        const include = cocktailInclude((_a = q.with) !== null && _a !== void 0 ? _a : "basic");
        const [items, total] = yield Promise.all([
            client_1.prisma.favorites.findMany({
                where: { user_id: q.user_id },
                include: { cocktails: { include } },
                orderBy: { id: "desc" },
                skip: q.skip,
                take: q.take,
            }),
            client_1.prisma.favorites.count({ where: { user_id: q.user_id } }),
        ]);
        return res.json({ items, total, skip: q.skip, take: q.take });
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: err.format() });
        }
        console.error(err);
        return res.status(500).json({ error: "Failed to list favorites" });
    }
}));
/** ---------- GET /api/favorites/count/:cocktailId ----------
 * Belirli bir kokteyl için favori sayısı
 */
favoritesRouter.get("/count/:cocktailId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const cocktailId = Number(req.params.cocktailId);
    if (Number.isNaN(cocktailId))
        return res.status(400).json({ error: "Invalid cocktailId" });
    try {
        const count = yield client_1.prisma.favorites.count({ where: { cocktail_id: cocktailId } });
        return res.json({ cocktail_id: cocktailId, count });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to count favorites" });
    }
}));
exports.default = favoritesRouter;
