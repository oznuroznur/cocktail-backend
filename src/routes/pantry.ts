import { z } from "zod";
import express from "express";
import { prisma } from "../prisma/client";

const listPantryQuery = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

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
