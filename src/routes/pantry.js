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
exports.pantryRouter = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../prisma/client");
const pantry_1 = require("../validators/pantry");
const client_2 = require("@prisma/client");
/**
 * GET /pantry?userId=<uuid>&limit=20&offset=0
 */
exports.pantryRouter = express_1.default.Router();
exports.pantryRouter.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const parsed = pantry_1.listPantryQuery.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { userId, limit, offset } = parsed.data;
    try {
        const [items, total] = yield Promise.all([
            client_1.prisma.pantry_items.findMany({
                where: { user_id: userId },
                include: { units: true },
                orderBy: [{ created_at: "desc" }, { id: "desc" }],
                take: limit,
                skip: offset,
            }),
            client_1.prisma.pantry_items.count({ where: { user_id: userId } }),
        ]);
        res.json({
            total,
            limit,
            offset,
            items: items.map((i) => {
                var _a, _b, _c, _d;
                return ({
                    id: i.id,
                    ingredientName: (_a = i.ingredient_name) !== null && _a !== void 0 ? _a : null,
                    amount: (_c = (_b = i.amount) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _c !== void 0 ? _c : null,
                    unit: i.units ? { id: i.unit_id, name: (_d = i.units.name) !== null && _d !== void 0 ? _d : null } : null,
                    expiresAt: i.expires_at,
                    createdAt: i.created_at,
                });
            }),
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to list pantry", detail: err });
    }
}));
/**
 * POST /pantry?userId=<uuid>&limit=20&offset=0
 */
exports.pantryRouter.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const merged = Object.assign(Object.assign({}, req.body), { userId: (_a = req.body.userId) !== null && _a !== void 0 ? _a : req.header("x-user-id") });
    const parsed = pantry_1.addPantryBody.safeParse(merged);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { userId, ingredientName, amount, unitId, expiresAt } = parsed.data;
    try {
        if (unitId != null) {
            const unit = yield client_1.prisma.units.findUnique({ where: { id: unitId } });
            if (!unit) {
                return res.status(400).json({ error: "unitId not found" });
            }
        }
        const existing = yield client_1.prisma.pantry_items.findFirst({
            where: {
                user_id: userId,
                ingredient_name: { equals: ingredientName, mode: "insensitive" },
                unit_id: unitId !== null && unitId !== void 0 ? unitId : null,
            },
        });
        let saved;
        if (existing) {
            // merge: new amount = existing.amount + amount (if amount provided)
            const newAmount = amount == null ? existing.amount : (_b = existing === null || existing === void 0 ? void 0 : existing.amount) === null || _b === void 0 ? void 0 : _b.add(amount);
            saved = yield client_1.prisma.pantry_items.update({
                where: { id: existing.id },
                data: Object.assign({ amount: newAmount }, (expiresAt ? { expires_at: expiresAt } : {})),
                include: { units: { select: { id: true, name: true } } },
            });
        }
        else {
            saved = yield client_1.prisma.pantry_items.create({
                data: {
                    user_id: userId,
                    ingredient_name: ingredientName,
                    amount: amount == null ? null : new client_2.Prisma.Decimal(amount),
                    unit_id: unitId !== null && unitId !== void 0 ? unitId : null,
                    expires_at: expiresAt !== null && expiresAt !== void 0 ? expiresAt : null,
                },
                include: { units: { select: { id: true, name: true } } },
            });
        }
        return res.status(201).json({
            id: saved.id,
            ingredientName: (_c = saved.ingredient_name) !== null && _c !== void 0 ? _c : null,
            amount: (_e = (_d = saved.amount) === null || _d === void 0 ? void 0 : _d.toString()) !== null && _e !== void 0 ? _e : null,
            unit: saved.units
                ? { id: saved.units.id, name: (_f = saved.units.name) !== null && _f !== void 0 ? _f : null }
                : null,
            expiresAt: (_g = saved.expires_at) !== null && _g !== void 0 ? _g : null,
            createdAt: (_h = saved.created_at) !== null && _h !== void 0 ? _h : null,
        });
    }
    catch (_j) {
        res.status(500).json({ error: "Failed to add pantry item" });
    }
}));
/**
 * GET /pantry/search?userId=<uuid>&q=<text>&limit=20&offset=0
 * Also supports x-user-id header as a fallback for userId.
 */
exports.pantryRouter.get("/search", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const merged = Object.assign(Object.assign({}, req.query), { userId: (_a = req.query.userId) !== null && _a !== void 0 ? _a : req.header("x-user-id") });
    const parsed = pantry_1.searchPantryQuery.safeParse(merged);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { userId, q, limit, offset } = parsed.data;
    try {
        const where = {
            user_id: userId,
            ingredient_name: { contains: q, mode: "insensitive" },
        };
        const [items, total] = yield Promise.all([
            client_1.prisma.pantry_items.findMany({
                where,
                include: { units: true },
                orderBy: [{ ingredient_name: "asc" }, { id: "asc" }],
                take: limit,
                skip: offset,
            }),
            client_1.prisma.pantry_items.count({ where }),
        ]);
        return res.json({
            q,
            total,
            limit,
            offset,
            items: items.map((i) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: i.id,
                    ingredientName: (_a = i.ingredient_name) !== null && _a !== void 0 ? _a : null,
                    amount: (_c = (_b = i.amount) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _c !== void 0 ? _c : null,
                    unit: i.units ? { id: i.unit_id, name: (_d = i.units.name) !== null && _d !== void 0 ? _d : null } : null,
                    expiresAt: (_e = i.expires_at) !== null && _e !== void 0 ? _e : null,
                    createdAt: (_f = i.created_at) !== null && _f !== void 0 ? _f : null,
                });
            }),
        });
    }
    catch (err) {
        return res
            .status(500)
            .json({ error: "Failed to search pantry", detail: err });
    }
}));
