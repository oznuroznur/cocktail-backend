import { prisma } from '../prisma/client';
import express from 'express';

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
cocktailsRouter.get('/', async (req, res) => {
  try {
    const cocktails = await prisma.cocktails.findMany({
      include: {
        ingredients: true,
        instructions: true,
        glass_types:true,
      },
    });
    res.json(cocktails);
  } catch (err) {
    res.status(500).json({ error: 'There was an error while fetching cocktails' });
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
cocktailsRouter.get('/:id', async (req, res) => {
  try {
    const {id} = req.params;
    const cocktail = await prisma.cocktails.findUnique({
      where : {id: Number(id)},
      include:{
        ingredients: true,
        instructions: true,
        glass_types: true,
      }
    })
    if (!cocktail) {
      return res.status(404).json({ error: 'Cocktail not found' });
    }
    res.json(cocktail)
  }catch (err) {
    res.status(500).json({ err: 'There was an error while fetching cocktail' });
  }
})

//POST /api/cocktails/add-coctail
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
cocktailsRouter.post('/add-coctail', async (req, res) => {
  try {
    const {
      name,
      image_url,
      video_url,
      description,
      glass_type_id,
      method,
      garnish,
      difficulty,
      prep_time,
      nutrition_info,
      is_alcoholic,
      servings,
      alcohol_percentage,
      calories_per_serving,
      ingredients = [],
      instructions = [],
      allergen_ids = [],
      category_ids = [],
      tag_ids = []
    } = req.body;

    const newCocktail = await prisma.cocktails.create({
      data: {
        name,
        image_url,
        video_url,
        description,
        glass_type_id,
        method,
        garnish,
        difficulty,
        prep_time,
        nutrition_info,
        is_alcoholic,
        servings,
        alcohol_percentage,
        calories_per_serving,
        // Nested creates:
        ingredients: { create: ingredients },
        instructions: { create: instructions },
        // Many-to-many connects (must be existing IDs):
        cocktail_allergens: {
          create: allergen_ids.map((allergen_id: number) => ({
            allergen: { connect: { id: allergen_id } }
          }))
        },
        cocktail_categories: {
          create: category_ids.map((category_id: number) => ({
            category: { connect: { id: category_id } }
          }))
        },
        cocktail_tags: {
          create: tag_ids.map((tag_id: number) => ({
            tag: { connect: { id: tag_id } }
          }))
        }
      },
      include: {
        ingredients: true,
        instructions: true,
        cocktail_allergens: { include: { allergens: true } },
        cocktail_categories: { include: { categories: true } },
        cocktail_tags: { include: { tags: true } }
      }
    });

    res.status(201).json(newCocktail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'There was an error while creating the cocktail' });
  }
});


//UPDATE a cocktail /api/cocktails/:id
/**
 * @swagger
 * /api/cocktails/{id}:
 *   put:
 *     summary: Update a cocktail
 *     tags: [Cocktails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CocktailInput'
 *     responses:
 *       200:
 *         description: Cocktail updated
 */
cocktailsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updatedCocktail = await prisma.cocktails.update({
      where: { id: Number(id) },
      data,
    });

    res.json(updatedCocktail);
  } catch (err) {
    res.status(500).json({ error: 'There was an error while updating cocktail' });
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
cocktailsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.cocktails.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'There was an error while deleting cocktail' });
  }
});