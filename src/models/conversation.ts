import mongoose, { Schema, Document } from "mongoose";

export interface conversation {
  cid: String;
  sender_id: String;
  receiver_id: String;
  broadcast_id: String;
  broadcast_msg_id: String;
  originalName: String;
  message: String;
  message_caption:String;
  message_type: Number;
  media_type: Number;
  delivery_type: Number;
  reply_message_id: String;
  schedule_time: any;
  block_message_users: String[];
  delete_message_users: String[];
  is_deleted: Number;
  message_dissapear_time: any;
  is_edited: Number;
  tmp_message_id: String;
}

export interface conversationModel extends conversation, Document { }

const prepSchema: Schema = new Schema({
  cid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "enterprise",
    required: "cid is required",
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: "sender_id is required",
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: "receiver_id is required",
  },
  broadcast_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "broadcast_users",
    default: null
  },
  broadcast_msg_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "broadcast_conversation",
    default: null
  },
  originalName: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
  message_caption:{
    type: String,
    default: "",
  },
  message_type: {
    type: Number,
    default: 0,
  },
  media_type: {
    type: Number,
    default: 0,
  },
  delivery_type: {
    type: Number,
    default: 1,
  },
  reply_message_id: {
    type: String,
    default: "",
  },
  schedule_time: {
    type: Date,
    default: null,
  },
  block_message_users: [
    {
      type: String,
    },
  ],
  delete_message_users: [
    {
      type: String,
    },
  ],
  is_deleted: {
    type: Number,
    default: 0,
  },
  message_dissapear_time: {
    type: Date,
    default: null
  },
  is_edited: {
    type: Number,
    default: 0,
  },
  tmp_message_id: {
    type: String,
    default: "",
    unique: true
  },
},
  {
    timestamps: true,
  })

prepSchema.index({ createdAt: 1, message_type: 1, delivery_type: 1, receiver_id: 1, sender_id: 1, is_deleted: 1, delete_message_users: 1, is_edited: 1, tmp_message_id:1})

export default mongoose.model<conversationModel>("conversation", prepSchema);