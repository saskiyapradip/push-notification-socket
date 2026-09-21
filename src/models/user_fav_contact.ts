import mongoose, { Document, Schema } from "mongoose";

export interface favcontact {
  eid:String;
  uid: String;
  contact_name:String;
  contact_number:String;
  contact_unfavorite:any;
  contact_image:String;
  user_id:String;
}

export interface favcontactModel extends favcontact, Document {}

const favcontact: Schema = new Schema(
  {
    eid:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "enterprise",
      default:null
    },
    uid:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    user_id:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required:"user_id is required"
    }
  },
  {
    timestamps: true,
  }
);

favcontact.index({uid:1})

export default mongoose.model<favcontactModel>("user_fav_contact", favcontact);