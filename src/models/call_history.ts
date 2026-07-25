import mongoose, { Schema, Document } from "mongoose";

interface call_history {
  cid: String;
  caller_id: String;
  reciver_id: String[];
  joined_users: String[];
  leave_users: string[];
  ongoing_users: String[];
  reject_users: String[];
  call_type: Number;
  room_id: String;
  isCallEnded: Number;
  call_start_time: Date;
  call_end_time: Date;
  call_Duration: String;
  call_deleted_users: String[];
  isgroup: Number;
  logs:[Schema.Types.Mixed]
  group_id: String;
}

export interface call_historyModel extends call_history, Document {}

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
      required: "caller_id is required",
    },
    reciver_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "reciver_id is required",
      },
    ],
    joined_users: [
      {
        participant_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          default: null,
        },
        "date-time": {
          type: Date,
          required: true,
        },
      },
    ],
    leave_users: [
      {
        participant_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          default: null,
        },
        "date-time": {
          type: Date,
          required: true,
        },
      },
    ],
    ongoing_users: [
      {
        participant_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "user",
          default: null,
        },
        "date-time": {
          type: Date,
          required: true,
        },
      },
    ],
    reject_users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "reject_users is required",
      },
    ],
    call_type: {
      type: Number,
      default: 0,
    },
    room_id: {
      type: String,
      require: true,
    },
    isCallEnded: {
      type: Number,
      default: 0,
    },
    call_start_time: {
      type: Date,
      default: null,
    },
    call_end_time: {
      type: Date,
      default: null,
    },
    call_Duration: {
      type: String,
      default: "00:00:00",
    },
    call_deleted_users: [
      {
        type: String,
      },
    ],
    isgroup: {
      type: Number,
      default: 0,
    },
    log:{
      type: [Schema.Types.Mixed],
      default: []
    },
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

prepSchema.index({ room_id: 1, caller_id:1, reciver_id:1 }); 

export default mongoose.model<call_historyModel>("call_history", prepSchema);
