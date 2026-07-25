import mongoose,{ Schema,Document } from "mongoose";

export interface user_admin{
    eid:any,
    user_name:String,
    userName:String,
    name:String,
    user_email:String,
    user_password:String,
    user_image:String,
    user_status:Number,
    user_mobileNumber:String,
    user_address:String,
    is_deleted:Number,
    user_type:Number,
    accessgroup:any,
    selected_Enterprise:any;
    access_profile_type:Number;
    is_online:Number;
    last_login_time:any;
}

export interface User_adminModel extends user_admin , Document {}

const prepSchema:Schema = new Schema({
    eid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enterprise",
        default:null
      },
    user_name: {
        type: String,
        required: "user_name is required"
    },
    userName:{
        type: String,
        required: "userName is required"
    },
    name:{
        type: String,
        required: "name is required"
    },
    user_email: {
        type: String,
        required: "user_email is required"
    },
    user_password: {
        type: String,
        required: "user_password is required"
    },
    user_image: {
        type: String,
        default: ""
    },
    user_status:{
        type: Number,
        default:1
    },
    user_mobileNumber:{
        type:String,
        require:true
    },
    user_address:{
        type:String,
        default: ""
    },
    is_deleted: {
        type: Number,
        default: 0
    },
    user_type:{
        type: Number,
        enum: [1, 2, 3],
        require: true
    },
    accessgroup:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "accessgroup",
        default:null
    },
    selected_Enterprise:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enterprise",
        default:null
        }
    ],
    access_profile_type:{
        type:Number,
        enum:[0,1,2], //1 for root and 2 for  enterprise 
        default:0
    },
    is_online:{
        type:Number,
        default:0
    },
    last_login_time:{
        type:Date,
        default:null
    }
}, {
    timestamps: true
})

prepSchema.index({accessgroup:1,user_type:1,user_email:1,is_deleted:1,user_password:1,eid:1,selected_Enterprise:1,name:1})

export default mongoose.model<User_adminModel>("user_admin", prepSchema);