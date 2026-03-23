import { InferSchemaType, Schema, model } from "mongoose";
import { RECEIVER_OPTIONS, normalizeTaggyName } from "../validation.js";

const freightSchema = new Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
    },
    plate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    client: {
      type: String,
      required: true,
      trim: true,
    },
    loteMotz: {
      type: String,
      required: true,
      trim: true,
    },
    loteAtua: {
      type: String,
      required: true,
      trim: true,
    },
    taggy: {
      type: String,
      required: true,
      trim: true,
      set: (value: string) => normalizeTaggyName(value),
    },
    freightCents: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "freightCents must be an integer.",
      },
    },
    receiver: {
      type: String,
      required: true,
      enum: RECEIVER_OPTIONS,
    },
    observation: {
      type: String,
      trim: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

freightSchema.index({ date: 1 });
freightSchema.index({ date: 1, updatedAt: -1 });

export type FreightDocument = InferSchemaType<typeof freightSchema>;

export const Freight = model("Freight", freightSchema, "freights");
