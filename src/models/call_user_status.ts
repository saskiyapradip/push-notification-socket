import mongoose, { Schema, Document } from "mongoose";

interface call_user_status {
  cid: String;
  caller_id: String;
  room_id: String;
  ismuted: Number,
  isvideopaused: Number
}

export interface call_user_statusModel extends call_user_status, Document { }

const prepSchema: Schema = new Schema(
  {
    cid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
      required: "cid is required",
    },
    caller_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: "caller_id is required"
    },
    room_id: {
      type: String,
      required: "room_id is required"
    },
    ismuted: {
      type: Number,
      default: 0
    },
    isvideopaused: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
  }
);

prepSchema.index({cid:1,room_id:1,caller_id:1})

export default mongoose.model<call_user_statusModel>("call_user_status", prepSchema);

