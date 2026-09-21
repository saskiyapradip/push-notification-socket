import admin from "firebase-admin";


admin.initializeApp({
	credential: admin.credential.cert({
		projectId: process.env.FIREBASE_PROJECT_ID,
		clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
		privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
	} as admin.ServiceAccount)
});
const sendPushNotification = async (title: any, body: any, myTokens: any, mydata: any, isMutable:any = 1) => {
	console.log(title,"send notification function called")
	try {
	let mydataobj: any = {};
  try {
    if (typeof mydata?.message === "string") {
      mydataobj = JSON.parse(mydata.message);
    } else if (typeof mydata?.message === "object") {
      mydataobj = mydata.message;
    } else {
      mydataobj = {};
    }
  } catch (err) {
    console.error("Error parsing mydata.message:", err);
    mydataobj = {};
  }

  console.log("send notification function called");
	let registrationTokens = [...new Set(myTokens)];
	let message: any = {
    notification: {
      title: title,
      body: body,
    },
    data: mydata,
    tokens: registrationTokens,
    android: {
      priority: "High",
    },
    apns: {
	  headers: {
        "apns-collapse-id": String(mydataobj?._id || Date.now()),
      },
      payload: {
        aps: {
          "mutable-content": isMutable,
        },
      },
    },
  };
	let sendadroidpush:any = await admin.messaging().sendEachForMulticast(message)
		.then((response:any) => {
			console.log("push response",JSON.stringify(response))
			return response;
		});
	return sendadroidpush;
	} catch (error:any) {
		console.log("error",error)
	}
}

export default sendPushNotification;






