import { Router } from "express";
import { ensureTaggyConfig, TaggyConfig } from "../models/TaggyConfig.js";
import { validateTaggyOptionName } from "../validation.js";

export const taggiesRouter = Router();

taggiesRouter.get("/", async (_req, res, next) => {
  try {
    const config = await ensureTaggyConfig();
    return res.json({ taggyOptions: config.taggyOptions });
  } catch (error) {
    return next(error);
  }
});

taggiesRouter.post("/", async (req, res, next) => {
  try {
    const validation = validateTaggyOptionName(req.body?.name);
    if (!validation.data) {
      return res.status(400).json({
        message: "Dados inv\u00e1lidos para criar Taggy.",
        errors: validation.errors,
      });
    }

    const config = await ensureTaggyConfig();
    const updatedConfig = await TaggyConfig.findOneAndUpdate(
      { _id: config._id, taggyOptions: { $ne: validation.data } },
      { $addToSet: { taggyOptions: validation.data } },
      { new: true },
    ).exec();

    if (!updatedConfig) {
      return res.status(409).json({
        message: "Essa Taggy j\u00e1 est\u00e1 cadastrada.",
        errors: { name: "Essa Taggy j\u00e1 est\u00e1 cadastrada." },
      });
    }

    return res.status(201).json({
      taggy: validation.data,
      taggyOptions: updatedConfig.taggyOptions,
    });
  } catch (error) {
    return next(error);
  }
});

taggiesRouter.delete("/:name", async (req, res, next) => {
  try {
    const validation = validateTaggyOptionName(req.params.name);
    if (!validation.data) {
      return res.status(400).json({
        message: "Nome de Taggy inv\u00e1lido.",
        errors: validation.errors,
      });
    }

    const config = await ensureTaggyConfig();
    const updatedConfig = await TaggyConfig.findOneAndUpdate(
      { _id: config._id, taggyOptions: validation.data },
      { $pull: { taggyOptions: validation.data } },
      { new: true },
    ).exec();

    if (!updatedConfig) {
      return res.status(404).json({ message: "Taggy n\u00e3o encontrada." });
    }

    return res.json({
      taggy: validation.data,
      taggyOptions: updatedConfig.taggyOptions,
    });
  } catch (error) {
    return next(error);
  }
});
