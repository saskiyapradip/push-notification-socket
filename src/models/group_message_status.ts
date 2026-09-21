import mongoose, { Schema,Document }   from "mongoose";

export interface group_message_status{
    cid:String;
    group_id:String;
    message_id:String;
    sender_id:String;
    receiver_id:String;
    delivery_time:any;
    read_time:any;
    delivery_type:Number;
}

export interface Group_message_statusModel extends group_message_status , Document {}

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
    message_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "group_conversation",
        required: "message_id is required"
    },
    sender_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "sender_id is required"
    },
    receiver_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "receiver_id is required"
    },
    delivery_time: {
        type: Date,
        default:null
    },
    read_time: {
        type: Date,
        default:null
    },
    delivery_type: {
       type:Number,
       default:1
    }
}, {
    timestamps: true
})

prepSchema.index({delivery_type:1,receiver_id:1,message_id:1,sender_id:1,group_id:1})

export default mongoose.model<Group_message_statusModel>("group_message_status", prepSchema);