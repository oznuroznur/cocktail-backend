import { prisma } from "../prisma/client";
import express, { Request, Response } from "express";
import { z } from "zod";
import {
  cocktailCreateSchema,
  CocktailCreateInput,
  searchCocktailsQuery,
} from "../validators/cocktail";


export const cocktailsRouter = express.Router();

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
cocktailsRouter.get("/", async (req, res) => {
  try {
    const skip = Number(req.query.skip ?? 0);
    const take = Math.min(Number(req.query.take ?? 20), 100);
    const withMode = (req.query.with as string) ?? "basic";

    const include =
      withMode === "full"
        ? {
            ingredients: true,
            instructions: true,
            glass_types: true,
            cocktail_allergens: { include: { allergens: true } },
            cocktail_categories: { include: { categories: true } },
            cocktail_tags: { include: { tags: true } },
          }
        : { glass_types: true };

    const [items, total] = await Promise.all([
      prisma.cocktails.findMany({
        skip,
        take,
        include,
        orderBy: { id: "desc" },
      }),
      prisma.cocktails.count(),
    ]);

    res.json({ items, total, skip, take });
  } catch (err) {
    res
      .status(500)
      .json({ error: "There was an error while fetching cocktails" });
  }
});


cocktailsRouter.get("/search", async (req, res) => {
  const parsed = searchCocktailsQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { q, limit, offset, isAlcoholic, categoryId, tagId, glassTypeId } =
    parsed.data;

  const where: any = {
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

  // 3) execute query
  try {
    const [items, total] = await Promise.all([
      prisma.cocktails.findMany({
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
      prisma.cocktails.count({ where }),
    ]);

    // 4) format and return
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
        ingredientsPreview: c.ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          amount: i.amount?.toString() ?? null,
          unit: i.units?.name ?? null,
        })),
      })),
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "There was an error while searching for cocktails" });
  }
});


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
cocktailsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const cocktail = await prisma.cocktails.findUnique({
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
    if (!cocktail) return res.status(404).json({ error: "Cocktail not found" });
    res.json(cocktail);
  } catch {
    res
      .status(500)
      .json({ error: "There was an error while fetching cocktail" });
  }
});

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
cocktailsRouter.post("/add-cocktail", async (req: Request, res: Response) => {
  try {
    const parsed: CocktailCreateInput = cocktailCreateSchema.parse(req.body);

    const newCocktail = await prisma.cocktails.create({
      data: {
        // scalars
        name: parsed.name,
        image_url: parsed.image_url ?? null,
        video_url: parsed.video_url ?? null,
        description: parsed.description ?? null,
        glass_type_id: parsed.glass_type_id,
        method: parsed.method ?? null,
        garnish: parsed.garnish ?? null,
        difficulty: parsed.difficulty ?? null,
        prep_time: parsed.prep_time,
        nutrition_info: parsed.nutrition_info ?? null,
        is_alcoholic: parsed.is_alcoholic,
        servings: parsed.servings,
        alcohol_percentage: parsed.alcohol_percentage,
        calories_per_serving: parsed.calories_per_serving,

        // 1:N
        ingredients: { create: parsed.ingredients ?? [] },
        instructions: { create: parsed.instructions ?? [] },

        // M:N — use PLURAL relation names from your schema
        cocktail_allergens: {
          create: (parsed.allergen_ids ?? []).map((allergenId: number) => ({
            allergens: { connect: { id: allergenId } },
          })),
        },
        cocktail_categories: {
          create: (parsed.category_ids ?? []).map((categoryId: number) => ({
            categories: { connect: { id: categoryId } },
          })),
        },
        cocktail_tags: {
          create: (parsed.tag_ids ?? []).map((tagId: number) => ({
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
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err });
    }
    console.error(err);
    res
      .status(500)
      .json({ error: "There was an error while creating the cocktail" });
  }
});


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
cocktailsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    await prisma.$transaction([
      prisma.ingredients.deleteMany({ where: { cocktail_id: id } }),
      prisma.instructions.deleteMany({ where: { cocktail_id: id } }),
      prisma.cocktail_allergens.deleteMany({ where: { cocktail_id: id } }),
      prisma.cocktail_categories.deleteMany({ where: { cocktail_id: id } }),
      prisma.cocktail_tags.deleteMany({ where: { cocktail_id: id } }),
      prisma.comments.deleteMany({ where: { cocktail_id: id } }),
      prisma.favorites.deleteMany({ where: { cocktail_id: id } }),
      prisma.cocktails.delete({ where: { id } }),
    ]);
    res.status(204).send();
  } catch {
    res
      .status(500)
      .json({ error: "There was an error while deleting cocktail" });
  }
});


/**
 * GET /api/cocktails/search?q=...&limit=20&offset=0[&isAlcoholic=true|false&categoryId=&tagId=&glassTypeId=]
 */


