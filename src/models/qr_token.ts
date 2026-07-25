import mongoose, { Schema, Document } from "mongoose";

export interface qr_token {
  device_id: string;
  socket_id: string;
  token: string;
}

export interface QrTokenModel extends qr_token, Document {}

const qrTokenSchema: Schema = new Schema(
  {
    device_id: {
      type: String,
      required: "device_id is required",
    },
    socket_id: {
      type: String,
      required: "socket_id is required",
    },
    token: {
      type: String,
      required: "token is required",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<QrTokenModel>("qr_token", qrTokenSchema);
