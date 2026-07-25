import mongoose, { Schema, Document } from "mongoose";

export interface Enterprise {
    enterprise_name: String;
    enterprise_username: String;
    enterprise_password: String;
    status: String;
    contactAddress: String;
    phoneNumber: String;
    emailAddress: String;
    Logo: String;
    is_deleted:Number;
}

export interface EnterpriseModel extends Enterprise, Document { }

const prepSchema: Schema = new Schema({
    enterprise_name: {
        type: String,
        reauired: "enterprise_name is required"
    },
    enterprise_username: {
        type: String,
        reauired: "enterprise_username is required"
    },
    enterprise_password: {
        type: String,
        required: "enterprise_password is required"
    },
    status: {
        type: String,
        enum: ["A", "N"],
        default: "A"
    },
    contactAddress: {
        type: String,
        default: ""
    },
    phoneNumber: {
        type: String,
        default: ""
    },
    emailAddress: {
        type: String,
        default: ""
    },
    billingAddress: {
        type: String,
        default: ""
    },
    Logo: {
        type: String,
        default: ""
    },
    is_deleted:{
        type:Number,
        default:0
    }
}, {
    timestamps: true
})

    prepSchema.index({enterprise_name:1, is_deleted:1,emailAddress:1,status:1})

export default mongoose.model<EnterpriseModel>("enterprise", prepSchema);