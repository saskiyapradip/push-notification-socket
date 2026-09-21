import mongoose, { Schema, Document } from "mongoose";

export interface user_block {
  cid: String;
  block_by: String;
  block_id: String;
  block_date: any;
}

export interface User_blockModel extends user_block, Document { }
const prepSchema: Schema = new Schema(
  {
    cid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "enterprise",
      required: "cid is required",
    },
    block_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: "block_by is required",
    },
    block_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: "block_id is required",
    },
    block_date: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

prepSchema.index({block_id:1,block_by:1,})

export default mongoose.model<User_blockModel>("user_block", prepSchema)