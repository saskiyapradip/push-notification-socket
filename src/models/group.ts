import mongoose, { Schema, Document } from "mongoose";

export interface group {
    cid: String;
    created_by: String;
    group_name: String;
    description: String;
    group_users: String[];
    group_image: String;
    last_message_sender_id: String;
    last_message_type: Number
    last_message: String;
    last_message_time: any;
    last_media_type: Number;
    is_deleted: Number;
    is_admin_send_message: Number;
    public_link: String;
    public_link_expire_time: Date;
    group_leave_members:String[];
}

export interface GroupModel extends group, Document { }

const prepSchema: Schema = new Schema({
    cid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "enterprise",
        required: "cid is required"
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: "created_by is required"
    },
    group_name: {
        type: String,
        required: "group_name is required"
    },
    description: {
        type: String,
        default: ""
    },
    group_users: [{
        type: String
    }],
    group_image: {
        type: String,
        default: ""
    },
    last_message_sender_id: {
        type: String,
        default: ""
    },
    last_message_type: {
        type: Number,
        default: 0
    },
    last_message: {
        type: String,
        default: ""
    },
    last_message_time: {
        type: Date,
        default: null
    },
    last_media_type: {
        type: Number,
        default: 0
    },
    is_deleted: {
        type: Number,
        default: 0
    },
    is_admin_send_message: {
        type: Number,
        default: 0
    },
    public_link: {
        type: String,
        default: ""
    },
    public_link_expire_time: {
        type: Date,
        default: null
    },
    group_leave_members:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        default:null
    }]
}, {
    timestamps: true
})

prepSchema.index({is_deleted:1,group_users:1})

export default mongoose.model<GroupModel>("group", prepSchema);