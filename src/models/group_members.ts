import mongoose,{ Schema,Document } from "mongoose";

export interface group_members{
    cid:String;
    group_id:String;
    member_id:String;
    is_admin:Number;
    isleaved:Number;
    add_member_time:any;
    leave_member_time:any;
}

export interface Group_membersModel extends group_members , Document { }

const prepSchema:Schema = new Schema({
    cid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enterprise",
        required: "cid is required"
    },
    group_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "group",
        required: "group_id is required"
    },
    member_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "member_id is required"
    },
    is_admin: {
        type: Number,
        default: 0
    },
    isleaved:{
        type: Number,
        default: 0
    },
    add_member_time:{
        type:Date,
        default:null
    },
    leave_member_time:{
        type:Date,
        default:null
    }
}, {
    timestamps: true
})

    prepSchema.index({isleaved:1,group_id:1,member_id:1,leave_member_time:1})

export default mongoose.model<Group_membersModel>("group_members", prepSchema)