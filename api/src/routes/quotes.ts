import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { idParam } from '../schemas/common';
import { patchQuoteSchema } from '../schemas/quotes';
import { getQuote, updateQuote } from '../services/procurement/quoteService';

export const quotesRouter = Router();

quotesRouter.get('/:id', asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ data: await getQuote(id) });
}));

quotesRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json({ data: await updateQuote(id, patchQuoteSchema.parse(req.body)) });
}));
