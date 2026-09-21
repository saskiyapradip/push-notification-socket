import apn from "apn";
import fs from "fs";
import { config } from "../config";
const key_file = process.env.APN_AUTH_KEY ? Buffer.from(process.env.APN_AUTH_KEY.replace(/\\n/g, "\n")) : fs.readFileSync(__dirname + "/AuthKey.p8");
const keyId = config.IOSPUSH.IOSPUSHKEYID 
const teamId = config.IOSPUSH.IOSPUSHTEAMID 
const topic = config.IOSPUSH.IOSPUSHTOPIC
const appprovider: any = new apn.Provider({
	token:{
		keyId:keyId,
		teamId:teamId,
		key:key_file
	},
	production:true
});
const appproviderdebug: any = new apn.Provider({
	token:{
		keyId:keyId,
		teamId:teamId,
		key:key_file
	},
	production:false
});

const sendPushNotificationios = async (title: any, body: any, myTokens: any, mydata: any) => {
	try {
	console.log("send notification function called ios")
	let registrationTokens = [...new Set(myTokens)];

	let notification = new apn.Notification();
    notification.topic = topic;   // Make sure to append .voip here!
	notification.expiry = 10;
	notification.badge = 0;
	notification.sound = "default";
	notification.alert = "Incoming Call";
	notification.priority = 10;
	notification.payload = mydata;
	console.log(mydata.caller_name,"push response ios caller name")
	if(mydata.caller_name=="Dhruti3 QA"){
		let apiresponse:any = await appproviderdebug.send(notification,registrationTokens)
		.then((response:any) => {
		console.log("push response ios : debug ",JSON.stringify(response))
			return response;
	});
		return apiresponse;
	}else{
		let apiresponse:any = await appprovider.send(notification,registrationTokens)
		.then((response:any) => {
			console.log("push response ios",JSON.stringify(response))
				return response;
		});
		return apiresponse;
	}
	
} catch (error:any) {
	console.log("error",error)
}
}

export default sendPushNotificationios;






