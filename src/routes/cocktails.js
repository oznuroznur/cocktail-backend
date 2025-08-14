"use strict";
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
exports.cocktailsRouter = void 0;
const client_1 = require("../prisma/client");
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const cocktail_1 = require("../validators/cocktail");
exports.cocktailsRouter = express_1.default.Router();
// GET /api/cocktails
/**
 * @swagger
 * /api/cocktails:
 *   get:
 *     summary: Get all cocktails
 *     tags: [Cocktails]
 *     responses:
 *       200:
 *         description: List of cocktails
 */
// GET /api/cocktails?skip=0&take=20&with=basic|full
exports.cocktailsRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const skip = Number((_a = req.query.skip) !== null && _a !== void 0 ? _a : 0);
        const take = Math.min(Number((_b = req.query.take) !== null && _b !== void 0 ? _b : 20), 100);
        const withMode = (_c = req.query.with) !== null && _c !== void 0 ? _c : "basic";
        const include = withMode === "full"
            ? {
                ingredients: true,
                instructions: true,
                glass_types: true,
                cocktail_allergens: { include: { allergens: true } },
                cocktail_categories: { include: { categories: true } },
                cocktail_tags: { include: { tags: true } },
            }
            : { glass_types: true };
        const [items, total] = yield Promise.all([
            client_1.prisma.cocktails.findMany({
                skip,
                take,
                include,
                orderBy: { id: "desc" },
            }),
            client_1.prisma.cocktails.count(),
        ]);
        res.json({ items, total, skip, take });
    }
    catch (err) {
        res
            .status(500)
            .json({ error: "There was an error while fetching cocktails" });
    }
}));
// GET /api/cocktails/search
/**
 * @swagger
 * /api/cocktails/search:
 *   get:
 *     summary: Search cocktails by name, description, ingredients, and filters
 *     tags: [Cocktails]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Search keyword (used in name, description, ingredients)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         required: false
 *         description: Max number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         required: false
 *         description: Number of items to skip
 *       - in: query
 *         name: isAlcoholic
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Filter by alcoholic content (true or false)
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter by cocktail category ID
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter by tag ID
 *       - in: query
 *         name: glassTypeId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filter by glass type ID
 *     responses:
 *       200:
 *         description: Filtered list of cocktails
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 q:
 *                   type: string
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       description:
 *                         type: string
 *                       isAlcoholic:
 *                         type: boolean
 *                       glass:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           image_url:
 *                             type: string
 *                       ingredientsPreview:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             amount:
 *                               type: string
 *                             unit:
 *                               type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
exports.cocktailsRouter.get("/search", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = cocktail_1.searchCocktailsQuery.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { q, limit, offset, isAlcoholic, categoryId, tagId, glassTypeId } = parsed.data;
    const where = {
        AND: [
            {
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                    {
                        ingredients: {
                            some: { name: { contains: q, mode: "insensitive" } },
                        },
                    },
                ],
            },
        ],
    };
    if (typeof isAlcoholic !== "undefined") {
        where.AND.push({ is_alcoholic: isAlcoholic === "true" });
    }
    if (categoryId) {
        where.AND.push({
            cocktail_categories: { some: { category_id: categoryId } },
        });
    }
    if (tagId) {
        where.AND.push({ cocktail_tags: { some: { tag_id: tagId } } });
    }
    if (glassTypeId) {
        where.AND.push({ glass_type_id: glassTypeId });
    }
    try {
        const [items, total] = yield Promise.all([
            client_1.prisma.cocktails.findMany({
                where,
                orderBy: { name: "asc" },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    name: true,
                    image_url: true,
                    description: true,
                    is_alcoholic: true,
                    glass_types: { select: { id: true, name: true, image_url: true } },
                    ingredients: {
                        take: 6,
                        select: {
                            id: true,
                            name: true,
                            amount: true,
                            units: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            client_1.prisma.cocktails.count({ where }),
        ]);
        res.json({
            q,
            total,
            limit,
            offset,
            items: items.map((c) => ({
                id: c.id,
                name: c.name,
                imageUrl: c.image_url,
                description: c.description,
                isAlcoholic: c.is_alcoholic,
                glass: c.glass_types,
                ingredientsPreview: c.ingredients.map((i) => {
                    var _a, _b, _c, _d;
                    return ({
                        id: i.id,
                        name: i.name,
                        amount: (_b = (_a = i.amount) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : null,
                        unit: (_d = (_c = i.units) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null,
                    });
                }),
            })),
        });
    }
    catch (err) {
        console.error(err);
        res
            .status(500)
            .json({ error: "There was an error while searching for cocktails" });
    }
}));
//GET a specific cocktail /api/cocktails/:id
/**
 * @swagger
 * /api/cocktails/{id}:
 *   get:
 *     summary: Get a cocktail by ID
 *     tags: [Cocktails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cocktail details
 *       404:
 *         description: Cocktail not found
 */
