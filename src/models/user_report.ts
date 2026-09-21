import mongoose, { Schema,Document } from "mongoose";

export interface user_report{
        cid:String;
        isGroup:Number;
        report_by:String;
        report_id:String;
        reason:String;
}

export interface User_reportModel extends user_report , Document {}

const prepSchema:Schema = new Schema(
    {
        cid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "enterprise",
            required: "cid is required"
        },
        isGroup: {
            type: Number,
            default: 0
        },
        report_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: "report_by is required"
        },
        report_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: "report_id is required"
        },
        reason:{
            type:String,
            required:"reason is required"
        }
    }, {
        timestamps: true
    }
)


export default mongoose.model<User_reportModel>("user_report", prepSchema) 