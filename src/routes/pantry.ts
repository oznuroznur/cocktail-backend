import express from "express";
import { prisma } from "../prisma/client";
import {
  addPantryBody,
  listPantryQuery,
  searchPantryQuery,
} from "../validators/pantry";
import { Prisma } from "@prisma/client";

/**
 * GET /pantry?userId=<uuid>&limit=20&offset=0
 */

export const pantryRouter = express.Router();

pantryRouter.get("/", async (req, res) => {
  const parsed = listPantryQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { userId, limit, offset } = parsed.data;
  try {
    const [items, total] = await Promise.all([
      prisma.pantry_items.findMany({
        where: { user_id: userId },
        include: { units: true },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.pantry_items.count({ where: { user_id: userId } }),
    ]);

    res.json({
      total,
      limit,
      offset,
      items: items.map((i) => ({
        id: i.id,
        ingredientName: i.ingredient_name ?? null,
        amount: i.amount?.toString() ?? null,
        unit: i.units ? { id: i.unit_id, name: i.units.name ?? null } : null,
        expiresAt: i.expires_at,
        createdAt: i.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to list pantry", detail: err });
  }
});

/**
 * POST /pantry?userId=<uuid>&limit=20&offset=0
 */
pantryRouter.post("/", async (req, res) => {
  const merged = {
    ...req.body,
    userId: (req.body.userId as string) ?? req.header("x-user-id"),
  };

  const parsed = addPantryBody.safeParse(merged);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { userId, ingredientName, amount, unitId, expiresAt } = parsed.data;

  try {
    if (unitId != null) {
      const unit = await prisma.units.findUnique({ where: { id: unitId } });
      if (!unit) {
        return res.status(400).json({ error: "unitId not found" });
      }
    }

    const existing = await prisma.pantry_items.findFirst({
      where: {
        user_id: userId,
        ingredient_name: { equals: ingredientName, mode: "insensitive" },
        unit_id: unitId ?? null,
      },
    });

    let saved;
    if (existing) {
      // merge: new amount = existing.amount + amount (if amount provided)
      const newAmount =
        amount == null ? existing.amount : existing?.amount?.add(amount);

      saved = await prisma.pantry_items.update({
        where: { id: existing.id },
        data: {
          amount: newAmount,
          // only set expires_at if caller provided it; otherwise keep existing
          ...(expiresAt ? { expires_at: expiresAt } : {}),
        },
        include: { units: { select: { id: true, name: true } } },
      });
    } else {
      saved = await prisma.pantry_items.create({
        data: {
          user_id: userId,
          ingredient_name: ingredientName,
          amount: amount == null ? null : new Prisma.Decimal(amount),
          unit_id: unitId ?? null,
          expires_at: expiresAt ?? null,
        },
        include: { units: { select: { id: true, name: true } } },
      });
    }

    return res.status(201).json({
      id: saved.id,
      ingredientName: saved.ingredient_name ?? null,
      amount: saved.amount?.toString() ?? null,
      unit: saved.units
        ? { id: saved.units.id, name: saved.units.name ?? null }
        : null,
      expiresAt: saved.expires_at ?? null,
      createdAt: saved.created_at ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to add pantry item" });
  }
});

/**
 * GET /pantry/search?userId=<uuid>&q=<text>&limit=20&offset=0
 * Also supports x-user-id header as a fallback for userId.
 */

pantryRouter.get("/search", async (req, res) => {
  const merged = {
    ...req.query,
    userId: (req.query.userId as string) ?? req.header("x-user-id"),
  };
  const parsed = searchPantryQuery.safeParse(merged);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { userId, q, limit, offset } = parsed.data;

  try {
    const where = {
      user_id: userId,
      ingredient_name: { contains: q, mode: "insensitive" as const },
    };

    const [items, total] = await Promise.all([
      prisma.pantry_items.findMany({
        where,
        include: { units: true },
        orderBy: [{ ingredient_name: "asc" }, { id: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.pantry_items.count({ where }),
    ]);

    return res.json({
      q,
      total,
      limit,
      offset,
      items: items.map((i) => ({
        id: i.id,
        ingredientName: i.ingredient_name ?? null,
        amount: i.amount?.toString() ?? null,
        unit: i.units ? { id: i.unit_id, name: i.units.name ?? null } : null,
        expiresAt: i.expires_at ?? null,
        createdAt: i.created_at ?? null,
      })),
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to search pantry", detail: err });
  }
});
