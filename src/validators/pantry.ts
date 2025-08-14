import { z } from "zod";

export const listPantryQuery = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});


export const addPantryBody = z.object({
  userId: z.string().uuid(),
  ingredientName: z.string().min(1, 'ingredientName is required'),
  amount: z.coerce.number().positive().optional(),   
  unitId: z.coerce.number().int().optional(),      
  expiresAt: z.coerce.date().optional(),           
});


export const searchPantryQuery = z.object({
  userId: z.string().uuid(),
  q: z.string().min(1, 'q is required'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
