import mongoose,{ Schema,Document } from "mongoose";

export interface message_report{
        cid:String;
        sender_id:String;
        reporter_id:String;
        message:String;
        reason:String;
        group_id:any;
        msg_send_time:Date;
        isRemoved:Number;
}

export interface Message_reportModel extends message_report , Document{}

const prepSchema:Schema = new Schema({
    cid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enterprise",
        required: "cid is required"
    },
    sender_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "report_by is required"
    },
    reporter_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "report_id is required"
    },
    message:{
        type:String,
        required: "message is required"
    },
    reason:{
        type:String,
        required: "reason is required"
    },
    group_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "group",
        default:null
    },
    msg_send_time:{
        type:Date,
        required:"msg_send_time is required"
    },
    isRemoved:{
        type:Number,
        default:0,
    }
}, {
    timestamps: true
})

export default mongoose.model<Message_reportModel>("message_report", prepSchema)