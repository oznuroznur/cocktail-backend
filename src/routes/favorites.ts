// src/routes/favorites.ts

import express, { Request, Response } from "express";
import { prisma } from "../prisma/client";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";


const favoritesRouter = express.Router();

/** ---------- Zod Schemas ---------- */
const favBodySchema = z.object({
  user_id: z.string().uuid(),
  cocktail_id: z.number().int().positive(),
});

const listQuerySchema = z.object({
  user_id: z.string().uuid(),
  with: z.enum(["basic", "full"]).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

/** ---------- Helpers ---------- */
const cocktailInclude = (mode: "basic" | "full") =>
  mode === "full"
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
favoritesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { user_id, cocktail_id } = favBodySchema.parse(req.body);

    const fav = await prisma.favorites.create({
      data: { user_id, cocktail_id },
    });

    return res.status(201).json(fav);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.format() });
    }
    // Unique constraint (user_id, cocktail_id)
  if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "Already favorited" });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to add favorite" });
  }
});

/** ---------- DELETE /api/favorites ----------
 * Body: { user_id, cocktail_id }
 * 204 -> deleted, 404 -> not found
 */
favoritesRouter.delete("/", async (req: Request, res: Response) => {
  try {
    const { user_id, cocktail_id } = favBodySchema.parse(req.body);

    const existing = await prisma.favorites.findFirst({
      where: { user_id, cocktail_id },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: "Favorite not found" });

    await prisma.favorites.delete({ where: { id: existing.id } });
    return res.status(204).send();
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.format() });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to remove favorite" });
  }
});

/** ---------- POST /api/favorites/toggle ----------
 * Body: { user_id, cocktail_id }
 * 200 -> { status: 'added' | 'removed' }
 */
favoritesRouter.post("/toggle", async (req: Request, res: Response) => {
  try {
    const { user_id, cocktail_id } = favBodySchema.parse(req.body);

    const existing = await prisma.favorites.findFirst({
      where: { user_id, cocktail_id },
      select: { id: true },
    });

    if (existing) {
      await prisma.favorites.delete({ where: { id: existing.id } });
      return res.json({ status: "removed" });
    } else {
      await prisma.favorites.create({ data: { user_id, cocktail_id } });
      return res.json({ status: "added" });
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.format() });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to toggle favorite" });
  }
});

/** ---------- GET /api/favorites?user_id=UUID&with=basic|full&skip=&take= ----------
 * Kullanıcının favori kokteyllerini listeler.
 */
favoritesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const q = listQuerySchema.parse(req.query);
    const include = cocktailInclude(q.with ?? "basic");

    const [items, total] = await Promise.all([
      prisma.favorites.findMany({
        where: { user_id: q.user_id },
        include: { cocktails: { include } },
        orderBy: { id: "desc" },
        skip: q.skip,
        take: q.take,
      }),
      prisma.favorites.count({ where: { user_id: q.user_id } }),
    ]);

    return res.json({ items, total, skip: q.skip, take: q.take });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.format() });
    }
    console.error(err);
    return res.status(500).json({ error: "Failed to list favorites" });
  }
});

/** ---------- GET /api/favorites/count/:cocktailId ----------
 * Belirli bir kokteyl için favori sayısı
 */
favoritesRouter.get("/count/:cocktailId", async (req: Request, res: Response) => {
  const cocktailId = Number(req.params.cocktailId);
  if (Number.isNaN(cocktailId)) return res.status(400).json({ error: "Invalid cocktailId" });

  try {
    const count = await prisma.favorites.count({ where: { cocktail_id: cocktailId } });
    return res.json({ cocktail_id: cocktailId, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to count favorites" });
  }
});
export default favoritesRouter;