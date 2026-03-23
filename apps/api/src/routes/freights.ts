import { Router } from "express";
import mongoose from "mongoose";
import { Freight } from "../models/Freight.js";
import { validateDate, validateFreightPayload } from "../validation.js";

export const freightsRouter = Router();

freightsRouter.get("/", async (req, res, next) => {
  try {
    const validation = validateDate(req.query.date);
    if (!validation.data) {
      return res.status(400).json({
        message: "Parâmetro date inválido.",
        errors: validation.errors,
      });
    }

    const freights = await Freight.find({ date: validation.data })
      .sort({ date: -1, updatedAt: -1, createdAt: -1 })
      .lean()
      .exec();

    return res.json(freights);
  } catch (error) {
    return next(error);
  }
});

freightsRouter.post("/", async (req, res, next) => {
  try {
    const validation = validateFreightPayload(req.body);
    if (!validation.data) {
      return res.status(400).json({
        message: "Dados inválidos para criar frete.",
        errors: validation.errors,
      });
    }

    const freight = await Freight.create(validation.data);
    return res.status(201).json(freight.toJSON());
  } catch (error) {
    return next(error);
  }
});

freightsRouter.put("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const validation = validateFreightPayload(req.body);
    if (!validation.data) {
      return res.status(400).json({
        message: "Dados inválidos para atualizar frete.",
        errors: validation.errors,
      });
    }

    const freight = await Freight.findByIdAndUpdate(req.params.id, validation.data, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    if (!freight) {
      return res.status(404).json({ message: "Frete não encontrado." });
    }

    return res.json(freight);
  } catch (error) {
    return next(error);
  }
});

freightsRouter.delete("/by-date", async (req, res, next) => {
  try {
    const validation = validateDate(req.query.date);
    if (!validation.data) {
      return res.status(400).json({
        message: "Parâmetro date inválido.",
        errors: validation.errors,
      });
    }

    const result = await Freight.deleteMany({ date: validation.data }).exec();
    return res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    return next(error);
  }
});

freightsRouter.delete("/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const freight = await Freight.findByIdAndDelete(req.params.id).lean().exec();
    if (!freight) {
      return res.status(404).json({ message: "Frete não encontrado." });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
