import mongoose, { Document, Schema } from "mongoose";

export interface User {
  eid: String;
  emailAddress:String;
  MobileNumber:String;
  first_name: String;
  last_name: String;
  password: String;
  user_image: String;
  is_deleted: Number;
  is_online: Number;
  conversation_deleted_users: String;
  last_seen: Date;
  user_name:String;
  web_restore_date:Date;
  keep_message:Boolean;}

export interface UserModel extends User, Document { }

const UserSchema: Schema = new Schema({
  eid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "enterprise",
    default:null
  },
  emailAddress:{
    type:String,
    default:"emailAddress is required"
  },
  MobileNumber:{
    type:String,
    default:"MobileNumber is required"
  },
  first_name: {
    type: String,
    required: "first_name is required",
  },
  last_name: {
    type: String,
    required: "last_name is required",
  },
  password: {
    type: String,
    required: "password is required",
  },
  user_image: {
    type: String,
    default: "",
  },
  is_deleted: {
    type: Number,
    default: 0,
  },
  is_online: {
    type: Number,
    default: 0,
  },
  conversation_deleted_users: [{
    type: String
  }],
  last_seen: {
    type: Date,
    default: null
  },
  user_name:{
    type:String,
    required: "user_name is required",
  },
  web_restore_date:{
    type:Date,
    default:null
  },
  keep_message:{
    type:Boolean,
    default:false
  },
},
  {
    timestamps: true,
  });

  UserSchema.index({is_deleted:1,eid:1,MobileNumber:1,emailAddress:1,is_online:1,user_name:1,last_name:1,first_name:1,conversation_deleted_users:1})

export default mongoose.model<UserModel>("user", UserSchema);


