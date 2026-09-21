import http from "http";
import HttpProxy from "http-proxy";
import { config } from "./src/config";
import mongoose from "mongoose";
import { connect } from "./src/socket";
import cron from 'node-cron';
import fs from "fs";
//import { converScheduleToRegularMsg, mutenotificationEnable, messagedisappear, GroupInviteLinkExpire } from "./src/controller/cronCtrl";


HttpProxy.createProxyServer({
  target: "https://localhost:8808",
  ws: true,
  secure: true
}).listen(89, "0.0.0.0");

mongoose.connect(config.mongo.uri, {
  dbName: config.db.dbname,
}).then(() => console.log("mongo db conneccted")).catch((error) => console.log("db not connected", error))

// const httpsOptions:any = {
//   cert:fs.readFileSync('./cert/cert.crt'),
//   key:fs.readFileSync('./cert/privkey.key')
// }

const server = http.createServer();
connect(server)
//connectMediasup()

cron.schedule("*/1 * * * *", () => {
  if (config.enviroment.enviroment_type === "production") {
    //console.log("cron called")
    //converScheduleToRegularMsg();
    //mutenotificationEnable();
    //messagedisappear();
    //GroupInviteLinkExpire();
  }
});
server.listen(config.server.port, function () {
  console.log(`WTS Chat socket Backend........${config.server.port}`);
});
