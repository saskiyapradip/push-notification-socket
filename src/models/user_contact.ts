import mongoose, { Document, Schema } from "mongoose";

export interface UserContact {
  uid: String;
  contacts: String;
}

export interface UserContactModel extends UserContact, Document {}

const UserContactSchema: Schema = new Schema(
  {
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    contacts: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<UserContactModel>("user_contact", UserContactSchema);
