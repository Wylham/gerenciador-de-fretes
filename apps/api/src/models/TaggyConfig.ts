import { InferSchemaType, Schema, model } from "mongoose";
import { DEFAULT_TAGGY_OPTIONS } from "../validation.js";

const TAGGY_CONFIG_KEY = "default";

const taggyConfigSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: TAGGY_CONFIG_KEY,
      trim: true,
    },
    taggyOptions: {
      type: [String],
      default: () => [...DEFAULT_TAGGY_OPTIONS],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

taggyConfigSchema.index({ key: 1 }, { unique: true });

export type TaggyConfigDocument = InferSchemaType<typeof taggyConfigSchema>;

export const TaggyConfig = model("TaggyConfig", taggyConfigSchema, "taggy_config");

export async function ensureTaggyConfig() {
  const config = await TaggyConfig.findOneAndUpdate(
    { key: TAGGY_CONFIG_KEY },
    {
      $setOnInsert: {
        key: TAGGY_CONFIG_KEY,
        taggyOptions: [...DEFAULT_TAGGY_OPTIONS],
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).exec();

  if (!config) {
    throw new Error("Falha ao carregar a configuracao de taggys.");
  }

  return config;
}