exports.cocktailsRouter.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
        return res.status(400).json({ error: "Invalid id" });
    try {
        const cocktail = yield client_1.prisma.cocktails.findUnique({
            where: { id },
            include: {
                ingredients: true,
                instructions: true,
                glass_types: true,
                cocktail_allergens: { include: { allergens: true } },
                cocktail_categories: { include: { categories: true } },
                cocktail_tags: { include: { tags: true } },
            },
        });
        if (!cocktail)
            return res.status(404).json({ error: "Cocktail not found" });
        res.json(cocktail);
    }
    catch (_a) {
        res
            .status(500)
            .json({ error: "There was an error while fetching cocktail" });
    }
}));
//POST /api/cocktails/add-cocktail
/**
 * @swagger
 * /api/cocktails:
 *   post:
 *     summary: Create a new cocktail
 *     tags: [Cocktails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CocktailInput'
 *     responses:
 *       201:
 *         description: Cocktail created
 */
exports.cocktailsRouter.post("/add-cocktail", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const parsed = cocktail_1.cocktailCreateSchema.parse(req.body);
        const newCocktail = yield client_1.prisma.cocktails.create({
            data: {
                // scalars
                name: parsed.name,
                image_url: (_a = parsed.image_url) !== null && _a !== void 0 ? _a : null,
                video_url: (_b = parsed.video_url) !== null && _b !== void 0 ? _b : null,
                description: (_c = parsed.description) !== null && _c !== void 0 ? _c : null,
                glass_type_id: parsed.glass_type_id,
                method: (_d = parsed.method) !== null && _d !== void 0 ? _d : null,
                garnish: (_e = parsed.garnish) !== null && _e !== void 0 ? _e : null,
                difficulty: (_f = parsed.difficulty) !== null && _f !== void 0 ? _f : null,
                prep_time: parsed.prep_time,
                nutrition_info: (_g = parsed.nutrition_info) !== null && _g !== void 0 ? _g : null,
                is_alcoholic: parsed.is_alcoholic,
                servings: parsed.servings,
                alcohol_percentage: parsed.alcohol_percentage,
                calories_per_serving: parsed.calories_per_serving,
                // 1:N
                ingredients: { create: (_h = parsed.ingredients) !== null && _h !== void 0 ? _h : [] },
                instructions: { create: (_j = parsed.instructions) !== null && _j !== void 0 ? _j : [] },
                // M:N — use PLURAL relation names from your schema
                cocktail_allergens: {
                    create: ((_k = parsed.allergen_ids) !== null && _k !== void 0 ? _k : []).map((allergenId) => ({
                        allergens: { connect: { id: allergenId } },
                    })),
                },
                cocktail_categories: {
                    create: ((_l = parsed.category_ids) !== null && _l !== void 0 ? _l : []).map((categoryId) => ({
                        categories: { connect: { id: categoryId } },
                    })),
                },
                cocktail_tags: {
                    create: ((_m = parsed.tag_ids) !== null && _m !== void 0 ? _m : []).map((tagId) => ({
                        tags: { connect: { id: tagId } },
                    })),
                },
            },
            include: {
                ingredients: true,
                instructions: true,
                glass_types: true,
                cocktail_allergens: { include: { allergens: true } },
                cocktail_categories: { include: { categories: true } },
                cocktail_tags: { include: { tags: true } },
            },
        });
        res.status(201).json(newCocktail);
    }
    catch (err) {
        if (err instanceof zod_1.z.ZodError) {
            return res.status(400).json({ errors: err });
        }
        console.error(err);
        res
            .status(500)
            .json({ error: "There was an error while creating the cocktail" });
    }
}));
//DELETE a cocktail /api/cocktails/:id
/**
 * @swagger
 * /api/cocktails/{id}:
 *   delete:
 *     summary: Delete a cocktail
 *     tags: [Cocktails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Cocktail deleted
 */
exports.cocktailsRouter.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
        return res.status(400).json({ error: "Invalid id" });
    try {
        yield client_1.prisma.$transaction([
            client_1.prisma.ingredients.deleteMany({ where: { cocktail_id: id } }),
            client_1.prisma.instructions.deleteMany({ where: { cocktail_id: id } }),
            client_1.prisma.cocktail_allergens.deleteMany({ where: { cocktail_id: id } }),
            client_1.prisma.cocktail_categories.deleteMany({ where: { cocktail_id: id } }),
            client_1.prisma.cocktail_tags.deleteMany({ where: { cocktail_id: id } }),
            client_1.prisma.comments.deleteMany({ where: { cocktail_id: id } }),
            client_1.prisma.favorites.deleteMany({ where: { cocktail_id: id } }),
            client_1.prisma.cocktails.delete({ where: { id } }),
        ]);
        res.status(204).send();
    }
    catch (_a) {
        res
            .status(500)
            .json({ error: "There was an error while deleting cocktail" });
    }
}));
/**
 * GET /api/cocktails/search?q=...&limit=20&offset=0[&isAlcoholic=true|false&categoryId=&tagId=&glassTypeId=]
 */
