import user from "./models/user";
import group from "./models/group";
import conversation from "./models/conversation";
import group_conversation from "./models/group_conversation";
import user_report from "./models/user_report";
import group_message_status from "./models/group_message_status";
import message_report from "./models/message_report";
import group_members from "./models/group_members";
import { MESSAGE } from "./constant";
import moment from "moment";
import { Server } from "socket.io";
import user_block from "./models/user_block";
import sendPushNotification from "./helper/sendPushNotification";
import call_history from "./models/call_history";
import user_tokens from "./models/user_tokens";
import notification_setting_users from "./models/notification_setting_users";
import call_user_status from "./models/call_user_status";
import mongoose from "mongoose";
import { v1 as uuidv1, v4 as uuidv4 } from 'uuid';
import { config } from "./config";
import sendPushNotificationios from "./helper/sendPushNotificationios";
import { isAuthorized } from "./helper/isAuth";
import { isAuthorizedGroup } from "./helper/isAuthGroup";
import jwt from "jsonwebtoken";
import qr_token from "./models/qr_token";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { statusManage } from "./helper/statusManage";
import { decryptData, encryptData, encryptDataname } from "./helper/crypto";


// const rateLimiter = new RateLimiterMemory({
//   points: 500,   // 5 messages
//   duration: 1 // per 1 seconds
// });

let io: any;
let socket_users: any[] = [];
let node_users:any[] = [];
let web_users:any[]=[];
let recent_messages:any[]=[]


export const connect = async (server: any) => {
  io = new Server(server, {
    allowEIO3: true,
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", async (socket: any) => {
    socket.setMaxListeners(500)
    console.log(socket_users,"socket_users connected users")
    let connection_uid:any;
    let connection_cid:any;
    let connection_device_id:any;
    let connection_mode:any = socket.handshake.query.mode;
    let token:any;
    // token = socket.handshake.headers.token
    token = socket.handshake.auth.authorization;

    if (!token || token == undefined) {
      // return next(new Error("Authentication error: Authentication failed"));
    }
    
    const tokenData = await user_tokens.findOne({
      token:token
    })
    if(!tokenData){
      console.log("Authentication error: incorrect token")
      // return next(new Error("Authentication error: incorrect token"));
    }

    let decoded:any;
    if (token) {
      try {
        let token_decrypted:any = decryptData(token)
        if (typeof token_decrypted !== "string") {
        token_decrypted = token_decrypted.toString();
        }

        token_decrypted = token_decrypted.replace(/\r?\n|\r/g, "").trim();

        token_decrypted = Buffer.from(token_decrypted, "utf8").toString();

        console.log("Decrypted token (debug):", JSON.stringify(token_decrypted));

        decoded = jwt.verify(token_decrypted, config.key.secret_key);
      } catch (error:any) {
        console.log("Authentication error:", error.message);
      }
      console.log(decoded,"decoded")
      connection_uid = decoded.uid;
      connection_cid = decoded.eid;
      connection_device_id = decoded.device_id;
      
      socket.data.uid = decoded.uid;
      socket.data.cid = decoded.eid;
      socket.data.device_id = decoded.device_id;
    }


    // console.log(connection_cid,connection_uid,connection_device_id,"connection perameters")
    // console.log(socket.handshake.query.cid,socket.handshake.query.uid,socket.handshake.query.device_id,socket.handshake.query.last_message_time,"socket query params log")
    try {
   if (socket.handshake.query.device_id) {
     const device_id = socket.handshake.query.device_id;
  const qr_login_token: any = jwt.sign({ device_id }, config.key.secret_key, {
         expiresIn: "45s",
  });
  const encrypted_qr_login_token = encryptData(qr_login_token)

     const isDeviceExisit: any = await qr_token.findOne({
       device_id: device_id,
     });
     if (isDeviceExisit) {
       const updateToken = await qr_token.findOneAndUpdate(
         {
           device_id: device_id,
         },
         {
           socket_id: socket.id,
           token: encrypted_qr_login_token,
         }
       );
     } else {
       const newPost = new qr_token({
         device_id: device_id,
         socket_id: socket.id,
         token: encrypted_qr_login_token,
       });
       const saved = await newPost.save();
     }

    //  if (existingIndex !== -1) {
    //    web_users[existingIndex].socket_id = socket.id;
    //    web_users[existingIndex].token = qr_login_token;
    //  } else {
    //    web_users.push({
    //      device_id,
    //      socket_id: socket.id,
    //      token: qr_login_token,
    //    });
    //  }
     // io.to(socket.id).emit("ack_get_qr_token", {
     //         token:qr_login_token
     // });

     socket.on("get_qr_token", async (data: any, callback: any) => {
       try {
         const new_qr_login_token: any = jwt.sign(
           { device_id },
           config.key.secret_key,
           { expiresIn: "45s" }
         );
         const encrypted_new_qr_login_token = encryptData(new_qr_login_token)

         // const userIndex = web_users.findIndex((u: any) => u.device_id === device_id);
        //  const userIndex = web_users.findIndex(
        //    (u: any) => u.socket_id === socket.id
        //  );
         const updateQrtoken = await qr_token.findOneAndUpdate(
           {
             socket_id: socket.id,
           },
           {
             token: encrypted_new_qr_login_token,
           }
         );
        //  if (userIndex !== -1) {
        //    web_users[userIndex].token = new_qr_login_token;
        //    // web_users[userIndex].socket_id = socket.id;
        //  }
         io.to(socket.id).emit("ack_get_qr_token", {
           token: encrypted_new_qr_login_token,
         });
       } catch (error: any) {
         console.log(error, "get_qr_token error");
       }
     });
   }
    else if(!socket.handshake.query.cid && !socket.handshake.query.uid && !socket.handshake.query.device_id && !socket.handshake.query.last_message_time && socket.handshake.auth.token === config.NODECONNECTION.SOCKET_TOKEN){
      node_users.push(socket.id)
      console.log(node_users,"connected into if part")
      }else{
        console.log(socket.handshake.query.last_message_time,"last_message_time")
        if (connection_cid != null && connection_cid != undefined && connection_uid != null && connection_uid != undefined && connection_cid && connection_uid
          && connection_uid.length !== 0 && connection_cid.length !== 0 && connection_device_id != null && connection_device_id != undefined
          // && socket.handshake.query.last_message_time != null  && socket.handshake.query.last_message_time != undefined
        ) {
            console.log("socket.handshake.query.uid", connection_uid)
       var socket_obj = {
         cid: connection_cid,
         uid: connection_uid,
         socket_id: socket.id,
         device_id:connection_device_id,
         mode:connection_mode
       };
       console.log(socket.handshake.query.last_message_time,"socket.handshake.query.last_message_time")
       const online_uids = socket_users.map((user) => user.uid);

      //  const update_online_status = await user.updateMany(
      //    {
      //      eid: connection_cid,
      //      _id: { $nin: online_uids },
      //      is_online: 1,
      //    },
      //    {
      //      $set: { is_online: 0 },
      //    }
      //  );
          const is_validUser =await user_tokens.findOne({
            device_id : connection_device_id,
            uid:connection_uid
          })
          if(!is_validUser){
            console.log("connection loss because user id , device id not match")
            socket.disconnect(true)
         return;
       }

         let create_uid:any =new mongoose.Types.ObjectId(connection_uid) 
      //     let update_to_online = await user_tokens.findOneAndUpdate({
      //       device_id:connection_device_id
      //     },
      //     {
      //       is_online:1
      //     }
      //     )
      //     let user_detail:any = await user.findByIdAndUpdate(
      //    {
      //      _id: create_uid,
      //    },
      //    {
      //         is_online: 1
      //    },
      //    {
      //      new: true,
      //      runValidators: true,
      //    }
      //  );
      let user_detail:any;
      if(connection_mode != "Background"){
        user_detail= await statusManage(connection_uid,connection_device_id,1)
      }
      //  console.log(user_detail,"new online user detail")
      let find_user_already:any []= [];
      try {
        find_user_already=  socket_users.filter(rows=>rows.device_id.toString() == connection_device_id.toString() && rows.uid.toString() == connection_uid.toString() && rows.mode == connection_mode)
      } catch (error: any) {
      console.error("[socket.ts] error:", error);
    }

         if(find_user_already.length == 0){
         
          socket_users.push(socket_obj)
         }else{
         
          let check_user_already = socket_users.filter(
            (rows) =>
              !(
                rows.device_id.toString() === connection_device_id.toString() &&
                rows.uid.toString() === connection_uid.toString() &&
                rows.mode === connection_mode
              )
          );


          socket_users = check_user_already
          socket_users.push(socket_obj)
       }

       const mySocketIds: any[] = [];
          const MySocketid: any[] = []
       await Promise.all(
         socket_users.map(async (item) => {
              if (
                item.uid !== connection_uid &&
                item.cid === connection_cid
              ) {
             mySocketIds.push(item.socket_id);
           }
              if (item.uid == connection_uid &&
                item.cid === connection_cid) {
             MySocketid.push(item.socket_id);
           }
         })
       );
       let post = {
         _id: connection_uid,
         is_online: 1,
         last_seen: null,
            first_name:user_detail ? user_detail.first_name : "",
            last_name:user_detail ? user_detail.last_name : "",
            user_name:user_detail ? user_detail.user_name : "",
            user_image:user_detail ? user_detail.user_image : "",
       };
       if (mySocketIds.length > 0 && connection_mode!="Background") {
          // console.log("debug post data diff issue", post)
         io.to(mySocketIds).emit("send_online_status", post);
       }
          let tmp_date:any = moment(socket.handshake.query.last_message_time,"YYYY-MM-DDTHH:mm:ss.sss").isValid();
          // console.log("tmp_date",tmp_date)
          if(tmp_date){
            // console.log("date if call")
            setTimeout(async () => {
              try {
                // one - to - one
                const messages = await conversation
                  .find(
                    {
                      receiver_id: connection_uid,
                      updatedAt: {
                        $gte: moment(
                          socket.handshake.query.last_message_time,
                          "YYYY-MM-DDTHH:mm:ss.sss"
                        ),
                      },
                      is_deleted: 0,
                      delete_message_users: { $ne: connection_uid },
                    },
                    {
                      sender_id: 1,
                      delivery_type: 1,
                    }
                  )
                  .lean();

                // 2) Group + compute read status in ONE loop
                const result: any = {}; // { sender_id: { total, read, ids[] } }

                for (const msg of messages) {
                  const sid = msg.sender_id.toString();

                  if (!result[sid]) {
                    result[sid] = { total: 0, read: 0, ids: [] };
                  }

                  result[sid].total++;
                  if (msg.delivery_type === 3) {
                    result[sid].read++;
                    result[sid].ids.push(msg._id);
                  }
                }

                // 3) Send optimized socket events
                for (const sender_id in result) {
                  const info = result[sender_id];

                  if (info.total === info.read) {
                    // ALL read
                    console.log(
                      socket.id,
                      connection_uid,
                      "ack_read_all_delivered_message on socket connection"
                    );
                    io.to(socket.id).emit("ack_read_all_delivered_message", {
                      uid: connection_uid,
                      recevier_id: sender_id,
                      isgroup: 0,
                      cid: connection_cid,
                      message_sender_id_arr: result[sender_id].ids,
                    });
                  } else if (info.read > 0) {
                    console.log(
                      connection_uid,
                      sender_id,
                      result[sender_id],
                      "not all meassage read"
                    );
                    // SOME read
                    // socket.emit("ack_read_partial", {
                    //   sender_id,
                    //   receiver_id: connection_uid,
                    //   read_messages: info.ids
                    // });
                  }
                  // NONE read → skip
                }

                // for group message
                // const groupMessages = await group_message_status
                //   .find(
                //     {
                //       receiver_id: connection_uid,
                //       updatedAt: {
                //         $gte: moment(
                //           socket.handshake.query.last_message_time,
                //           "YYYY-MM-DDTHH:mm:ss.sss"
                //         ),
                //       },
                //     },
                //     {
                //       group_id: 1,
                //       sender_id: 1,
                //       delivery_type: 1,
                //       message_id: 1,
                //     }
                //   )
                //   .lean();

                // const groupResult: any = {};
                // // {
                // //   group_id: {
                // //     total,
                // //     read,
                // //     message_ids: []
                // //   }
                // // }

                // for (const msg of groupMessages) {
                //   const gid = msg.group_id.toString();

                //   if (!groupResult[gid]) {
                //     groupResult[gid] = {
                //       total: 0,
                //       read: 0,
                //       message_ids: [],
                //     };
                //   }

                //   groupResult[gid].total++;

                //   if (msg.delivery_type === 3) {
                //     groupResult[gid].read++;
                //     groupResult[gid].message_ids.push(msg.message_id);
                //   }
                // }
                // for (const group_id in groupResult) {
                //   const info = groupResult[group_id];

                //   if (info.total === info.read) {
                //     // ✅ ALL read by this user in this group
                //     console.log(
                //       socket.id,
                //       connection_uid,
                //       "ack_read_all_delivered_message"
                //     );

                //     io.to(socket.id).emit("ack_read_all_delivered_message", {
                //       uid: connection_uid,
                //       group_id: group_id,
                //       isgroup: 1,
                //       cid: connection_cid,
                //       message_ids: info.message_ids,
                //     });
                //   } else if (info.read > 0) {
                //     // 🟡 SOME read
                //     // Optional partial read event
                //     // socket.emit("ack_group_read_partial", {
                //     //   group_id,
                //     //   uid: connection_uid,
                //     //   message_ids: info.message_ids
                //     // });
                //   }
                //   // ❌ NONE read → skip
                // }
              } catch (error) {
                console.log(
                  error,
                  "error in socket connection read all message"
                );
              }
              // 1) Fetch only required fields (smaller payload, faster query)
            }, 3000);
            let last_message_time:any = moment(socket.handshake.query.last_message_time,"YYYY-MM-DDTHH:mm:ss.sss").format("YYYY-MM-DDTHH:mm:ss.sssZ")
            let get_year:any = moment(last_message_time,"YYYY-MM-DDTHH:mm:ss.sssZ").format("YYYY")
            let get_month:any = moment(last_message_time,"YYYY-MM-DDTHH:mm:ss.sssZ").format("MM")
            let get_day:any = moment(last_message_time,"YYYY-MM-DDTHH:mm:ss.sssZ").format("DD")
            let get_hour:any = moment(last_message_time,"YYYY-MM-DDTHH:mm:ss.sssZ").format("HH")
            let get_minutes:any = moment(last_message_time,"YYYY-MM-DDTHH:mm:ss.sssZ").format("mm")
            let get_seconds:any = moment(last_message_time,"YYYY-MM-DDTHH:mm:ss.sssZ").format("ss")
            let get_miliseconds:any = moment(last_message_time,"YYYY-MM-DDTHH:mm:ss.sssZ").format("sss")

            let get_int_month:any = parseFloat(get_month) - 1
         //console.log("get_int",get_int_month)

           
           let new_tmp_date:any = new Date();
           new_tmp_date.setUTCFullYear(get_year)
           new_tmp_date.setUTCMonth(get_int_month)
           new_tmp_date.setUTCDate(get_day)
           new_tmp_date.setUTCHours(get_hour)
           new_tmp_date.setUTCMinutes(get_minutes)
           new_tmp_date.setUTCSeconds(get_seconds)
           new_tmp_date.setUTCMilliseconds(get_miliseconds)
           last_message_time = new_tmp_date
           last_message_time = new Date(last_message_time)

         const getSenderList = await conversation.find({
           is_deleted: 0,
            $or: [
              { receiver_id: create_uid },
              { sender_id:create_uid }
            ],
           delete_message_users: { $ne: create_uid },
            createdAt:{$gt:new Date(last_message_time)}
         });
          // console.log("getSenderList",getSenderList)
          let get_group_msg: any[] = await group_message_status.find({
            $or: [
              { receiver_id: create_uid },
              { sender_id:create_uid }
            ],
            createdAt:{$gte:new Date(last_message_time)}
          }).distinct("message_id")

         let get_group_mes_detail: any[] = await group_conversation.find({
           _id: { $in: get_group_msg },
           delete_message_users: { $ne: create_uid },
            createdAt:{$gte:new Date(last_message_time)}
          })
         // console.log("group messages",get_group_mes_detail)
         const myACKSocketIds: any[] = [];
         await Promise.all(
           socket_users.map(async (item) => {
              if (item.uid.toString() === create_uid.toString() && item.cid.toString() === connection_cid.toString() && item.device_id.toString() === connection_device_id.toString()) {
               myACKSocketIds.push(item.socket_id);
             }
           })
         );
         if (myACKSocketIds.length > 0) {
            if(getSenderList.length > 0){
             await Promise.all(
               getSenderList.map(async (item: any) => {
                 let get_user_detail: any = await user.findOne({
                    _id: item.sender_id
                  })

                 socket_users.map(async (row: any) => {
                    if (!item.delete_message_users.includes(row.uid.toString()) && row.uid.toString() === item.receiver_id.toString() && row.uid.toString() != item.sender_id && row.cid.toString() === item.cid.toString()  && row.device_id.toString() === connection_device_id.toString()) {
                     
                     let post: any = item.toObject();
                      let sender_detail:any = {
                        name:encryptDataname(get_user_detail.first_name ,get_user_detail.last_name,get_user_detail.eid),
                        image:get_user_detail.user_image
                      }

                     io.to(row.socket_id).emit("receive_message", {
                          message_detail:post,
                          isgroup:0,
                          sender_detail:sender_detail
                     });
                      
                   }
                    if (!item.delete_message_users.includes(row.uid.toString()) && row.uid.toString() !== item.receiver_id.toString() && row.uid.toString() === item.sender_id.toString() && row.cid.toString() === item.cid.toString()  && row.device_id.toString() === connection_device_id.toString()) {
                      let get_user_detail_sender:any = await user.findById({
                        _id:item.receiver_id,
                      })
                       let originalName_sender:any = "";
                      if(get_user_detail_sender){
                        originalName_sender = encryptDataname(get_user_detail_sender.first_name ,get_user_detail_sender.last_name,get_user_detail_sender.eid);
                     }
                     let post: any = item.toObject();
                      post.receiver_nm = originalName_sender
                      let sender_detail:any = {
                        name:encryptDataname(get_user_detail.first_name,get_user_detail.last_name,get_user_detail.eid),
                        image:get_user_detail.user_image
                      }

                     io.to(row.socket_id).emit("ack_send_message", {
                          message_detail:post,
                          isgroup:0,
                          sender_detail:sender_detail
                     });
                      
                   }
               })
                }))
           }

            if(get_group_mes_detail.length > 0){
             await Promise.all(
               get_group_mes_detail.map(async (item: any) => {
                 let get_group_dteail: any = await group.findById({
                    _id: item.group_id
                  })
                 socket_users.map(async (row: any) => {
                    if (get_group_dteail.group_users.includes(row.uid.toString()) && row.uid.toString() != item.sender_id && row.cid.toString() === item.cid.toString() && row.device_id.toString() === connection_device_id.toString()) {
                     let post: any = item.toObject();
                      let get_sender_detail:any = await user.findById({
                        _id:item.sender_id,
                        is_deleted:0
                      }).select("first_name last_name")

                      if(get_sender_detail){
                        post.sender_id = get_sender_detail
                     }
                      let sender_detail:any = {
                        name:get_group_dteail.group_name,
                        image:get_group_dteail.group_image
                      }
                     io.to(row.socket_id).emit("receive_message", {
                        message_detail:post,
                        isgroup:1,
                        sender_detail:sender_detail
                     });
                   }
                    if (get_group_dteail.group_users.includes(row.uid.toString()) && row.uid.toString() === item.sender_id.toString() && row.cid.toString() === item.cid.toString() && row.device_id.toString() === connection_device_id.toString()) {
                     let post: any = item.toObject();
                      let get_sender_detail:any = await user.findById({
                        _id:item.sender_id
                      }).select("first_name last_name")

                      if(get_sender_detail){
                        post.sender_id = get_sender_detail
                     }
                      let sender_detail:any = {
                        name:get_group_dteail.group_name,
                        image:get_group_dteail.group_image
                      }
                     io.to(row.socket_id).emit("ack_send_message", {
                        message_detail:post,
                        isgroup:1,
                        sender_detail:sender_detail
                     });
                   }
                  })
                }))
           }
         }
       }
        }else{
          console.log("not valid for connection")
          socket.disconnect()
     }
   }

      socket.on("send_message",async (data:any) =>{
        try {
          console.log("send message socket called 54525", data)
          if (!node_users.includes(socket.id)) {
          if(data.isgroup){
            console.log("into send message 6565652")
            socket.data.uid = connection_uid
           const isValid = await isAuthorizedGroup(
            data.group_id,
            data.sender_id,
            socket
           ) 
           console.log(isValid,"isVild check 51545")
           if (!isValid) {
            console.log("into if part disconnect")
              socket.disconnect()
              return;
           }
          }else{
            console.log(connection_uid,data.sender_id,"sockett id datat pass for auth 1548484")
            const isValid = await isAuthorized(
              data.sender_id,
              socket.data.uid,
              socket
            );
            console.log(isValid,"into send message not group 6565652")
            if (!isValid) {
              console.log("not valid into not group 6561")
              socket.disconnect()
              return;
            }
          }}
          if(data.isgroup){
            const groupData:any = await group.findOne({
              is_deleted:0,
              _id:data.group_id
            })
            const is_admin_send_message = groupData.is_admin_send_message
            if(is_admin_send_message){
              const isAdmin = await group_members.find({
                  group_id: data.group_id,
                  is_admin: 1,
                  member_id: connection_uid,
                });
                if (isAdmin.length == 0) {
                  console.log("only admin can send message log 1111")
                  socket.disconnect();
                  return;
                }
            }
          }
          console.log("send_message socket emited",data)
            let isgroup:any = data.isgroup
            let cid:any = data.cid
            let sender_id:any = data.sender_id
            let receiver_id:any = data.receiver_id
            let message:any =data.message
            let message_text:any =data.message_text
            let group_id: any = data.group_id
            let tmp_message_id: any = data.tmp_message_id 
            let post: any;
            let reciver_ids_arr:any[] = [];
            let left_group_member:any[] = [];
            let sender_detail:any;
            let isblock:any = false
          if (isgroup !== undefined && isgroup !== null && isgroup == 0 && cid !== undefined && sender_id !== undefined && receiver_id !== undefined && message !== undefined && receiver_id !== null) {
            let get_user_message = await conversation.findOne({
                tmp_message_id: tmp_message_id
              })
              if (recent_messages.includes(tmp_message_id)) {
                // console.log("same temp message",tmp_message_id);
                return
              }else{
                recent_messages.push(tmp_message_id)
              }
              // console.log("send message", tmp_message_id);
            if (get_user_message !== null) {
              // console.log("message send with same temp message id", tmp_message_id)
              return;
            }

              let get_user_detail:any = await user.findById({
                _id:sender_id,
                is_deleted:0
              })
              let originalName_tmp:any = "";
              let originalImage_tmp:any = "";
              let sender_endpointnumber:any = "";
              if(get_user_detail){
                originalName_tmp = encryptDataname(get_user_detail.first_name,get_user_detail.last_name,get_user_detail.eid);
                originalImage_tmp = get_user_detail.user_image
                sender_detail = {
                  name:encryptDataname(get_user_detail.first_name,get_user_detail.last_name,get_user_detail.eid),
                  image:get_user_detail.user_image
                }
                sender_endpointnumber = get_user_detail.endpointNumber
              }
               let get_user_detail_sender:any = await user.findById({
                _id:receiver_id,
                is_deleted:0
              })
               let originalName_sender:any = "";
              
              if(get_user_detail_sender){
                originalName_sender = encryptDataname(get_user_detail_sender.first_name ,get_user_detail_sender.last_name,get_user_detail_sender.eid);
                sender_detail = {
                  name:encryptDataname(get_user_detail_sender.first_name ,get_user_detail_sender.last_name,get_user_detail_sender.eid),
                  image:get_user_detail_sender.user_image
                }
              }
  
              let check_user_delted_chat_sender:any = await user.findOneAndUpdate({
                _id:receiver_id,
                conversation_deleted_users:{$in:[sender_id]}
              },{
                $pull: { conversation_deleted_users: sender_id }
              },{
                runValidators:true
              })
  
              //console.log("check_user_delted_chat_sender",check_user_delted_chat_sender)
  
              let check_user_delted_chat_reciver:any = await user.findOneAndUpdate({
                _id:sender_id,
                conversation_deleted_users:{$in:[receiver_id]}
              },{
                $pull: { conversation_deleted_users: receiver_id }
              },{
                runValidators:true
              })
  
              //console.log("check_user_delted_chat_reciver",check_user_delted_chat_reciver)
    
              let get_check_block_by_reciver:any = await user_block.findOne({
                block_by:receiver_id,
                block_id:sender_id
              })
              let get_check_block_by_sender:any = await user_block.findOne({
                block_by:sender_id,
                block_id:receiver_id
              })
              let delete_mesage_arr:any [] = [];
              if(get_check_block_by_reciver){
                isblock = true
                delete_mesage_arr.push(receiver_id)
              }
              if(get_check_block_by_sender){
                isblock = true
                delete_mesage_arr.push(receiver_id)
              }
              let message_caption_tmp:any = "";
              if(data.media_type == 1 || data.media_type == 2){
                message_caption_tmp = data.message_caption 
              }
    
              post = new conversation();
              post.cid = cid;
              post.sender_id = sender_id;
              post.receiver_id = receiver_id;
              post.originalName = originalName_tmp ? originalName_tmp : "";
              post.message = message;
              post.message_type = parseInt(data.message_type)
                ? parseInt(data.message_type)
                : MESSAGE.MESSAGE_TYPES.REGULAR;
              post.media_type = parseInt(data.media_type)
                ? parseInt(data.media_type)
                : MESSAGE.MESSAGE_MEDIA_TYPES.TEXT;
              post.reply_message_id = data.reply_message_id
                ? data.reply_message_id
                : "";
              post.schedule_time = data.schedule_time ? data.schedule_time : null;
              post.delivery_type = MESSAGE.MESSAGE_DELIVERY_STATUS.SENDED;
              post.delete_message_users = delete_mesage_arr;
              post.block_message_users = delete_mesage_arr;
              post.message_caption = message_caption_tmp
              post.tmp_message_id = tmp_message_id ? tmp_message_id : "";
              await post.save();
    
              post = post.toObject();
              post.tmp_message_id = data.tmp_message_id ? data.tmp_message_id : null
              post.receiver_nm = originalName_sender
              post.sender_endpointnumber = sender_endpointnumber
              post.original_image = originalImage_tmp
    
              reciver_ids_arr.push(receiver_id.toString())
            }
          if (isgroup !== undefined && isgroup == 1 && sender_id !== undefined && group_id !== undefined && group_id !== null) {
            let get_user_message = await group_conversation.findOne({
              tmp_message_id: tmp_message_id
            })
             if (recent_messages.includes(tmp_message_id)) {
                // console.log("same temp message",tmp_message_id);
                return
              }else{
                recent_messages.push(tmp_message_id)
              }
            if (get_user_message !== null) {
              // console.log("message send with same temp message id", tmp_message_id)
              return;
            }

                let check_group_id:any = await group.findById({
                  _id:group_id
                })
                if(check_group_id){
                  let get_user_detail:any = await user.findById({
                    _id:sender_id,
                    is_deleted:0
                  })
                  let originalName_tmp:any = ""
                  if(get_user_detail){
                    originalName_tmp =check_group_id.group_name;
                    sender_detail = {
                      name:check_group_id.group_name,
                      image:check_group_id.group_image
                    }
                  }
                  let message_caption_tmp:any = "";
              if(data.media_type == 1 || data.media_type == 2){
                message_caption_tmp = data.message_caption 
              }
                  post = new group_conversation();
                  post.cid = cid;
                  post.group_id = group_id;
                  post.sender_id = sender_id;
                  post.originalName = originalName_tmp ? originalName_tmp : "";
                  post.message = message || "";
                  post.message_type = data.message_type
                    ? data.message_type
                    : MESSAGE.MESSAGE_TYPES.REGULAR;
                  post.media_type = data.media_type
                    ? data.media_type
                    : MESSAGE.MESSAGE_MEDIA_TYPES.TEXT;
                  post.reply_message_id = data.reply_message_id
                    ? data.reply_message_id
                    : "";
                  post.schedule_time = data.schedule_time ? data.schedule_time : null;
                  post.message_caption = message_caption_tmp
                  post.tmp_message_id = tmp_message_id ? tmp_message_id : "";
                  await post.save();
    
                  post = post.toObject();
                  post.tmp_message_id = data.tmp_message_id ? data.tmp_message_id : null
                  post.sender_endpointnumber = ""
                  post.group_image = check_group_id ? check_group_id.group_image : "";
                  let get_sender_detail:any = await user.findById({
                    _id:sender_id,
                    is_deleted:0
                  }).select("first_name last_name")
    
                  if(get_sender_detail){
                    post.sender_id = get_sender_detail
                  }
    
                  let groupUsersData:any [] = [];
                  if(check_group_id){
                    groupUsersData = check_group_id.group_users
                  }
                  if (groupUsersData.length > 1) {
                    await Promise.all(
                      groupUsersData.map(async (mapId: any) => {
                        if(mapId.toString() !== sender_id.toString()){
                          const messageAdd = new group_message_status();
                          messageAdd.cid = cid;
                          messageAdd.group_id = group_id;
                          messageAdd.message_id = post._id;
                          messageAdd.receiver_id = mapId;
                          messageAdd.sender_id = sender_id;
                          messageAdd.save();
                        }
                      })
                    );
                  }
                  reciver_ids_arr = check_group_id.group_users
                  left_group_member = check_group_id.group_leave_members
                }
            }
            const sendrSocketIds: any[] = [];
            const ReciverSocketIds:any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === sender_id.toString() && item.cid.toString() === cid.toString()) {
                sendrSocketIds.push(item.socket_id);
              }
              if(item.uid.toString() !== sender_id.toString() && !left_group_member.includes(item.uid) && reciver_ids_arr.includes(item.uid) && item.cid.toString() === cid.toString()){
    
                ReciverSocketIds.push(item.socket_id)
              }
            })
          );
          recent_messages = recent_messages.filter(id => id !== tmp_message_id);
          if(sendrSocketIds.length > 0){
            // console.log("ack send message", socket_users, socket.id,{
            //   message_detail:post,
            //   isgroup:isgroup,
            //   sender_detail:sender_detail
            // })
            io.to(sendrSocketIds).emit("ack_send_message", {
              message_detail:post,
              isgroup:isgroup,
              sender_detail:sender_detail
            });
          }
          // console.log("socket users",socket_users)
          if(ReciverSocketIds.length > 0 && !isblock){
            // console.log("ready to send message",ReciverSocketIds,{
            //   message_detail:post,
            //   isgroup:isgroup,
            //   sender_detail:sender_detail
            // })
            io.to(ReciverSocketIds).emit("receive_message", {
              message_detail:post,
              isgroup:isgroup,
              sender_detail:sender_detail
            });
          }
    
    
          let get_token_users: any[] = [];
          let title_name: string = "";
          let notification_type:any = 0
          let notification_id:any = "";
          
          if(isgroup && data.group_id !== undefined){
            notification_type = MESSAGE.PUSH_NOTIFICATION_TYPE.GROUP.toString()
            notification_id = data.group_id.toString()
            let get_group_detail:any = await group.findById({
              _id:data.group_id
            })
            if(get_group_detail){
              title_name = decryptData(get_group_detail.group_name,get_group_detail.cid)
            }
            await Promise.all(reciver_ids_arr.map(async (row: any) => {
              let user_mute_notificaion_detail = await notification_setting_users.findOne({
                notification_mute_id: data.group_id,
                uid: row,
                notification_mute_type: { $ne: 4 },
                isgroup: 1
              })
              if (user_mute_notificaion_detail == null && sender_id.toString() !== row.toString()) {
                get_token_users.push(row)
              }
            }))
          }
          if(isgroup == 0 && sender_id !== undefined && !isblock){
            notification_id = sender_id.toString()
            notification_type = MESSAGE.PUSH_NOTIFICATION_TYPE.ONETOONE.toString()
            let get_user_detail:any = await user.findById({
              _id:sender_id
            })
            if(get_user_detail){
              title_name = decryptData(get_user_detail.first_name,get_user_detail.eid) + " " + decryptData(get_user_detail.last_name,get_user_detail.eid)
            }
            await Promise.all(reciver_ids_arr.map(async (row: any) => {
              let user_mute_notificaion_detail = await notification_setting_users.findOne({
                notification_mute_id: sender_id,
                uid: row,
                notification_mute_type: { $ne: 4 },
                isgroup: 0
              })
              if (user_mute_notificaion_detail == null) {
                get_token_users.push(row)
              }
            }))
          }
          let getpushtokens = await user_tokens.find({
            uid: { $in: get_token_users },
            push_token: { $ne: "" },
            osversion:1
          })
          let getpushtokens_ios = await user_tokens.find({
            uid: { $in: get_token_users },
            push_token: { $ne: "" },
            osversion:2
          })
          let tmp_tokens: any[] = [];
          let tmp_tokens_ios: any[] = [];
          if (getpushtokens.length > 0) {
            await Promise.all(getpushtokens.map(async (items: any) => {
              tmp_tokens.push(items.push_token)
            }))
          }
          if (getpushtokens_ios.length > 0) {
            await Promise.all(getpushtokens_ios.map(async (items: any) => {
              tmp_tokens_ios.push(items.push_token)
            }))
          }
    
          
          let title: any = title_name;
          let body: any = post.message.toString();
          let body_ios: any = post.message.toString();
          let token: any[] = tmp_tokens
          let token_ios: any[] = tmp_tokens_ios
          
            if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.IMAGE) {
              body_ios = "Image"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VIDEO) {
              body_ios = "Video"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.AUDIO) {
              body_ios = "Audio"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.DOCUMENTS) {
              body_ios = message_text
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.CONTACT) {
              body_ios = "Contact"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.LOCATION) {
              body_ios = "Location"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VOICENOTE) {
              body_ios = "Voicenote"
            } else {
              body_ios = message_text;
            }
            
            if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.IMAGE) {
              body = "Image"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VIDEO) {
              body = "Video"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.AUDIO) {
              body = "Audio"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.DOCUMENTS) {
              body = message_text
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.CONTACT) {
              body = "Contact"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.LOCATION) {
              body = "Location"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VOICENOTE) {
              body = "Voicenote"
            } else {
              body = post.message.toString();
            }
            if (token.length > 0) {
              let notification_data: any = {
                type: notification_type,
                id: notification_id,
                roomid: "",
                message: JSON.stringify(post),
              };
              console.log("before push send",title, message, sender_id)
              sendPushNotification(title, body, token, notification_data);
            }
            if (token_ios.length > 0) {
              let notification_data: any = {
                type: notification_type,
                id: notification_id,
                roomid: "",
                message: JSON.stringify(post),
              };
              sendPushNotification(title, body_ios, token_ios, notification_data);
            }
        } catch (error:any) {
          console.log("error",error)
          if(data.sender_id !== undefined && data.sender_id !== null ){
            const emiter_arr:any [] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === data.sender_id.toString()) {
                emiter_arr.push(item.socket_id);
              }
            })
          );
          if(emiter_arr.length > 0){
            let get_error:any = JSON.stringify(error.toString())
            io.to(emiter_arr).emit("Socket_emit_error",get_error);
          }
          }
        }
      })
      socket.on("send_delivery_status", async function (data: any) {
        try {
          // console.log("debug send delivery status:",data)
          // await rateLimiter.consume(socket.id);
          // if (data.isgroup) {
          //   socket.data.uid = connection_uid
          //   const isValid = await isAuthorizedGroup(
          //     data.group_id,
          //     data.receiver_id,
          //     socket
          //   );
          //   console.log(isValid,"is valid check 55585")
          //   if (!isValid) {
          //     socket.disconnect()
          //     return;
          //   }
          // } else {
          //   const isValid = await isAuthorized(
          //     data.receiver_id,
          //     connection_uid,
          //     socket
          //   );
          //   if (!isValid) {
          //     socket.disconnect()
          //     return;
          //   }
          // }
          if (data) {
          let isgroup:any = data.isgroup
          let message_id:any = data.message_id
          let group_id:any = data.group_id
          let receiver_id:any = data.receiver_id
          let cid:any = data.cid
          let post:any;
          let reciver_ids:any = [];
          let sender:any;
          if(isgroup !== undefined && isgroup && group_id !== null){
            let update_obj:any = {
              delivery_type: data.delivery_type
                  ? parseInt(data.delivery_type)
                  : MESSAGE.MESSAGE_DELIVERY_STATUS.NOTHING,
            }
            if(data.delivery_type == 4){
              update_obj.delivery_type = 3
            }
            if(data.delivery_type == 2){
              update_obj.delivery_time = new Date()
            }else if(data.delivery_type == 3){
              update_obj.read_time = new Date()
            }else if(data.delivery_type == 4){
              update_obj.delivery_time = new Date()
              update_obj.read_time = new Date()
            }else{
              // update_obj.delivery_time = null
              // update_obj.read_time = null
            }
            await group_message_status.findOneAndUpdate(
              {
                message_id: message_id,
                group_id:group_id,
                receiver_id:receiver_id
              },
              update_obj,
              {
                new: true,
                runValidators: true,
              }
            );
  
            let get_message_all_count:any = await group_message_status.find({
              message_id:message_id
            }).countDocuments();
  
            let get_message_deliver_count:any = await group_message_status.find({
              message_id:message_id,
               $or: [
              { delivery_type: 3 },
              { delivery_type: 2 }
            ]
            }).countDocuments();
  
            let get_message_read_count:any = await group_message_status.find({
              message_id:message_id,
              delivery_type:3,
            }).countDocuments();
  
            let get_message_delivery_type:any = await group_conversation.findById({
              _id:message_id
            })
            let deliver_type_tmp:any = 1;
  
            if(get_message_delivery_type){
              deliver_type_tmp = get_message_delivery_type.delivery_type
            }
  
            if(get_message_all_count == get_message_deliver_count){
              deliver_type_tmp = 2
            }
            if(get_message_all_count == get_message_read_count){
              deliver_type_tmp = 3
            }
  
            post =  await group_conversation.findByIdAndUpdate({
              _id:message_id
            },
            {
              delivery_type:deliver_type_tmp
            },
            {
              new:true
            })
  
            let get_group_detail:any = await group.findById({
              _id:group_id
            })
  
            if(get_group_detail){
              reciver_ids = get_group_detail.group_users
            }
            sender = post.sender_id
          }else{
            const messageData:any = await conversation.findOne({
              _id:message_id
            })

            if(messageData.delivery_type < data.delivery_type){
              post = await conversation.findOneAndUpdate(
                {
                  _id: message_id,
                  delivery_type: { $ne: 3 } 
                },
                {
                  delivery_type: data.delivery_type
                    ? parseInt(data.delivery_type)
                    : MESSAGE.MESSAGE_DELIVERY_STATUS.SENDED,
                },
                {
                  new: true,
                  runValidators: true,
                }
              );
            }else{
              post = messageData
            }
            // console.log("debug send delivery status:",post)
            sender = post.sender_id
            reciver_ids.push(post.receiver_id.toString())
          }
         
  
          const sendrSocketIds: any[] = [];
        await Promise.all(
          socket_users.map(async (item) => {
            if (item.uid.toString() === sender.toString() && item.cid.toString() === cid.toString()) {
              // console.log("debug send delivery status socket emmit for ack:",item.uid,item.socket_id)
              sendrSocketIds.push(item.socket_id);
            }
            if(item.uid.toString() !== sender.toString() && reciver_ids.includes(item.uid) && item.cid.toString() === cid.toString()){
              let get_message_status:any = await group_message_status.findOne({
                message_id:message_id,
                receiver_id:item.uid.toString()
              });
              // console.log("debug send delivery status socket emmit for reciever:",get_message_status,item.uid,item.device_id)
              io.to(item.socket_id).emit("receive_delivery_status", {
                post:post,
                isgroup:isgroup?1:0,
                message_read_info:get_message_status
              });
            }
          })
        );
          // console.log("debug send delivery status socket emmit :",sendrSocketIds)

          if (sendrSocketIds.length > 0) {
            io.to(sendrSocketIds).emit("ack_send_delivery_status", {
              post:post,
              isgroup:isgroup?1:0
            });
          }
        }
        } catch (error: any) {
          // console.log(`Rate limit exceeded for ${socket.id}`);
          // socket.emit('rate_limit', 'You are sending messages too frequently. Please wait.');
          // console.log("send delivery status catch :", error)
          if(data.sender_id !== undefined && data.sender_id !== null ){
            const emiter_arr:any [] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === data.sender_id.toString()) {
                emiter_arr.push(item.socket_id);
              }
            })
          );
          if(emiter_arr.length > 0){
            let get_error:any = JSON.stringify(error.toString())
            io.to(emiter_arr).emit("Socket_emit_error",get_error);
            }
          }
        }
      });
      socket.on("delete_message", async function (data: any) {
        if (data) {
          if (data.isgroup) {
            socket.data.uid = connection_uid
            const isValid = await isAuthorizedGroup(
              data.group_id,
              data.sender_id,
              socket
            );
            if (!isValid) {
              socket.disconnect()
              return;
            }
          } else {
            const isValid = await isAuthorized(
              data.sender_id,
              connection_uid,
              socket
            );
            if (!isValid) {
              socket.disconnect()
              return;
            }
          }
          let isDeleteForMe:any = data.isDeleteForMe;
          let receiver_id:any = data.receiver_id;
          let sender_id:any = data.sender_id;
          let group_users:any[] = [sender_id, receiver_id];
          let message_ids:any [] = data.message_ids;
          let isgroup:any = data.isgroup
          let deleted_messages:any[] = [];
          let group_id:any = data.group_id
          let reciver_arr:any [] = []; 
          let cid:any = data.cid;
          let message_delete_arr:any [] = [];
          if(isgroup && group_id !== undefined && group_id !== null && message_ids.length > 0){
            let get_group_detail:any = await group.findById({
              _id:group_id
            })
            let group_users_list:any [] = [];
            if(get_group_detail){
              group_users_list = get_group_detail.group_users
            }
            if(isDeleteForMe == 1){
              message_delete_arr.push(sender_id)
            }else if(isDeleteForMe == 2){
              message_delete_arr = group_users_list
            }else{
              message_delete_arr = []
            }
  
            if(message_ids.length > 0 && isDeleteForMe == 1){
              await group_conversation.updateMany({
                _id:{$in:message_ids}
              },
              {
                delete_message_users:message_delete_arr
              })
              deleted_messages = await group_conversation.find({
                _id:{$in:message_ids}
              })
              reciver_arr = group_users_list
            }
            if(message_ids.length > 0 && isDeleteForMe == 2){
              await group_conversation.updateMany({
                _id:{$in:message_ids}
              },
              {
                delete_message_users:message_delete_arr,
                is_deleted:1
              })
              deleted_messages = await group_conversation.find({
                _id:{$in:message_ids}
              })
              reciver_arr = group_users_list
            }
          }
          if(isgroup == 0 && sender_id !== undefined && receiver_id !== undefined && sender_id !== null && receiver_id !== null &&  message_ids.length > 0){
            let message_delete_arr:any [] = [];
            if(isDeleteForMe == 1){
              message_delete_arr.push(sender_id)
            }else if(isDeleteForMe == 2){
              message_delete_arr = group_users
            }else{
              message_delete_arr = []
            }
            if(message_ids.length > 0 && isDeleteForMe == 1){
             await conversation.updateMany({
                _id:{$in:message_ids}
              },
              {
                delete_message_users:message_delete_arr
              })
              deleted_messages = await conversation.find({
                _id:{$in:message_ids}
              })
              reciver_arr.push(receiver_id.toString())
            }
  
            if(message_ids.length > 0 && isDeleteForMe == 2){
              await conversation.updateMany({
                 _id:{$in:message_ids}
               },
               {
                 delete_message_users:message_delete_arr,
                 is_deleted:1
               })
               deleted_messages = await conversation.find({
                 _id:{$in:message_ids}
               })
               reciver_arr.push(receiver_id.toString())
             }
          }
  
                  
  
          const sendrSocketIds: any[] = [];
          const ReciverSocketIds:any[] = [];
        await Promise.all(
          socket_users.map(async (item) => {
            if (item.uid.toString() === sender_id.toString() && item.cid.toString() === cid.toString()) {
              sendrSocketIds.push(item.socket_id);
            }
            if(item.uid.toString() !== sender_id.toString() && reciver_arr.includes(item.uid) && item.cid.toString() === cid.toString()){
              ReciverSocketIds.push(item.socket_id)
            }
          })
        );
          if (sendrSocketIds.length > 0) {
            io.to(sendrSocketIds).emit("ack_delete_message", {
              Deleted_messages:deleted_messages,
              isgroup:isgroup,
              sender_id:sender_id,
              receiver_id:receiver_id,
              group_id:group_id
            });
          }
          if (ReciverSocketIds.length > 0 && isDeleteForMe == 2) {
            io.to(ReciverSocketIds).emit("receive_delete_message", {
              Deleted_messages:deleted_messages,
              isgroup:isgroup,
              sender_id:sender_id,
              receiver_id:receiver_id,
              group_id:group_id
            });
          }
          
          let post: any;
          let get_token_users: any;
          if (isDeleteForMe == 2) {
            for (const msgId of message_ids) {
              if (isgroup) {
                post = await group_conversation
                  .findOne({
                    _id: msgId,
                  })
                  .lean();
                post.action = "Delete";
                get_token_users = message_delete_arr;
              } else {
                post = await conversation
                  .findOne({
                    _id: msgId,
                  })
                  .lean();
                post.action = "Delete";
                get_token_users = receiver_id;
              }
              let getpushtokens = await user_tokens.find({
                uid: { $in: get_token_users },
                push_token: { $ne: "" },
                osversion: 1,
              }); 
              let getpushtokens_ios = await user_tokens.find({
                uid: { $in: get_token_users },
                push_token: { $ne: "" },
                osversion: 2,
              });
              let tmp_tokens: any[] = [];
              let tmp_tokens_ios: any[] = [];
              if (getpushtokens.length > 0) {
                await Promise.all(
                  getpushtokens.map(async (items: any) => {
                    tmp_tokens.push(items.push_token);
                  })
                );
              }
              if (getpushtokens_ios.length > 0) {
                await Promise.all(
                  getpushtokens_ios.map(async (items: any) => {
                    tmp_tokens_ios.push(items.push_token);
                  })
                );
              }

              let title: any = "";
              let body: any = "Deleted Message";
              let body_ios: any = "Deleted Message";
              let token: any[] = tmp_tokens;
              let token_ios: any[] = tmp_tokens_ios;
              if (token.length > 0) {
                let notification_data: any = {
                  type: MESSAGE.PUSH_NOTIFICATION_TYPE.GROUP.toString(),
                  id: sender_id.toString(),
                  roomid: "",
                  message: JSON.stringify(post),
                };
                setTimeout(() => {
                  sendPushNotification(title, body, token, notification_data);
                }, 5000);
              }
              if (token_ios.length > 0) {
                let notification_data: any = {
                  type: MESSAGE.PUSH_NOTIFICATION_TYPE.GROUP.toString(),
                  id: sender_id.toString(),
                  roomid: "",
                  message: JSON.stringify(post),
                };
                setTimeout(() => {
                  sendPushNotification(
                    title,
                    body_ios,
                    token_ios,
                    notification_data
                  );
                }, 5000);
              }
            }
          }
          }
      });
      socket.on("send_edit_message", async function (data: any) {
        if (data) {
          if (data.isgroup) {
            socket.data.uid = connection_uid
            const isValid = await isAuthorizedGroup(
              data.group_id,
              data.uid,
              socket
            );
            if (!isValid) {
              socket.disconnect()
              return;
            }
          } else {
            const isValid = await isAuthorized(
              data.uid,
              connection_uid,
              socket
            );
            if (!isValid) {
              socket.disconnect()
              return;
            }
          }
          if(data.isgroup){
            const groupData:any = await group.findOne({
              is_deleted:0,
              _id:data.group_id
            })
            const is_admin_send_message = groupData.is_admin_send_message
            if(is_admin_send_message){
              const isAdmin = await group_members.find({
                  group_id: data.group_id,
                  is_admin: 1,
                  member_id: connection_uid,
                });
                if (isAdmin.length == 0) {
                  socket.disconnect();
                  return;
                }
            }
          }
          let isgroup: any = data.isgroup
          let message_id:any = data.message_id
          let group_id:any = data.group_id
          let uid:any = data.uid
          let cid:any = data.cid
          let post: any;
          let reciver_ids_arr:any[] = []

           if(isgroup){
            const messageData:any = await group_conversation.findOne({
              _id:message_id,
              is_deleted:0
            }) 
            if(messageData?.sender_id != uid){
              socket.disconnect()
              return
            }
          }else{
            const messageData:any = await conversation.findOne({
              _id:message_id,
              is_deleted:0
            })
            if(messageData.sender_id != uid){
              socket.disconnect()
              return
            }
          }

          if (isgroup && message_id !== undefined && message_id !== null && uid !== undefined && uid !== null && group_id !== undefined && group_id !== null) {
            post = await group_conversation.findOneAndUpdate(
              {
                _id:message_id,
               sender_id:uid
              },
              {
                message: data.message,
                is_edited:1
              },
              {
                new: true,
                runValidators: true,
              }
            );
            let check_group_id:any = await group.findById({
              _id:group_id
            })
            if(check_group_id){
              reciver_ids_arr = check_group_id.group_users  
            }
          } else if(isgroup == 0 && message_id !== null && uid !== null && message_id !== undefined && uid !== undefined){
            post = await conversation.findOneAndUpdate(
              {
                _id: message_id,
                sender_id:uid
              },
              {
                message: data.message,
                is_edited:1
              },
              {
                new: true,
                runValidators: true,
              }
            );
            if(post){
              reciver_ids_arr.push(post.receiver_id.toString())
            }
          }else{
            reciver_ids_arr = []
          }
          const sendrSocketIds: any[] = [];
          const ReciverSocketIds:any[] = [];
        await Promise.all(
          socket_users.map(async (item) => {
            if (item.uid.toString() === uid.toString() && item.cid.toString() === cid.toString()) {
              sendrSocketIds.push(item.socket_id);
            }
            if(item.uid.toString() !== uid.toString() && reciver_ids_arr.includes(item.uid) && item.cid.toString() === cid.toString()){
              ReciverSocketIds.push(item.socket_id)
            }
          })
        );
        if(sendrSocketIds.length > 0){
          io.to(sendrSocketIds).emit("ack_send_edit_message", {
            message_detail:post,
            isgroup:isgroup,
            group_id:group_id
          });
        }
        if(ReciverSocketIds.length > 0){
          io.to(ReciverSocketIds).emit("receive_edit_message", {
            message_detail:post,
            isgroup:isgroup,
            group_id:group_id
          });
        }
        }
      });
      socket.on("send_block", async function (data: any) {
        if (data) {
          const isValid  = await isAuthorized(data.block_by,connection_uid,socket)
          if(!isValid){
          socket.disconnect()
          return
        }
          let cid:any = data.cid
          let block_by:any = data.block_by
          let block_id:any = data.block_id
          let isBlocked:any = data.isBlocked
  
          if (isBlocked !== undefined && isBlocked && block_by !== undefined && block_id !== undefined && cid !== undefined && block_by !== null && block_id !== null && cid !== null) {
            const newPost = new user_block();
            newPost.cid =cid;
            newPost.block_by = block_by;
            newPost.block_id = block_id;
            newPost.block_date = new Date();
            await newPost.save();  
            
              let get_user_detail: any = await user.findById({
                _id: block_by,
              });
              let sender_detail: any = {};
              let originalName_tmp: any = "";
              if (get_user_detail) {
                originalName_tmp =
                  encryptDataname(get_user_detail.first_name, get_user_detail.last_name,get_user_detail.eid);
                sender_detail = {
                  name:
                  encryptDataname(get_user_detail.first_name , get_user_detail.last_name,get_user_detail.eid),
                  image: get_user_detail.user_image,
                };
              }
  
              let get_user_detail_reciver: any = await user.findById({
                _id: block_id,
              });
              let originalName_reciver: any = "";
              let original_message: any = "";
              if (get_user_detail_reciver) {
                original_message =
                  encryptDataname(get_user_detail_reciver.first_name ,get_user_detail_reciver.last_name,get_user_detail_reciver.eid,"You blocked ");
                  originalName_reciver =   
                  encryptDataname(get_user_detail_reciver.first_name ,get_user_detail_reciver.last_name,get_user_detail_reciver.eid);
                }
              let message_tmp: any = original_message;
              const id1 = uuidv4();
              const id2 = uuidv4();

              const combined = `${id1}-${id2}`;
              let delete_mesage_arr: any[] = [block_id];
              let mesage_info = new conversation();
              mesage_info.cid = cid;
              mesage_info.sender_id = block_by;
              mesage_info.receiver_id = block_id;
              mesage_info.originalName = originalName_tmp ? originalName_tmp : "";
              mesage_info.message = message_tmp;
              mesage_info.message_type = MESSAGE.MESSAGE_TYPES.REGULAR;
              mesage_info.media_type = MESSAGE.MESSAGE_MEDIA_TYPES.INFO;
              mesage_info.reply_message_id = "";
              mesage_info.schedule_time = null;
              mesage_info.delivery_type = MESSAGE.MESSAGE_DELIVERY_STATUS.READED;
              mesage_info.delete_message_users = delete_mesage_arr;
              mesage_info.message_caption = "";
              mesage_info.block_message_users = delete_mesage_arr;
              mesage_info.tmp_message_id = combined;
              await mesage_info.save();
  
              let post_send: any = mesage_info.toObject();
              post_send.receiver_nm = originalName_reciver;
            
                
            const mySocketIds: any = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === block_by.toString() && item.cid.toString() === cid.toString()) {
                  mySocketIds.push(item.socket_id);
                }
              })
            );
            const ReciverSocketIds: any = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === block_id.toString() && item.cid.toString() === cid.toString()) {
                  ReciverSocketIds.push(item.socket_id);
                }
              })
            );
  
            let post = {
              isBlocked: 1,
              block_id: data.block_id,
              block_by: data.block_by,
            };
            if (mySocketIds.length > 0) {
              io.to(mySocketIds).emit("ack_send_block", post);
  
              io.to(mySocketIds).emit("ack_send_message", {
                message_detail:post_send,
                isgroup:0,
                sender_detail:sender_detail
              });
            }
            if (ReciverSocketIds.length > 0) {
              io.to(ReciverSocketIds).emit("recive_send_block", post);
            }
          } else {
            if(block_by !== undefined && block_id !== undefined && cid !== undefined && block_by !== null && block_id !== null && cid !== null){
              await user_block.findOneAndDelete({
                block_by: data.block_by,
                block_id: data.block_id,
              });
  
              let get_user_detail: any = await user.findById({
                _id: block_by,
              });
              let sender_detail: any = {};
              let originalName_tmp: any = "";
              if (get_user_detail) {
                originalName_tmp =encryptDataname(get_user_detail.first_name , get_user_detail.last_name,get_user_detail.eid);
                sender_detail = {
                  name:
                    encryptDataname(get_user_detail.first_name , get_user_detail.last_name,get_user_detail.eid),
                  image: get_user_detail.user_image,
                };
              }
  
              let get_user_detail_reciver: any = await user.findById({
                _id: block_id,
              });
              let originalName_reciver: any = "";
              let original_message: any = "";
              if (get_user_detail_reciver) {
                original_message =
                  encryptDataname(get_user_detail_reciver.first_name ,get_user_detail_reciver.last_name,get_user_detail_reciver.eid,"You Unblock ");
                originalName_reciver =
                  encryptDataname(get_user_detail_reciver.first_name ,get_user_detail_reciver.last_name,get_user_detail_reciver.eid);
              }
              let message_tmp: any = original_message;
              const id1 = uuidv4();
              const id2 = uuidv4();

              const combined = `${id1}-${id2}`;
              let delete_mesage_arr: any[] = [block_id];
              let mesage_info = new conversation();
              mesage_info.cid = cid;
              mesage_info.sender_id = block_by;
              mesage_info.receiver_id = block_id;
              mesage_info.originalName = originalName_tmp ? originalName_tmp : "";
              mesage_info.message = message_tmp;
              mesage_info.message_type = MESSAGE.MESSAGE_TYPES.REGULAR;
              mesage_info.media_type = MESSAGE.MESSAGE_MEDIA_TYPES.INFO;
              mesage_info.reply_message_id = "";
              mesage_info.schedule_time = null;
              mesage_info.delivery_type = MESSAGE.MESSAGE_DELIVERY_STATUS.READED;
              mesage_info.delete_message_users = delete_mesage_arr;
              mesage_info.message_caption = "";
              mesage_info.block_message_users = delete_mesage_arr;
              mesage_info.tmp_message_id = combined;
              await mesage_info.save();
  
              let post_send: any = mesage_info.toObject();
              post_send.receiver_nm = originalName_reciver;
    
  
              const mySocketIds: any = [];
              await Promise.all(
                socket_users.map(async (item) => {
                  if (item.uid.toString() === block_by.toString() && item.cid.toString() === cid.toString()) {
                    mySocketIds.push(item.socket_id);
                  }
                })
              );
              const ReciverSocketIds: any = [];
              await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === block_id.toString() && item.cid.toString() === cid.toString()) {
                  ReciverSocketIds.push(item.socket_id);
                }
               })
              );
              let post = {
                isBlocked: 0,
                block_id: data.block_id,
                block_by: data.block_by,
              };
              if (mySocketIds.length > 0) {
                io.to(mySocketIds).emit("ack_send_block", post);
  
                io.to(mySocketIds).emit("ack_send_message", {
                  message_detail:post_send,
                  isgroup:0,
                  sender_detail:sender_detail
                });
              }
            if (ReciverSocketIds.length > 0) {
              io.to(ReciverSocketIds).emit("recive_send_block", post);
            }
            }
          }
        }
      });
      socket.on("delete_conversation", async function (data: any) {
        if (data) {
          const isValid = await isAuthorized(
            data.uid,
            connection_uid,
            socket
          );
          if (!isValid) {
            socket.disconnect()
            return;
          }
          let uid: any = data.uid
          let receiver_id: any = data.receiver_id
          let isgroup: any = data.isgroup
          let cid:any = data.cid
  
          if (isgroup) {
            await group_conversation.updateMany({
              group_id: receiver_id
            }, {
              $push: { delete_message_users: uid }
            }, {
              runValidators: true
            })
            await group.findOneAndUpdate({
              _id: receiver_id
            },
              {
                $pull: { group_users: uid }
              }, {
              runValidators: true
            })
  
            await group_members.findOneAndDelete({
              group_id: receiver_id,
              member_id: uid
            })
          } else {
            await conversation.updateMany({
              is_deleted: 0,
              $or: [
                { receiver_id: uid, sender_id: receiver_id },
                { receiver_id: receiver_id, sender_id: uid }
              ],
            },
              {
                $push: { delete_message_users: uid }
              },
              {
                runValidators: true
              });
  
            await user.findByIdAndUpdate({
              _id: receiver_id
            },
              {
                $push: { conversation_deleted_users: uid }
              },
              {
                runValidators: true,
                new: true
              })
          }
  
          const myACKSocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === uid.toString() && item.cid.toString() === cid.toString()) {
                myACKSocketIds.push(item.socket_id);
              }
            })
          );
          if (myACKSocketIds.length > 0) {
            let post_detail: any = {
              uid: uid,
              receiver_id: receiver_id,
              isgroup: isgroup
            }
            io.to(myACKSocketIds).emit("ack_delete_conversation", {
              delete_conversation: post_detail
            });
          }
  
        }
      });
      socket.on("typing", async function (data: any) {
        const isValid  = await isAuthorized(data.sender_id, connection_uid, socket)
        if(!isValid){
          socket.disconnect()
          return
        }
        if (data) {
          let sender_id: any = data.sender_id
          let reciver_id: any = data.reciver_id
  
          const mySocketIds: any[] = [];
  
          await Promise.all(
            socket_users.map(async (item) => {
              if (data.cid === item.cid && item.uid.toString() === reciver_id.toString()) {
                mySocketIds.push(item.socket_id);
              }
            })
          );
          if (mySocketIds.length > 0) {
            io.to(mySocketIds).emit("ack_typing", {
              sender_id: sender_id,
              reciver_id: reciver_id
            });
          }
        }
      });
      socket.on("send_create_group", async function (data: any) {
        try {
        const isValid  = await isAuthorized(data.uid, connection_uid, socket)
        if(!isValid){
          socket.disconnect()
          return
        }
        let new_group_users = [...data.group_users, data.uid];
        new_group_users = new_group_users.filter((rows:any,index:any,arr:any)=> arr.indexOf(rows) === index)
        const temPost = new group();
        temPost.cid = data.cid;
        temPost.created_by = data.uid;
        temPost.group_name = data.group_name;
        temPost.description = data.description ? data.description : "";
        temPost.group_image = data.group_image ? data.group_image : "";
        temPost.group_users = new_group_users;
        await temPost.save();
  
  
        let get_user_nm: any = await user.findOne({
          _id: data.uid
        })
        const decrypted_first_name = decryptData(get_user_nm.first_name,data.cid)
        const decrypted_last_name = decryptData(get_user_nm.last_name,data.cid)
        let new_message: String = decrypted_first_name + " " + decrypted_last_name + " Created a Group";
        let encrypted_new_message = encryptData(new_message,data.cid)
        const id1 = uuidv4();
        const id2 = uuidv4();
        const combined = `${id1}-${id2}`;
        var post_convarsation: any = new group_conversation();
        post_convarsation.cid = data.cid;
        post_convarsation.group_id = temPost._id;
        post_convarsation.sender_id = data.uid;
        post_convarsation.originalName = "";
        post_convarsation.message = encrypted_new_message;
        post_convarsation.message_type = MESSAGE.MESSAGE_TYPES.REGULAR;
        post_convarsation.media_type = MESSAGE.MESSAGE_MEDIA_TYPES.GROUP_CREATE;
        post_convarsation.reply_message_id = "";
        post_convarsation.schedule_time = data.schedule_time ? data.schedule_time : null;
        post_convarsation.block_message_users = [];
        post_convarsation.tmp_message_id = combined;
        await post_convarsation.save();
  
  
  
        var groupMembers = [
          {
            cid: data.cid,
            group_id: temPost._id,
            member_id: data.uid,
            is_admin: 1,
          },
        ];
        await Promise.all(
          new_group_users.map(async (items: any) => {
            if(items.toString() !== data.uid.toString())
            {
              var obj = {
                cid: data.cid,
                group_id: temPost._id,
                member_id: items,
                is_admin: 0,
              };
              groupMembers.push(obj);
            }
          })
        );
  
        await group_members.insertMany(groupMembers);
        let get_group_user_tmp:any  = await group_members.find({
          group_id:temPost._id
        }).populate({
          path:"member_id",
          model:"user",
          select:"first_name last_name user_image"
        })
        let post: any;
        post = temPost.toObject();
        post.group_image = post.group_image;
        post.group_users = get_group_user_tmp
  
        const myACKSocketIds: any[] = [];
        const mySocketIds: any[] = [];
  
        await Promise.all(
          socket_users.map(async (item) => {
            if (item.uid === data.uid) {
              myACKSocketIds.push(item.socket_id);
            }
            if (new_group_users.includes(item.uid) && item.uid !== data.uid) {
              mySocketIds.push(item.socket_id);
            }
          })
        );
  
        if (myACKSocketIds.length > 0) {
          io.to(myACKSocketIds).emit("ack_send_create_group", {
            post: post,
            infoMessage: post_convarsation
          });
        }
        if (mySocketIds.length > 0) {
          io.to(mySocketIds).emit("receive_create_group",
            {
              post: post,
              infoMessage: post_convarsation
            });
        }  
        } catch (error) {
         console.log(error) 
        }
      });
      socket.on("add_group_members", async function (data: any) {
        try {
          const isValid = await isAuthorized(data.uid,connection_uid,socket)
          if(!isValid){
            socket.disconnect()
            return
          }
          console.log("add_group_members socket emited",data)
          let cid: any = data.cid;
          let group_id: any = data.group_id;
          let member_ids: any[] = data.member_ids;
          let uid: any = data.uid
          let group_add_message: any[] = [];
          let group_left_members_tmp:any[] = [];

          const isAdmin = await group_members.find({
            group_id : group_id,
            is_admin:1,
            member_id:uid
          })
          if(isAdmin.length==0){
            socket.disconnect()
            return
          }
          if(group_id !== undefined && member_ids.length > 0 && uid !== undefined){
            let get_group_detail: any = await group.findOne({
              _id: group_id
            })
            let get_user_nm: any = await user.findById({
              _id: uid
            })
    
            let get_group_users_arr:any []=[];
            let add_members_array:any[] = [];
            let new_members_to_add:any [] = []
            if(get_group_detail){
              get_group_users_arr = get_group_detail.group_users
              group_left_members_tmp = get_group_detail.group_leave_members
              get_group_users_arr = get_group_users_arr.concat(member_ids)
              get_group_users_arr = get_group_users_arr.filter((rows:any,index:any,arr:any)=> arr.indexOf(rows) === index)
    
              
              await Promise.all(get_group_users_arr.map(async (items: any) => {
                let update_isleaved_users:any = await group_members.findOneAndUpdate({
                  member_id:items,
                  group_id:group_id,
                  isleaved:1
                },{
                  isleaved:0,
                  add_member_time:new Date(),
                  leave_member_time:null
                },{
                  new:true,
                  runValidators:true
                })
                console.log("update_isleaved_users",update_isleaved_users)
              }))          
    
              
              
              let created_group_id:any = new mongoose.Types.ObjectId(group_id)
              let check_already_add_users:any []= await group_members.aggregate([
                {
                    $match: {
                        group_id: created_group_id
                    }
                },
                {
                    $group: {
                        _id: null,
                        member_ids: { $addToSet: "$member_id" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        member_ids: 1
                    }
                }
            ]).exec();
            
            check_already_add_users = check_already_add_users.length > 0 ? check_already_add_users[0].member_ids : [];
            check_already_add_users = check_already_add_users.map(id=>id.toString())
    
              new_members_to_add = member_ids.filter(item => !check_already_add_users.includes(item));
              check_already_add_users = [...check_already_add_users, ...new_members_to_add];
              group_left_members_tmp = group_left_members_tmp.filter(item => !member_ids.includes(item.toString()));
            }
            const decrypted_first_name = decryptData(get_user_nm?.first_name,cid)
            const decrypted_last_name = decryptData(get_user_nm?.last_name,cid)
            let message: any = decrypted_first_name + " " + decrypted_last_name + " added "
            if (get_group_detail) {
              await group.findByIdAndUpdate({
                _id: group_id
              }, {
                group_users:get_group_users_arr,
                group_leave_members:group_left_members_tmp
              })
    
              let add_member_details:any[] = [];
              let group_message:any[] = [];
              
              if(new_members_to_add.length > 0){
                await Promise.all(new_members_to_add.map(async (items: any) => {
                   let create_member_obj:any = {
                     cid:cid,
                     member_id:items,
                     is_admin:0,
                     group_id:group_id,
                     add_member_time:new Date()
                   }
                   add_member_details.push(create_member_obj)
                 }))
               }
    
              await Promise.all(member_ids.map(async (items: any) => {
                let get_reciver_nm: any = await user.findById({
                  _id: items
                })

                const decrypted_firstname = decryptData(get_reciver_nm?.first_name,cid)
                const decrypted_lastname = decryptData(get_reciver_nm?.last_name,cid)
                let tmp_msg = message + decrypted_firstname + " " + decrypted_lastname
                let encrypted_tmp_msg = encryptData(tmp_msg,cid)

                const id1 = uuidv4();
                const id2 = uuidv4();
                const combined = `${id1}-${id2}`;
                let create_group_message:any = {
                  cid:cid,
                  group_id:group_id,
                  sender_id:uid,
                  originalName:get_group_detail.group_name,
                  message:encrypted_tmp_msg,
                  message_type:MESSAGE.MESSAGE_TYPES.REGULAR,
                  media_type:MESSAGE.MESSAGE_MEDIA_TYPES.GROUP_MEMBER_ADD,
                  reply_message_id:"",
                  schedule_time:null,
                  add_member_id: items,
                  tmp_message_id:combined
                }
                group_message.push(create_group_message)
              }))
              group_add_message = await group_conversation.insertMany(group_message); 
              let added_member_detail:any = await group_members.insertMany(add_member_details);
    
              let group_detail_tmp: any = await group.findOne({
                _id: group_id
              })
      
      
              const mySocketIds: any[] = [];
              const memberRoleSocketIds: any[] = [];
              await Promise.all(
                socket_users.map(async (item) => {
                  if (group_detail_tmp.group_users.includes(item.uid.toString()) && !member_ids.includes(item.uid.toString())) {
                    mySocketIds.push(item.socket_id);
                  }
                  if (member_ids.includes(item.uid.toString())) {
                    memberRoleSocketIds.push(item.socket_id);
                  }
                })
              );
      
              group_detail_tmp = await group.findOne({
                _id: group_id
              })
      
              let get_group_users: any = await group_members.find({
                group_id: group_id
              }).populate({
                path: "member_id",
                model: "user",
                select: "first_name last_name user_extension user_image"
              }).select("member_id is_admin");
      
              group_detail_tmp = group_detail_tmp.toObject();
      
              group_detail_tmp.group_users = get_group_users
      
              if (memberRoleSocketIds.length > 0) {
                io.to(memberRoleSocketIds).emit("receive_group_member_detail", {
                  group_details: group_detail_tmp,
                  groupPost: group_add_message,
                  ismemebr_added: 1
                });
              }
      
              if (mySocketIds.length > 0) {
                io.to(mySocketIds).emit("ack_add_group_members", {
                  group_details: group_detail_tmp,
                  groupPost: group_add_message
                });
              }
            }
          }
        } catch (error) {
          console.log(error)
        }
      });
      socket.on("remove_group_members", async function (data: any) {
        try {
          const isValid = await isAuthorized(data.uid,connection_uid,socket)
          if(!isValid){
            socket.disconnect()
            return
          }
          let cid: any = data.cid;
          let group_id: any = data.group_id;
          let member_id: any = data.member_id;
          let uid: any = data.uid
          let group_remove_message: any[] = [];
    
          const isAdmin = await group_members.find({
            group_id : group_id,
            is_admin:1,
            member_id:uid
          })
          if(isAdmin.length==0){
            socket.disconnect()
            return
          }

          let get_group_detail: any = await group.findOne({
            _id: group_id
          })
          let get_user_nm: any = await user.findById({
            _id: uid
          })
          const decrypted_first_name = decryptData(get_user_nm?.first_name,cid)
        const decrypted_last_name = decryptData(get_user_nm?.last_name,cid)
          let message: any = decrypted_first_name + " " + decrypted_last_name + " Removed "
          if (get_group_detail && member_id) {
    
            await group.findByIdAndUpdate({
              _id: group_id
            }, {
              $pull: {
                group_users: member_id
              },
              $push:{
                group_leave_members:member_id
              }
            })
    
    
            let get_reciver_nm: any = await user.findById({
              _id: member_id
            })
            const decrypted_firstname = decryptData(get_reciver_nm?.first_name,cid)
            const decrypted_lastname = decryptData(get_reciver_nm?.last_name,cid)
            let tmp_msg = message + decrypted_firstname + " " + decrypted_lastname
            let encrypted_tmp_msg = encryptData(tmp_msg,cid)
            
            const id1 = uuidv4();
            const id2 = uuidv4();
            const combined = `${id1}-${id2}`;
            var groupPost: any = new group_conversation();
            groupPost.cid = cid;
            groupPost.group_id = group_id;
            groupPost.sender_id = uid;
            groupPost.originalName = get_group_detail.group_name;
            groupPost.message = encrypted_tmp_msg || "";
            groupPost.message_type = MESSAGE.MESSAGE_TYPES.REGULAR;
            groupPost.media_type = MESSAGE.MESSAGE_MEDIA_TYPES.GROUP_MEMBER_REMOVE;
            groupPost.reply_message_id = "";
            groupPost.schedule_time = null;
            groupPost.block_message_users = [];
            groupPost.remove_member_id = member_id
            groupPost.tmp_message_id = combined
            await groupPost.save();
            group_remove_message.push(groupPost)
    
            await group_members.findOneAndUpdate({
              group_id: group_id,
              member_id: member_id
            },{
              is_admin:0,
              isleaved:1,
              leave_member_time:new Date(),
              add_member_time:null
            })
    
            let group_detail_tmp: any = await group.findOne({
              _id: group_id
            })
    
    
            const mySocketIds: any[] = [];
            const memberRoleSocketIds: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (group_detail_tmp.group_users.includes(item.uid.toString()) && member_id.toString() != item.uid.toString()) {
                  mySocketIds.push(item.socket_id);
                }
                if (member_id.toString() === item.uid.toString()) {
                  memberRoleSocketIds.push(item.socket_id);
                }
              })
            );
    
            group_detail_tmp = await group.findOne({
              _id: group_id
            })
    
            let get_group_users: any = await group_members.find({
              group_id: group_id
            }).populate({
              path: "member_id",
              model: "user",
              select: "first_name last_name user_extension user_image"
            }).select("member_id is_admin");
    
            group_detail_tmp = group_detail_tmp.toObject();
    
            group_detail_tmp.group_users = get_group_users
    
            if (memberRoleSocketIds.length > 0) {
              io.to(memberRoleSocketIds).emit("receive_group_member_detail", {
                group_details: group_detail_tmp,
                groupPost: group_remove_message,
                ismemebr_added: 0
              });
            }
    
            if (mySocketIds.length > 0) {
              io.to(mySocketIds).emit("ack_remove_group_members", {
                group_details: group_detail_tmp,
                groupPost: group_remove_message
              });
            }
          }
        } catch (error) {
          console.log(error)
        }
      });
      socket.on("send_group_admin", async function (data: any) {
        try {
          if (data) {
            const isValid = await isAuthorized(data.uid,connection_uid,socket)
            if(!isValid){
              socket.disconnect()
              return
            }
            let group_id: any = data.group_id;
            let member_id: any = data.member_id;
            let status: any = data.status;
            let uid: any = data.uid
  
            const isAdmin = await group_members.find({
              group_id : group_id,
              is_admin:1,
              member_id:uid
            })
            if(isAdmin.length==0){
              socket.disconnect()
              return
            }
    
            if(group_id !== undefined && member_id !== undefined && status !== undefined && uid !== undefined && group_id !== null && member_id !== null && status !== null && uid !== null){
              let tmp_group_member: any = await group.findById({
                _id: group_id,
              });
      
              let groupUsersData: any[] = tmp_group_member.group_users;
      
              const exists = groupUsersData.some(
                (id: any) => id.toString() === member_id.toString()
              );

              if (!exists) {
                return
              }

              const post = await group_members.findOneAndUpdate(
                {
                  member_id: member_id,
                  group_id: group_id,
                },
                {
                  is_admin: status ? 1 : 0,
                },
                {
                  new: true,
                  runValidators: true,
                }
              );
      
              let get_addedmember_deatil: any = await user.findOne({
                _id: member_id
              })
      
              let get_user_nm: any = await user.findOne({
                _id: uid
              })
      
              let new_message: String;
              let encrypted_new_message: any
              let media_type_tmp:any;
              let decrypted_first_name = decryptData(get_user_nm.first_name,tmp_group_member.cid)
              let decrypted_last_name = decryptData(get_user_nm.last_name,tmp_group_member.cid)
              let decrypted_first_name_add = decryptData(get_addedmember_deatil.first_name,tmp_group_member.cid)
              let decrypted_last_name_add = decryptData(get_addedmember_deatil.last_name,tmp_group_member.cid)
              if (status) {
                new_message = decrypted_first_name + " " + decrypted_last_name + " Make Admin" + " " + decrypted_first_name_add + " " + decrypted_last_name_add;
                encrypted_new_message = encryptData(new_message,connection_cid)
                media_type_tmp =  MESSAGE.MESSAGE_MEDIA_TYPES.GROUP_MAKE_ADMIN
              } else {
                new_message = decrypted_first_name + " " + decrypted_last_name + " Make Member" + " " + decrypted_first_name_add + " " + decrypted_last_name_add;
                encrypted_new_message = encryptData(new_message,connection_cid)
                media_type_tmp =  MESSAGE.MESSAGE_MEDIA_TYPES.GROUP_REMOVE_FROM_ADMIN
              }
              const id1 = uuidv4();
              const id2 = uuidv4();
              const combined = `${id1}-${id2}`;
              var post_convarsation: any = new group_conversation();
              post_convarsation.cid = tmp_group_member.cid;
              post_convarsation.group_id = group_id;
              post_convarsation.sender_id = uid;
              post_convarsation.originalName = "";
              post_convarsation.message = encrypted_new_message;
              post_convarsation.message_type = MESSAGE.MESSAGE_TYPES.REGULAR;
              post_convarsation.media_type = media_type_tmp;
              post_convarsation.reply_message_id = "";
              post_convarsation.schedule_time = data.schedule_time ? data.schedule_time : null;
              post_convarsation.block_message_users = [];
              post_convarsation.tmp_message_id = combined;
              if (status) {
                post_convarsation.make_admin_id = member_id
              } else {
                post_convarsation.make_member_id = member_id
              }
              await post_convarsation.save();
      
              const mySocketIds: any[] = [];
              const memberRoleSocketIds: any[] = [];
      
              await Promise.all(
                socket_users.map(async (item) => {
                  if (member_id !== item.uid.toString() && groupUsersData.includes(item.uid.toString())) {
                    mySocketIds.push(item.socket_id);
                  }
                  if (member_id === item.uid.toString()) {
                    memberRoleSocketIds.push(item.socket_id);
                  }
                })
              );
      
              if (mySocketIds.length > 0) {
                io.to(mySocketIds).emit("receive_group_admin", {
                  role: status ? 2 : 1,
                  post,
                  group_users: groupUsersData,
                  group_id: group_id,
                  infoMessage: post_convarsation
                });
              }
              if (memberRoleSocketIds.length > 0) {
                io.to(memberRoleSocketIds).emit("receive_group_member_role", {
                  role: status ? 2 : 1,
                  group_id,
                  infoMessage: post_convarsation
                });
              }
            }
          }
        } catch (error) {
          console.log(error)
        }
      });
      socket.on("forward_message", async function (data: any) {
        const isValid = await isAuthorized(
          data.sender_id,
          connection_uid,
          socket
        );
        console.log(isValid,data.sender_id,connection_uid, "forward disconnection issue check")
        if (!isValid) {
          socket.disconnect();
          return;
        }
        let sender_id: any = data.sender_id
        let reciver_ids: any[] = data.reciver_ids
        let message_text:any =data.message_text
        let cid: any = data.cid
        let forward_message_ids: any[] = data.forward_message_ids
  
        let get_messages_detail: any = await conversation.find({
          _id: { $in: forward_message_ids }
        })
        let get_group_messages: any = await group_conversation.find({
          _id: { $in: forward_message_ids }
        })
        let message_details_arr: any[] = get_messages_detail.concat(get_group_messages)
        let inserted_messages: any[] = []
        await Promise.all(reciver_ids.map(async (item: any) => {
          if (item.isgroup == 0) {
            let insert_message_arr: any[] = [];
            await Promise.all(message_details_arr.map(async (row: any) => {
              let get_check_block_by_reciver:any = await user_block.findOne({
                block_by:item.receiver_id,
                block_id:sender_id
              })
              let delete_mesage_arr:any [] = [];
              if(get_check_block_by_reciver){
                delete_mesage_arr.push(item.receiver_id)
              }
              if (row.receiver_id !== null || row.receiver_id !== undefined) {
                var obj = {
                  cid: row.cid,
                  sender_id: sender_id,
                  receiver_id: item.receiver_id,
                  message: row.message,
                  originalName: row.originalName ? row.originalName : "",
                  message_type: MESSAGE.MESSAGE_TYPES.FORWARD,
                  media_type: parseInt(row.media_type)
                    ? parseInt(row.media_type)
                    : MESSAGE.MESSAGE_MEDIA_TYPES.TEXT,
                  reply_message_id: row.reply_message_id
                    ? row.reply_message_id
                    : "",
                  schedule_time: row.schedule_time,
                  delivery_type: MESSAGE.MESSAGE_DELIVERY_STATUS.SENDED,
                  block_message_users: [],
                  delete_message_users:delete_mesage_arr
                };
                insert_message_arr.push(obj);
              }
            }))
            let post: any = await conversation.insertMany(insert_message_arr);
            inserted_messages = inserted_messages.concat(post)
          } else {
            let insert_message_arr: any[] = [];
            await Promise.all(message_details_arr.map(async (row: any) => {
              if (row.group_id !== null || row.group_id !== undefined) {
                var obj = {
                  cid: row.cid,
                  sender_id: sender_id,
                  group_id: item.receiver_id,
                  originalName: row.originalName ? row.originalName : "",
                  message: row.message || "",
                  message_type: MESSAGE.MESSAGE_TYPES.FORWARD,
                  media_type: parseInt(row.media_type)
                    ? parseInt(row.media_type)
                    : MESSAGE.MESSAGE_MEDIA_TYPES.TEXT,
                  reply_message_id: row.reply_message_id
                    ? row.reply_message_id
                    : "",
                  schedule_time: row.schedule_time,
                  delivery_type: MESSAGE.MESSAGE_DELIVERY_STATUS.SENDED,
                };
                insert_message_arr.push(obj);
              }
            }))
            let post: any = await group_conversation.insertMany(insert_message_arr);
            inserted_messages = inserted_messages.concat(post)
          }
        }))
        let one_to_oneMessages: any[] = inserted_messages.filter((item) => item.receiver_id)
        let GroupMessages: any[] = inserted_messages.filter((item) => item.group_id)
        const myACKSocketIds: any[] = [];
        await Promise.all(
          socket_users.map(async (item) => {
            if (item.uid.toString() === sender_id.toString() && item.cid.toString() === cid.toString()) {
              myACKSocketIds.push(item.socket_id);
            }
          })
        );
  
        if (myACKSocketIds.length > 0) {
          await Promise.all(
            one_to_oneMessages.map(async (item: any) => {
              let post: any = item.toObject();
              post.tmp_message_id = null
  
              let get_user_detail:any = await user.findById({
                _id:post.sender_id
              })
  
              let sender_detail:any = {
                name:encryptDataname(get_user_detail.first_name ,get_user_detail.last_name,get_user_detail.eid),
                image:get_user_detail.user_image
              }
              io.to(myACKSocketIds).emit("ack_send_message", {
                message_detail:post,
                isgroup:0,
                sender_detail:sender_detail
              });
            }))
  
          await Promise.all(
            GroupMessages.map(async (item: any) => {
              let post: any = item.toObject();
              post.tmp_message_id = null
  
              let get_sender_detail:any = await user.findById({
                _id:sender_id,
                is_deleted:0
              }).select("first_name last_name")
  
              if(get_sender_detail){
                post.sender_id = get_sender_detail
              }
  
              let get_group_detail:any = await group.findById({
                _id:post.group_id
              })
  
              let sender_detail:any = {
                name:get_group_detail.group_name,
                image:get_group_detail.group_image
              }
  
              io.to(myACKSocketIds).emit("ack_send_message", {
                message_detail:post,
                isgroup:1,
                sender_detail:sender_detail
              });
            }))
        }
  
        await Promise.all(
          one_to_oneMessages.map(async (item: any) => {
            let get_user_detail: any = await user.findOne({
              _id: data.sender_id
            })
            let post: any = item.toObject();
            socket_users.map(async (row: any) => {
              if (!item.delete_message_users.includes(row.uid.toString()) && row.uid.toString() === item.receiver_id.toString() && row.uid.toString() != sender_id && row.cid.toString() === cid.toString()) {

                let sender_detail:any = {
                  name:encryptDataname(get_user_detail.first_name ,get_user_detail.last_name,get_user_detail.eid),
                  image:get_user_detail.user_image,
                  endpointNumber:get_user_detail.get_user_detail,
                }
  
                post.sender_endpointnumber = get_user_detail !== null ?  get_user_detail.get_user_detail : "";
  
                  io.to(row.socket_id).emit("receive_message", {
                    message_detail:post,
                    isgroup:0,
                    sender_detail:sender_detail
                  });
                
              }
            })
            let get_token_users: any[] = [];
          let title_name: string = "";
          let notification_type:any = 0
          let notification_id:any = "";
         
          if(sender_id !== undefined){
            notification_id = sender_id
            notification_type = MESSAGE.PUSH_NOTIFICATION_TYPE.ONETOONE.toString()
            let get_user_detail:any = await user.findById({
              _id:sender_id
            })
            if(get_user_detail){
              title_name = decryptData(get_user_detail.first_name) + " " + decryptData(get_user_detail.last_name)
            }
          
              let user_mute_notificaion_detail = await notification_setting_users.findOne({
                notification_mute_id: sender_id,
                uid: item.receiver_id,
                notification_mute_type: { $ne: 4 },
                isgroup: 0
              })
              if (user_mute_notificaion_detail == null) {
                get_token_users.push(item.receiver_id)
              }
            
          }
          let getpushtokens = await user_tokens.find({
            uid: { $in: get_token_users },
            push_token: { $ne: "" },
            osversion:1
          })
          let getpushtokens_ios = await user_tokens.find({
            uid: { $in: get_token_users },
            push_token: { $ne: "" },
            osversion:2
          })
          
          let tmp_tokens: any[] = [];
          let tmp_tokens_ios: any[] = [];
          if (getpushtokens.length > 0) {
            await Promise.all(getpushtokens.map(async (items: any) => {
              tmp_tokens.push(items.push_token)
            }))
          }
          if (getpushtokens_ios.length > 0) {
            await Promise.all(getpushtokens_ios.map(async (items: any) => {
              tmp_tokens_ios.push(items.push_token)
            }))
          }
    
          
          let title: any = title_name;
          let body: any = item.message.toString();
          let body_ios: any = item.message.toString();
          let token: any[] = tmp_tokens
          let token_ios: any[] = tmp_tokens_ios
    
            if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.IMAGE) {
              body = "Image"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VIDEO) {
              body = "Video"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.AUDIO) {
              body = "Audio"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.DOCUMENTS) {
              body = message_text
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.CONTACT) {
              body = "Contact"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.LOCATION) {
              body = "Location"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VOICENOTE) {
              body = "Voicenote"
            } else {
              body = item.message.toString();
            }
           
           
            if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.IMAGE) {
              body_ios = "Image"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VIDEO) {
              body_ios = "Video"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.AUDIO) {
              body_ios = "Audio"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.DOCUMENTS) {
              body_ios = message_text
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.CONTACT) {
              body_ios = "Contact"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.LOCATION) {
              body_ios = "Location"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VOICENOTE) {
              body_ios = "Voicenote"
            } else {
              body_ios = message_text;
            }
            // console.log("forward message push message detail",post)
            if (token.length > 0) {
              let notification_data: any = {
                type:notification_type,
                id: notification_id,
                roomid: "",
                message:JSON.stringify(post)
              }
              sendPushNotification(title, body, token, notification_data);
          }
            if (token_ios.length > 0) {
              let notification_data: any = {
                type:notification_type,
                id: notification_id,
                roomid: "",
                message:JSON.stringify(post)
              }
              sendPushNotification(title, body_ios, token_ios, notification_data);
          }
          }))
  
        await Promise.all(
          GroupMessages.map(async (item: any) => {
            let get_group_dteail: any = await group.findById({
              _id: item.group_id
            })
            socket_users.map(async (row: any) => {
              if (get_group_dteail.group_users.includes(row.uid.toString()) && row.uid.toString() != sender_id && row.cid.toString() === cid.toString()) {
                let post: any = item.toObject();
                let get_sender_detail:any = await user.findById({
                  _id:sender_id,
                  is_deleted:0
                }).select("first_name last_name")
  
                if(get_sender_detail){
                  post.sender_id = get_sender_detail
                }
                let sender_detail:any = {
                  name:get_group_dteail.group_name,
                  image:get_group_dteail.group_image
                }
                io.to(row.socket_id).emit("receive_message", {
                  message_detail:post,
                  isgroup:1,
                  sender_detail:sender_detail
                });
              }
            })
            let get_token_users: any[] = [];
            let title_name: string = "";
            let notification_type:any = 0
            let notification_id:any = "";
          
            if(item.group_id !== undefined){
              notification_type = MESSAGE.PUSH_NOTIFICATION_TYPE.GROUP.toString()
              notification_id = item.group_id.toString()
              let reciver_ids_arr:any[] = [];
              let get_group_detail:any = await group.findById({
                _id:item.group_id
              })
              if(get_group_detail){
                title_name = get_group_detail.group_name
                reciver_ids_arr = get_group_detail?.group_users
              }
            
              await Promise.all(reciver_ids_arr.map(async (row: any) => {
                let user_mute_notificaion_detail = await notification_setting_users.findOne({
                  notification_mute_id: item.group_id,
                  uid: row,
                  notification_mute_type: { $ne: 4 },
                  isgroup: 1
                })
                if (user_mute_notificaion_detail == null && row.toString() != sender_id.toString()) {
                  get_token_users.push(row)
                }
              }))
            }
            let getpushtokens = await user_tokens.find({
              uid: { $in: get_token_users },
              push_token: { $ne: "" },
              osversion:1
            })
            let getpushtokens_ios = await user_tokens.find({
              uid: { $in: get_token_users },
              push_token: { $ne: "" },
              osversion:2
            })
            let tmp_tokens: any[] = [];
            let tmp_tokens_ios: any[] = [];
            if (getpushtokens.length > 0) {
              await Promise.all(getpushtokens.map(async (items: any) => {
                tmp_tokens.push(items.push_token)
              }))
            }
            if (getpushtokens_ios.length > 0) {
              await Promise.all(getpushtokens_ios.map(async (items: any) => {
                tmp_tokens_ios.push(items.push_token)
              }))
            }
      
            
            let title: any = title_name;
            let body: any = item.message.toString();
            let body_ios: any = item.message.toString();
            let token: any[] = tmp_tokens
            let token_ios: any[] = tmp_tokens_ios
      
             if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.IMAGE) {
              body = "Image"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VIDEO) {
              body = "Video"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.AUDIO) {
              body = "Audio"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.DOCUMENTS) {
              body = message_text
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.CONTACT) {
              body = "Contact"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.LOCATION) {
              body = "Location"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VOICENOTE) {
              body = "Voicenote"
            } else {
                body = item.message.toString();
              }
      
              if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.IMAGE) {
              body_ios = "Image"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VIDEO) {
              body_ios = "Video"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.AUDIO) {
              body_ios = "Audio"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.DOCUMENTS) {
              body_ios = message_text
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.CONTACT) {
              body_ios = "Contact"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.LOCATION) {
              body_ios = "Location"
            } else if (data.media_type == MESSAGE.MESSAGE_MEDIA_TYPES.VOICENOTE) {
              body_ios = "Voicenote"
            } else {
                body_ios = message_text;
              }
      
              if (token.length > 0) {
                let notification_data: any = {
                  type:notification_type,
                  id: notification_id,
                  roomid: ""
                }
                sendPushNotification(title, body, token, notification_data);
            }
              if (token_ios.length > 0) {
                let notification_data: any = {
                  type:notification_type,
                  id: notification_id,
                  roomid: ""
                }
                sendPushNotification(title, body_ios, token_ios, notification_data);
            }
          }))
  
      });
      socket.on("leave_goup", async function (data: any) {
        try {
          const isValid = await isAuthorized(
            data.uid,
            connection_uid,
            socket
          );
          if (!isValid) {
            socket.disconnect();
            return;
          }
          let uid: any = data.uid
          let group_id: any= data.group_id
          let cid: any = data.cid
          let group_detail:any = null;
          let post:any = null;
          let group_members_list:any [] = [];
    
          if(uid !== undefined && group_id !== undefined && cid !== undefined){
            group_detail = await group.findByIdAndUpdate({
              _id:group_id
            },{
              $push:{
                group_leave_members:uid
              },
              $pull: {
                group_users:uid
              }
            },{
              new:true,
              runValidators:true
            }) 
    
            let get_user_nm: any = await user.findById({
              _id: uid
            })
            let decrypted_first_name = decryptData(get_user_nm?.first_name,cid)
            let decrypted_last_name = decryptData(get_user_nm?.last_name,cid)
            let message: any = decrypted_first_name + " " + decrypted_last_name + " Left Group"
            let encrypted_message = encryptData(message,cid)
            const id1 = uuidv4();
            const id2 = uuidv4();
            const combined = `${id1}-${id2}`;
            post = new group_conversation();
            post.cid = cid;
            post.group_id = group_id;
            post.sender_id = uid;
            post.originalName = group_detail.group_name;
            post.tmp_message_id = combined;
            post.message = encrypted_message || "";
            post.message_type = data.message_type
              ? data.message_type
              : MESSAGE.MESSAGE_TYPES.REGULAR;
            post.media_type = data.media_type
              ? data.media_type
              : MESSAGE.MESSAGE_MEDIA_TYPES.GROUP_LEAVE;
            post.reply_message_id = data.reply_message_id
              ? data.reply_message_id
              : "";
            post.schedule_time = data.schedule_time ? data.schedule_time : null;
            await post.save();
    
            await group_members.findOneAndUpdate({
              group_id:group_id,
              member_id:uid
            },{
              isleaved:1,
              is_admin:0,
              leave_member_time:new Date(),
              add_member_time:null
            })
    
             if(group_detail){
              let get_tmp_user:any[] = group_detail?.group_users
              group_members_list = get_tmp_user
             }
          }
          const sendrSocketIds: any[] = [];
            const ReciverSocketIds:any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === uid.toString() && item.cid.toString() === cid.toString()) {
                sendrSocketIds.push(item.socket_id);
              }
              if(item.uid.toString() !== uid.toString() && group_members_list.includes(item.uid) && item.cid.toString() === cid.toString()){
                ReciverSocketIds.push(item.socket_id)
              }
            })
          );
    
          if(sendrSocketIds.length > 0){
            io.to(sendrSocketIds).emit("ack_leave_goup", {
              message_detail:post,
              group_detail:group_detail,
              uid:uid
            });
          }
          if(ReciverSocketIds.length > 0){
            io.to(ReciverSocketIds).emit("receive_leave_goup", {
              message_detail:post,
              group_detail:group_detail,
              uid:uid
            });
          }
        } catch (error) {
          console.log(error)
        }
      });
      socket.on("send_update_user", async function (data: any) {
        try {
          if (!node_users.includes(socket.id)) {
      const isValid = await isAuthorized(data.uid, connection_uid, socket);
      if (!isValid) {
        socket.disconnect();
        return;
      }
    }

          let uid: any = data.uid;
          let user_image: any = data.user_image;
          let first_name: any = data.first_name;
          let last_name: any = data.last_name;
          let cid: any = data.cid;
          let post: any = {
            _id: uid,
            user_image,
            first_name,
            last_name,
          };

          const myACKSocketIds: any[] = [];
          const mySocketIds: any[] = [];

          await Promise.all(
            socket_users.map(async (item) => {
              if (
                cid.toString() === item.cid.toString() &&
                item.uid.toString() === uid.toString()
              ) {
                myACKSocketIds.push(item.socket_id);
              }
              if (
                cid.toString() === item.cid.toString() &&
                item.uid.toString() !== uid.toString()
              ) {
                mySocketIds.push(item.socket_id);
              }
            })
          );
          if (myACKSocketIds.length > 0) {
            io.to(myACKSocketIds).emit("ack_send_update_user",
            {
              post
            } );
          }
          if (mySocketIds.length > 0) {
            io.to(mySocketIds).emit("receive_update_user", post);
          }
        } catch (error) {
          console.log(error,"error")
        }
      });

      socket.on("sync_user_list", async function (data:any) {
        try {
          const uid = data.uid
          const cid = data.cid

          const post = await user.findOne({
            _id:uid
          }).select("MobileNumber first_name last_name user_image user_name is_deleted is_internal")

          const myACKSocketIds: any[] = [];

          await Promise.all(
            socket_users.map(async (item) => {
              if (
                cid.toString() === item.cid.toString()
              ) {
                myACKSocketIds.push(item.socket_id);
              }
            })
          );
          if (myACKSocketIds.length > 0) {
            io.to(myACKSocketIds).emit("ack_sync_user_list",
            {
              post
            } );
          }
        } catch (error) {
          console.log(error)
        }
      })

      socket.on("mute_notification", async function (data: any) {
        if (data) {
          const isValid = await isAuthorized(
          data.uid,
          connection_uid,
          socket
        );
        if (!isValid) {
          socket.disconnect();
          return;
        }
          let notification_mute_id = data.notification_mute_id
          let cid = data.cid
          let uid = data.uid
          let isgroup = data.isgroup
          let notification_mute_type = data.notification_mute_type
          let mute_member_name:any = null;
  
          let unmute_date: any = ""
          if (notification_mute_type !== undefined &&  notification_mute_type == 1) {
            let get_current_date = moment().utc().format("YYYY-MM-DDTHH:mm:ss.sssZ")
            let get_current_date_seconds = moment(get_current_date).utc().set({ second: 0, millisecond: 0 });
            unmute_date = moment(get_current_date_seconds).utc().add(8, 'hours').format("YYYY-MM-DDTHH:mm:ss.sssZ")
          } else if (notification_mute_type !== undefined && notification_mute_type == 2) {
            let get_current_date = moment().utc().format("YYYY-MM-DDTHH:mm:ss.sssZ")
            let get_current_date_seconds = moment(get_current_date).utc().set({ second: 0, millisecond: 0 });
            unmute_date = moment(get_current_date_seconds).utc().add(7, 'days').format("YYYY-MM-DDTHH:mm:ss.sssZ")
          } else {
            unmute_date = null
          }
  
  
          let user_notification: any;
          if (notification_mute_id !== undefined && cid !== undefined && uid !== undefined && isgroup !== undefined) {
            let get_user_data = await notification_setting_users.findOne({
              cid: cid,
              uid: uid,
              isgroup: isgroup,
              notification_mute_id: notification_mute_id
            })
            if (get_user_data !== null) {
              user_notification = await notification_setting_users.findOneAndUpdate(
                {
                  cid: cid,
                  uid: uid,
                  isgroup: isgroup,
                  notification_mute_id: notification_mute_id
                },
                {
                  notification_mute_type: notification_mute_type,
                  notification_mute_date: unmute_date
                },
                {
                  new: true,
                  runValidators: true
                }
              );
              let get_mute_member_detail:any = await user.findById({
                _id:notification_mute_id
              })
              if(get_mute_member_detail){
                mute_member_name = encryptDataname(get_mute_member_detail?.first_name , get_mute_member_detail?.last_name,get_mute_member_detail.eid)
              }
            } else {
              user_notification = new notification_setting_users();
              user_notification.cid = cid,
                user_notification.uid = uid,
                user_notification.isgroup = isgroup,
                user_notification.notification_mute_id = notification_mute_id
              user_notification.notification_mute_type = notification_mute_type
              user_notification.notification_mute_date = unmute_date
              await user_notification.save();
              let get_mute_member_detail:any = await user.findById({
                _id:notification_mute_id
              })
              if(get_mute_member_detail){
                mute_member_name = encryptDataname(get_mute_member_detail?.first_name , get_mute_member_detail?.last_name,get_mute_member_detail.eid)
              }
            }
          }
  
          const myACKSocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (cid.toString() === item.cid.toString() && item.uid.toString() === uid.toString()) {
                myACKSocketIds.push(item.socket_id);
              }
            })
          );
          if (myACKSocketIds.length > 0) {
            io.to(myACKSocketIds).emit("ack_mute_conversation", {
              mute_conversation: user_notification,
              mute_member_name:mute_member_name
            });
          }
        }
      });
      socket.on("mute_notifiction_detail", async function (data: any) {
        if (data) {
          const isValid = await isAuthorized(
          data.uid,
          connection_uid,
          socket
        );
        if (!isValid) {
          socket.disconnect();
          return;
        }
          let uid: any = data.uid
          let recevier_id: any = data.recevier_id
          let cid: any = data.cid
          let isgroup: any = data.isgroup
  
          let mute_type_detail: any = 4
          let muted: any = 0
          let check_mute_type: any = await notification_setting_users.findOne({
            uid: uid,
            isgroup: isgroup,
            notification_mute_id: recevier_id,
            notification_mute_type: { $ne: 4 }
          })
          if (check_mute_type) {
            muted = 1
            mute_type_detail = check_mute_type.notification_mute_type
          }
          let mute_detail_obj: any = {
            ismute: muted,
            mute_type: mute_type_detail,
            uid: uid,
            recevier_id: recevier_id,
            isgroup: isgroup
          }
          const myACKSocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (cid.toString() === item.cid.toString() && item.uid.toString() === uid.toString()) {
                myACKSocketIds.push(item.socket_id);
              }
            })
          );
          if (myACKSocketIds.length > 0) {
            io.to(myACKSocketIds).emit("ack_mute_notifiction_detail", {
              mute_detail: mute_detail_obj
            });
          }
        }
      });
      socket.on("send_edit_group", async function (data: any) {
        let group_id:any = data.group_id
        let group_name:any = data.group_name
        let description:any = data.description
        let group_image:any = data.group_image
        let cid:any = data.cid
        let is_admin_send_message:any = data.is_admin_send_message
        let post:any = null
        let group_users_arr:any [] = [];
        if(
            group_id !== undefined && group_id !== null &&
            group_name !== undefined && group_name !== null && 
            description !== undefined && description !== null && 
            group_image !== undefined && group_image !== null && 
            cid !== undefined && cid !== null && 
            is_admin_send_message !== undefined && is_admin_send_message !== null 
          ){
                const isAdmin = await group_members.find({
                  group_id: group_id,
                  is_admin: 1,
                  member_id: connection_uid,
                });
                if (isAdmin.length == 0) {
                  socket.disconnect();
                  return;
                }
            const tempPost: any = await group.findByIdAndUpdate(
              {
                _id: group_id
              },
              {
                group_name: group_name,
                description:description,
                group_image: group_image,
                is_admin_send_message:is_admin_send_message
              },
              {
                new: true,
                runValidators: true,
              }
            );
            if(tempPost){
              let get_group_user_detail:any = await group_members.find({
                group_id:group_id
            }).populate({
                path:"member_id",
                model:"user",
                select:"first_name last_name user_image"
              })
              group_users_arr = tempPost.group_users
              post = tempPost.toObject();
              post.group_users = get_group_user_detail
            }
          }
  
        const mySocketIds: any[] = [];
        await Promise.all(
          socket_users.map(async (item) => {
            if (group_users_arr.includes(item.uid.toString()) && item.cid.toString() === cid.toString()) {
              mySocketIds.push(item.socket_id);
            }
          })
        );
        if (mySocketIds.length > 0) {
          io.to(mySocketIds).emit("receive_edit_group", post);
        }
      });
      socket.on("user_messages", async function (data: any, callback: any) {
        const isValid = await isAuthorized(
          data.uid,
          connection_uid,
          socket
        );
        if (!isValid) {
          socket.disconnect();
          return;
        }
        if (data && data.last_message_date !== null) {
          const newSenders: any[] = [];
          const Message_date: any = moment(data.last_message_date).utc().format("YYYY-MM-DDTHH:mm:ss.sssZ")
          const getSenderList = await conversation.find({
            is_deleted: 0,
            $or: [
              { receiver_id: data.uid },
              { sender_id: data.uid }
            ],
            block_message_users: { $ne: data.uid },
            updatedAt: { $gt: Message_date }
          });
  
          let get_group_msg: any[] = await group_message_status.find({
            $or: [
              { receiver_id: data.uid },
              { sender_id: data.uid }
            ],
            updatedAt: { $gt: Message_date }
          }).distinct("message_id")
  
          let get_group_mes_detail: any[] = await group_conversation.find({
            _id: { $in: get_group_msg }
          })
  
  
          const myACKSocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === data.uid.toString() && item.cid.toString() === data.cid.toString()) {
                myACKSocketIds.push(item.socket_id);
              }
            })
          );
  
          if (myACKSocketIds.length > 0) {
            await Promise.all(
              getSenderList.map(async (item: any) => {
                let get_user_detail: any = await user.findOne({
                  _id: item.sender_id
                })
                socket_users.map(async (row: any) => {
                  if (!item.delete_message_users.includes(row.uid.toString()) && row.uid.toString() === item.receiver_id.toString() && row.uid.toString() != item.sender_id && row.cid.toString() === item.cid.toString()) {
                    let post: any = item.toObject();
                
                    let sender_detail:any = {
                      name:encryptDataname(get_user_detail.first_name ,get_user_detail.last_name,get_user_detail.eid),
                      image:get_user_detail.user_image
                    }
      
                      io.to(row.socket_id).emit("receive_message", {
                        message_detail:post,
                        isgroup:0,
                        sender_detail:sender_detail
                      });
                    
                  }
                })
              }))
      
            await Promise.all(
              get_group_mes_detail.map(async (item: any) => {
                let get_group_dteail: any = await group.findById({
                  _id: item.group_id
                })
                socket_users.map(async (row: any) => {
                  if (get_group_dteail.group_users.includes(row.uid.toString()) && row.uid.toString() != item.sender_id && row.cid.toString() === item.cid.toString()) {
                    let post: any = item.toObject();
                    let get_sender_detail:any = await user.findById({
                      _id:item.sender_id,
                      is_deleted:0
                    }).select("first_name last_name")
      
                    if(get_sender_detail){
                      post.sender_id = get_sender_detail
                    }
                    let sender_detail:any = {
                      name:get_group_dteail.group_name,
                      image:get_group_dteail.group_image
                    }
                    io.to(row.socket_id).emit("receive_message", {
                      message_detail:post,
                      isgroup:1,
                      sender_detail:sender_detail
                    });
                  }
                })
              }))
          }
          // if (getSenderList.length > 0) {
          //   await Promise.all(
          //     getSenderList.map(async (tempConversation: any) => {
          //       let newConversation = {
          //       };
          //       let post: any = tempConversation
          //       io.to(MySocketid).emit("receive_message", {
          //         post,
          //         newConversation,
          //       });
          //     }))
          // }
  
          // if (get_group_mes_detail.length > 0) {
          //   await Promise.all(
          //     get_group_mes_detail.map(async (post_detail: any) => {
          //       let get_sender_nm = await user.findById({
          //         _id: post_detail.sender_id
          //       })
          //       post_detail = post_detail.toObject();
          //       post_detail.sender_name = get_sender_nm
          //         ? get_sender_nm.first_name + " " + get_sender_nm.last_name
          //         : "";
          //       io.to(MySocketid).emit("group_receive_message", post_detail);
          //     }))
          // }
          //io.to(MySocketid).emit("last_messages", Messages_detail);
        }
      });
      socket.on("user_online_status",async function (data:any,callback:any){
        //console.log("user_online_status data",data)
        const isValid = await isAuthorized(
          data.uid,
          connection_uid,
          socket
        );
        if (!isValid) {
          socket.disconnect();
          return;
        }
        let receiver_id:any = data.receiver_id
        let uid:any = data.uid
        let cid:any = data.cid
  
        //console.log("socket called")
        
        if(receiver_id !== undefined && receiver_id !== null && mongoose.Types.ObjectId.isValid(receiver_id)){
          //console.log("socket if called")
          let get_user_detail:any = await user.findById({
            _id:receiver_id
          })
          if (get_user_detail) {
            //console.log("user detail get if called")
            let user_status: any = get_user_detail.is_online;
            let user_lastseen_time: any = get_user_detail.last_seen;
  
            let send_obj:any = {
              user_status:user_status,
              user_lastseen_time:user_lastseen_time,
              receiver_id:receiver_id,
              uid:uid,
              cid:cid
            }
  
            const sendrSocketIds: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (
                  item.uid.toString() === uid.toString() &&
                  item.cid.toString() === cid.toString()
                ) {
                  sendrSocketIds.push(item.socket_id);
                }
              })
            );
            //console.log("sendrSocketIds",sendrSocketIds)
            if (sendrSocketIds.length > 0) {
              io.to(sendrSocketIds).emit("ack_user_online_status", send_obj);
            }
          }
        }
      })
      socket.on("update_group_message_setting", async function (data: any) {
        try {
        socket.data.uid = connection_uid
        const isValid = await isAuthorizedGroup(
            data.group_id,
            data.uid,
            socket
          );
          if (!isValid) {
            socket.disconnect();
            return;
          }
        let uid: any = data.uid;
        let group_id: any= data.group_id
        let cid: any = data.cid
        let is_admin_send_message:any = data.is_admin_send_message;
        let group_detail:any = null;
        let post:any = null;
        let group_members_array:any [] = [];
  
        if (uid !== undefined && group_id !== undefined && cid !== undefined) {
          const isAdmin = await group_members.find({
            group_id: group_id,
            is_admin: 1,
            member_id: connection_uid,
          });

          if (!isAdmin || isAdmin.length === 0) {
            socket.disconnect();
            return;
          }

          group_detail = await group.findByIdAndUpdate(
            {
              _id: group_id,
            },
            {
              is_admin_send_message: is_admin_send_message,
            },
            {
              new: true,
              runValidators: true,
            }
          );

          let get_user_nm: any = await user.findById({
            _id: uid,
          });
          let raw_message = decryptData(get_user_nm?.first_name,get_user_nm.eid) + " " + decryptData(get_user_nm?.last_name) + " Change Group Message Setting"
          const message = encryptData(raw_message,get_user_nm.eid)
          const id1 = uuidv4();
          const id2 = uuidv4();
          const combined = `${id1}-${id2}`;
          post = new group_conversation();
          post.cid = cid;
          post.group_id = group_id;
          post.sender_id = uid;
          post.tmp_message_id = combined;
          post.originalName = "";
          post.message = message || "";
          post.message_type = MESSAGE.MESSAGE_TYPES.REGULAR;
          post.media_type =
            MESSAGE.MESSAGE_MEDIA_TYPES.GROUP_MESSAGE_SETING_UPDATE;
          post.reply_message_id = "";
          post.schedule_time = null;
          await post.save();

          if (group_detail) {
            let get_tmp_user: any[] = group_detail?.group_users;
            group_members_array = get_tmp_user;
          }
        }
       
          const ReciverSocketIds:any[] = [];
        await Promise.all(
          socket_users.map(async (item) => {
            if(group_members_array.includes(item.uid) && item.cid.toString() === cid.toString()){
              ReciverSocketIds.push(item.socket_id)
            }
          })
        );
  
        //console.log("ReciverSocketIds",ReciverSocketIds)
        if(ReciverSocketIds.length > 0){
          io.to(ReciverSocketIds).emit("ack_update_group_message_setting", {
            message_detail:post,
            group_detail:group_detail
          });
        }
      } catch (error) {
        console.log(error,"update_group_message_setting")
      } 
      });
      socket.on("user_last_activity", async function (data: any) {
        try {
          // console.log("user_last_activity called",data)
          let uid:any = data.uid
          let cid:any = data.uid
          let receiver_id:any = data.receiver_id
          // console.log("socket called")
  
          if(uid !== undefined && cid !== undefined && receiver_id !== undefined){
            // console.log("if called")
            let get_user_detail:any = await user.findById({
              _id:receiver_id
            })
            // console.log("user found",get_user_detail)
            if(get_user_detail){
              let post = {
                _id: get_user_detail._id,
                is_online: get_user_detail.is_online,
                last_seen: get_user_detail.last_seen,
                first_name:get_user_detail ? get_user_detail.first_name : "",
                last_name:get_user_detail ? get_user_detail.last_name : "",
                user_name:get_user_detail ? get_user_detail.user_name : "",
                user_image:get_user_detail ? get_user_detail.user_image : ""
              };
    
            const mySocketIds: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (
                  item.uid == data.uid && item.cid == data.cid
                ) {
                  mySocketIds.push(item.socket_id);
                } 
              })
            );
            console.log("mySocketIds",mySocketIds)
            if (mySocketIds.length > 0) {
              // console.log("debug post data diff issue", post)
              io.to(mySocketIds).emit("send_online_status", post);
            }
    
            }  
          }
        } catch (error: any) {
          console.log("error", error);
          if (data.uid !== undefined && data.uid !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.uid.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      });
      socket.on("initialize_call", async function (data: any) {
        try {
          console.log(data.caller_id,connection_uid,"ititialize call Auth check")
          const isValid = await isAuthorized(
            data.caller_id,
            connection_uid,
            socket
          );
          // console.log(isValid,"ititialize call Auth check is valid")
          if (!isValid) {
            socket.disconnect();
            return;
          }
          console.log(data.room_id,"initiilize call roomid")
          const callHistory = await call_history.findOne({
            room_id:data.room_id
          })
          if (!callHistory) {
            let caller_id = data.caller_id;
            let reciver_ids: any[] = data.reciver_id;
            let room_id = data.room_id;
            // console.log(room_id,"roomid")
            let isgroup: any =
              data.call_type == MESSAGE.CALL_TYPE.GROUPWITHAUIDO ||
              data.call_type == MESSAGE.CALL_TYPE.GROUPWITHVIEDIO
                ? 1
                : 0;
            const add_call = new call_history();
            add_call.cid = data.cid;
            add_call.group_id = isgroup ? data.group_id : null;
            add_call.caller_id = data.caller_id;
            add_call.reciver_id = data.reciver_id;
            add_call.leave_users = [];
            add_call.call_type = data.call_type;
            add_call.room_id = data.room_id;
            add_call.isgroup = isgroup;
            // console.log(add_call,"add call check")
            await add_call.save();
            // const rowdata =await call_history.findOneAndUpdate(
            //   {
            //     room_id: data.room_id,
            //   },
            //   {
            //     $push: { joined_users: data.uid },
            //   }
            // );
            // console.log(rowdata,"rowdata check")
            // socket.join(room_id);

            // const add_call_users = new call_user_status();
            // add_call_users.cid = data.cid;
            // add_call_users.caller_id = data.caller_id;
            // add_call_users.room_id = data.room_id;
            // await add_call_users.save();

            const myACKSocketIds: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (
                  data.cid === item.cid &&
                  reciver_ids.includes(item.uid.toString())
                ) {
                  // console.log("into map if part")
                  const is_inValidUser = await user_block.findOne({
                    $or: [
                      { block_by: caller_id, block_id: item.uid },
                      {
                        block_by: item.uid,
                        block_id: caller_id,
                      },
                    ],
                  });
                  if (!is_inValidUser) {
                    myACKSocketIds.push(item.socket_id);
                  }
                }
              })
            );

            let caller_name: any = "";
            let decrypted_caller_name: any = "";
            let group_users: any = 0;
            let group_name: any = "";
            let user_image: any = "";
            let group_image: any = "";

            let get_caller_nm: any = await user.findById({
              _id: data.caller_id,
            });
            if (get_caller_nm) {
              caller_name = encryptDataname(
                get_caller_nm.first_name,
                get_caller_nm.last_name,
                get_caller_nm.eid
              );
              decrypted_caller_name =
                decryptData(get_caller_nm.first_name, get_caller_nm.eid) +
                " " +
                decryptData(get_caller_nm.last_name, get_caller_nm.eid);
              user_image = get_caller_nm.user_image;
              group_users = 0;
            }
            let groupUsers: any;
            if (isgroup) {
              let get_group_nm: any = await group.findById({
                _id: data.group_id,
              });
              if (get_group_nm) {
                group_name = get_group_nm.group_name;
                group_users = get_group_nm.group_users.length || 0;
                group_image = get_group_nm.group_image;
                groupUsers = get_group_nm.group_users;
              }
            }

            // query active calls where any receiver is already in ongoing_users
            const busyUsers = await call_history
              .find({
                isCallEnded: 0, // active call only
                "ongoing_users.participant_id": { $in: reciver_ids },
                room_id: { $ne: data.room_id },
              })
              .distinct("ongoing_users.participant_id");

            // get only intersection (busy receivers)
            const actuallyBusy = reciver_ids.filter((id) =>
              busyUsers.map((u: any) => u.toString()).includes(id.toString())
            );
            if (actuallyBusy.length > 0) {
              const busyUserDocs = await user
                .find({ _id: { $in: actuallyBusy } })
                .select("first_name last_name")
                .lean();

              let customMessage = "";
              if (busyUserDocs.length === 1) {
                const u = busyUserDocs[0];
                customMessage = encryptData(
                  `${decryptData(u.first_name, connection_cid)} ${decryptData(
                    u.last_name,
                    connection_cid
                  )} is already on another call`,
                  connection_cid
                );
              } else {
                const names = busyUserDocs
                  .map(
                    (u: any) =>
                      `${decryptData(
                        u.first_name,
                        connection_cid
                      )} ${decryptData(u.last_name, connection_cid)}`
                  )
                  .join(", ");
                customMessage = encryptData(
                  `${names} are already on another call`,
                  connection_cid
                );
              }
              let is_group_all_member_busy: any;
              if (isgroup) {
                console.log(
                  data.caller_id,
                  actuallyBusy,
                  "group init call 00001"
                );
                const busyOtherUsersCount = actuallyBusy.filter(
                  (user: any) => user !== data.caller_id
                ).length;
                console.log(busyOtherUsersCount, "group init call 00001");
                if (busyOtherUsersCount == groupUsers.length - 1) {
                  console.log(groupUsers.length, "group init call 00001");
                  is_group_all_member_busy = true;
                } else {
                  is_group_all_member_busy = false;
                }
              }
              const mySocketIds: any[] = [];
              await Promise.all(
                socket_users.map(async (item) => {
                  if (item.uid == data.caller_id && item.cid == data.cid) {
                    mySocketIds.push(item.socket_id);
                  }
                })
              );
              console.log(
                "mySocketIds in intialize call mySocketISs and actuallyBusy",
                mySocketIds,
                actuallyBusy,
                customMessage
              );
              if (mySocketIds.length > 0) {
                const socketEmit =
                  !isgroup || (isgroup && is_group_all_member_busy == true);
                if (socketEmit) {
                  // io.to(mySocketIds).emit("user_busy_in_call", {
                  //   message: customMessage,
                  //   room_id: data.room_id,
                  //   busy_users: actuallyBusy,
                  // });
                }
              }
            }

            if (myACKSocketIds.length > 0) {
              console.log("sending ack");
              io.to(myACKSocketIds).emit("incoming_call", {
                caller_name: caller_name,
                group_name: group_name,
                group_image: group_image,
                user_image: user_image,
                caller_id: data.caller_id,
                group_id: data.group_id,
                call_type: data.call_type,
                room_id: data.room_id,
                group_length: group_users,
              });
            }

            let get_token_users: any[] = [];
            reciver_ids = reciver_ids.filter(function (val: any) {
              return val.toString() !== data.caller_id.toString();
            });
            await Promise.all(
              reciver_ids.map(async (row: any) => {
                let user_mute_notificaion_detail =
                  await notification_setting_users.findOne({
                    notification_mute_id: data.caller_id,
                    uid: row,
                    notification_mute_type: { $ne: 4 },
                    isgroup: 0,
                  });
                const is_inValidUser = await user_block.findOne({
                  $or: [
                    { block_by: caller_id, block_id: row },
                    {
                      block_by: row,
                      block_id: caller_id,
                    },
                  ],
                });
                if (user_mute_notificaion_detail == null) {
                  if (!is_inValidUser) {
                    get_token_users.push(row);
                  }
                }
              })
            );

            let getpushtokens = await user_tokens.find({
              uid: { $in: get_token_users },
              push_token: { $ne: "" },
              osversion: 1,
            });
            let tmp_tokens: any[] = [];
            if (getpushtokens.length > 0) {
              await Promise.all(
                getpushtokens.map(async (items: any) => {
                  tmp_tokens.push(items.push_token);
                })
              );
            }

            let title: any = "Incoming Call";
            let body: any = "Incoming Call";
            let token: any[] = tmp_tokens;

            if (token.length > 0) {
              let call_type_tmp: any;
              if (data.call_type == 1) {
                call_type_tmp =
                  MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHAUIDO.toString();
              } else {
                call_type_tmp =
                  MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHVIEDIO.toString();
              }
              let tmp_group_count: any = group_users;
              let notification_data: any = {
                type: data.call_type.toString(),
                id: data.caller_id,
                roomid: data.room_id.toString(),
                group_length: tmp_group_count.toString(),
                group_image: group_image,
                user_image: user_image,
                caller_name: caller_name,
                group_name: group_name,
                group_id: data.group_id ? data.group_id.toString() : "",
              };
              console.log(
                notification_data,
                "initialize call end notification end"
              );
              sendPushNotification(title, body, token, notification_data);
            }

            let getpushtokens_ios = await user_tokens.find({
              uid: { $in: get_token_users },
              apns_push_token: { $ne: "" },
              // osversion:2
            });
            let tmp_tokens_ios: any[] = [];
            if (getpushtokens_ios.length > 0) {
              await Promise.all(
                getpushtokens_ios.map(async (items: any) => {
                  tmp_tokens_ios.push(items.apns_push_token);
                })
              );
            }

            let token_ios: any[] = tmp_tokens_ios;
            if (token_ios.length > 0) {
              let call_type_tmp: any;
              if (data.call_type == 1) {
                call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHAUIDO;
              } else {
                call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHVIEDIO;
              }
              let notification_data: any = {
                caller_number: data.caller_id.toString(),
                "call-id": data.room_id.toString(),
                session_id: data.room_id.toString(),
                call_type: data.call_type,
                caller_id: data.call_type,
                signal_type: "startCall",
                caller_name: decrypted_caller_name.toString(),
                call_opponents: data.caller_id.toString(),
                user_info: data.caller_id.toString(),
                caller_image: user_image,
                group_id: data.group_id ? data.group_id.toString() : "",
              };
              console.log("initialize call end to ios notification end");
              sendPushNotificationios(
                title,
                body,
                token_ios,
                notification_data
              );
            }
          } else {
            // update call history
            await call_history.findOneAndUpdate(
              { room_id: data.room_id },
              {
                $pull: {
                  joined_users: { participant_id: data.caller_id },
                  reject_users: data.caller_id,
                  leave_users: { participant_id: data.caller_id },
                },
                // $push: {
                //   joined_users: {
                //     participant_id: data.caller_id,
                //     date_time: new Date(),
                //   },
                //   ongoing_users: {
                //     participant_id: data.caller_id,
                //     date_time: new Date(),
                //   },
                // },
              }
            );
          }
        } catch (error: any) {
          console.log("error", error);
          if (data.caller_id !== undefined && data.caller_id !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.caller_id.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      });
       socket.on("get_roomId", async function (data:any) {
        try {
          const isGroup = data.isGroup
          const groupId = data.groupId
          const recieverId = data.recieverId
          console.log(data,"debug get roomid")
          let groupData:any;
          let reciver_ids:any = [];
          if(isGroup){
            groupData = await group.findOne({
              _id:groupId
            })
            console.log(groupData.group_users,"debug get roomid 0325")
            reciver_ids = groupData.group_users
          }else{
            console.log(recieverId,"debug get roomid 03214545")
            reciver_ids = [recieverId]
          }
          console.log(reciver_ids,"debug get roomid 2201")
            const busyUsers = await call_history
              .find({
                isCallEnded: 0,
                "ongoing_users.participant_id": { $in: reciver_ids },
                room_id: { $ne: data.room_id },
              })
              .distinct("ongoing_users.participant_id");

            const actuallyBusy = reciver_ids.filter((id:any) =>
              busyUsers.map((u: any) => u.toString()).includes(id.toString())
            );
            console.log(busyUsers,actuallyBusy,"debug get roomid")
            let customMessage = "";
            if (actuallyBusy.length > 0) {
              const busyUserDocs = await user
                .find({ _id: { $in: actuallyBusy } })
                .select("first_name last_name")
                .lean();

              if (busyUserDocs.length === 1) {
                const u = busyUserDocs[0];
                customMessage = encryptData(`${decryptData(u.first_name,connection_cid)} ${decryptData(u.last_name,connection_cid)} is already on another call`,connection_cid);
              } else {
                const names = busyUserDocs
                  .map((u: any) => `${decryptData(u.first_name,connection_cid)} ${decryptData(u.last_name,connection_cid)}`)
                  .join(", ");
                customMessage = encryptData(`${names} are already on another call`,connection_cid);
              }
              console.log(customMessage,busyUserDocs,"debug get roomid")
            }
            let is_group_all_member_busy:any;
            let roomid : any;
            let encryptedNames:any = [];
            let callType:any = 3;
            let alreadyCallrunning:any = false;
              if(isGroup){
                const callhistoryData:any = await call_history
                .findOne({
                    isCallEnded: 0,
                    group_id:groupId
                })
                if(callhistoryData){
                  callType = callhistoryData.call_type
                  roomid = callhistoryData.room_id
                  alreadyCallrunning= true
                  const participantIds = callhistoryData.ongoing_users.map(
                    (u: any) => new mongoose.Types.ObjectId(u.participant_id)
                  );

                      const users = await user.find(
      { _id: { $in: participantIds } },
      { first_name: 1, last_name: 1, eid: 1 }
    );
    encryptedNames = users.map((u: any) =>
      encryptDataname(u.first_name, u.last_name, u.eid)
    );
          console.log(encryptedNames,"encryptedNames list 2054")

                }else{
                  const id1 = uuidv4();
                  // const id2 = Date.now();
                  roomid = id1;
                  alreadyCallrunning=false
                }

                const mySocketIds: any[] = [];
                await Promise.all(
                 socket_users.map(async (item) => {
                    if (item.uid == connection_uid) {
                    mySocketIds.push(item.socket_id);
                    }
                })
              );
              console.log(mySocketIds,"debug get roomid ack_get_roomId")
              if (mySocketIds.length > 0) {
                  io.to(mySocketIds).emit("ack_get_roomId", {
                    roomId: roomid,
                    alreadyInCallUsers:encryptedNames,
                    alreadyCallrunning:alreadyCallrunning,
                    callType:callType
                  });
              }
              }else{
                let roomId:any;
                if(actuallyBusy.length==0){
                  const id1 = uuidv4();
                  // const id2 = Date.now();
                  roomId = id1;
                  const mySocketIds: any[] = [];
              await Promise.all(
                socket_users.map(async (item) => {
                  if (item.uid == connection_uid) {
                    mySocketIds.push(item.socket_id);
                  }
                })
              );
              console.log("debug get roomid ack_get_roomId")
              if (mySocketIds.length > 0) {
                  io.to(mySocketIds).emit("ack_get_roomId", {
                    roomId: roomId,
                  });
              }
                }else{
                const mySocketIds: any[] = [];
                await Promise.all(
                socket_users.map(async (item) => {
                  if (item.uid == connection_uid) {
                    mySocketIds.push(item.socket_id);
                  }
                })
              );
              console.log(mySocketIds,"user_busy_in_call ")
              if (mySocketIds.length > 0) {
                const socketEmit = !isGroup || (isGroup &&is_group_all_member_busy == true)
                if(socketEmit){
                  io.to(mySocketIds).emit("user_busy_in_call", {
                    message: customMessage,
                    // room_id: data.room_id,
                    busy_users: actuallyBusy,
                  });}
              }
                }
              }
        } catch (error) {
          console.log("error", error);
        }
      })
      socket.on("join_call", async function (data: any) {
        try {
            const reciver_id = data.reciver_id
            const room_id = data.room_id
            const objectIdReceiver = new mongoose.Types.ObjectId(reciver_id);

            let get_call_detail: any = await call_history.findOne({
              room_id: room_id
            })
    
            if (get_call_detail.joined_users.length == 1) {
              await call_history.findOneAndUpdate({
                room_id: room_id
              }, {
                // $push: { joined_users: objectIdReceiver },
                call_start_time: new Date()
              })
            } else {
              // await call_history.findOneAndUpdate({
              //   room_id: room_id
              // }, {
              //   $push: { joined_users: objectIdReceiver }
              // })
            }
    
            let get_reciver_nm: any = await user.findById(
              reciver_id
            )
    
  
            const add_call_users  =  await call_user_status.findOneAndUpdate({
              caller_id:data.reciver_id,
              room_id:data.room_id,
              cid:get_reciver_nm.cid
            },{
              caller_id:data.reciver_id,
              room_id:data.room_id,
              cid:get_reciver_nm.cid
            },{
              new:true,
              upsert:true
            })
    
            const reciver_user_nm = encryptDataname(get_reciver_nm.first_name, get_reciver_nm.last_name,get_reciver_nm.eid)
    
            let join_users = get_call_detail.joined_users
            console.log(join_users,"myACKSocketIds for ack_join_call 0")
    
            const myACKSocketIds: any[] = []
            const SameUserACKSocketIds: any[] = []
            await Promise.all(
              socket_users.map(async (item) => {
                if (join_users.includes(item.uid.toString())) {
            console.log(item.uid,"myACKSocketIds for ack_join_call 1")
                  myACKSocketIds.push(item.socket_id);
                }
              })
            );
            console.log(myACKSocketIds,"myACKSocketIds for ack_join_call 2")
            await Promise.all(
              socket_users.map((async (item)=>{
                if(item.uid == reciver_id && socket.id != item.socket_id){
                  SameUserACKSocketIds.push(item.socket_id)
                }
              }))
            )
            if(SameUserACKSocketIds.length>0){
              socket.to(SameUserACKSocketIds).emit("ack_initalize_call_end",{
                call_type: get_call_detail.call_type,
                room_id: room_id,
                caller_id:get_call_detail.caller_id
              })
            }
            const post = {
              uid: reciver_id,
              user_name: reciver_user_nm
            }
            socket.join(room_id);
            if(myACKSocketIds.length>0){
              socket.to(myACKSocketIds).emit("ack_join_call", post)
            }
          
            let getpushtokens = await user_tokens.find({
              uid: reciver_id,
              device_id:{$ne:connection_device_id},
              push_token: { $ne: "" },
              osversion:1
            })
            let tmp_tokens: any[] = [];
             if (getpushtokens.length > 0) {
              await Promise.all(getpushtokens.map(async (items: any) => {
              tmp_tokens.push(items.push_token)
            }))
            }
            let title: any ="End Call";
            let body: any = "End Call";
            let token: any[] = tmp_tokens
            if (token.length > 0) {
              let call_type_tmp: any;
              if (get_call_detail.call_type== 1) {
                call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.AUDIO.toString()
              } else {
                call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO.toString()
              }
              let notification_data: any = {
                type: get_call_detail.call_type.toString(),
                roomid: data.room_id.toString()
              }
                
              sendPushNotification(title, body, token, notification_data);
            }    
        } catch (error: any) {
          console.log("error", error);
          if (data.sender_id !== undefined && data.sender_id !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.sender_id.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      });
      // socket.on("leave_call", async function (data: any) {
      //   try {
      //       const reciver_id = data.reciver_id
      //       const room_id = data.room_id
    
      //       let get_reciver_nm: any = await user.findById({
      //         _id: reciver_id
      //       })
    
      //       await call_user_status.findOneAndDelete({
      //         caller_id: data.reciver_id,
      //         room_id: room_id
      //       })
  
      //       await call_history.findOneAndUpdate({
      //         room_id: room_id
      //       }, {
      //         $push: { leave_users: reciver_id }
      //       })
    
      //       const reciver_user_nm = encryptDataname(get_reciver_nm.first_name , get_reciver_nm.last_name,get_reciver_nm.eid)
      //       const post = {
      //         uid: reciver_id,
      //         user_name: reciver_user_nm
      //       }
    
      //       socket.to(room_id).emit("ack_leave_call", post)
      //       socket.leave(room_id)
      //   } catch (error: any) {
      //     console.log("error", error);
      //     if (data.sender_id !== undefined && data.sender_id !== null) {
      //       const emiter_arr: any[] = [];
      //       await Promise.all(
      //         socket_users.map(async (item) => {
      //           if (item.uid.toString() === data.sender_id.toString()) {
      //             emiter_arr.push(item.socket_id);
      //           }
      //         })
      //       );
      //       if (emiter_arr.length > 0) {
      //         let get_error: any = JSON.stringify(error.toString());
      //         io.to(emiter_arr).emit("Socket_emit_error", get_error);
      //       }
      //     }
      //   }
      // });
      socket.on("add_call_user", async function (data: any) {
        try {
          console.log("add_call_user socket emited", data);
          const reciver_id = data.reciver_id;
          const room_id = data.room_id;
          const caller_id = data.caller_id;
          const group_id = data.group_id;
          const call_type = data.call_type;
          let isgroup: any =
            call_type == MESSAGE.CALL_TYPE.GROUPWITHAUIDO ||
            call_type == MESSAGE.CALL_TYPE.GROUPWITHVIEDIO
              ? 1
              : 0;

          let caller_name: any = "";
          let group_users: any = 0;
          let group_name: any = "";
          let user_image: any = "";
          let group_image: any = "";

          let get_caller_nm: any = await user.findById({
            _id: data.caller_id,
          });
          if (get_caller_nm) {
            caller_name =
              encryptDataname(get_caller_nm.first_name ,get_caller_nm.last_name,get_caller_nm.eid);
            user_image = get_caller_nm.user_image;
            group_users = 0;
          }
          if (isgroup) {
            let get_group_nm: any = await group.findById({
              _id: data.group_id,
            });
            if (get_group_nm) {
              group_name = get_group_nm.group_name;
              group_users = get_group_nm.group_users.length || 0;
              group_image = get_group_nm.group_image;
            }
          }

          await call_history.findOneAndUpdate(
            {
              room_id: room_id,
            },
            {
              $addToSet: { reciver_id: reciver_id },
            }
          );

          // let get_reciver_nm: any = await user.findById({
          //   _id: reciver_id
          // })
          //const caller_user_nm: any = get_reciver_nm.group_name
          //socket.join(room_id)

          const busyUsers = await call_history
            .find({
              isCallEnded: 0, // active calls only
              "ongoing_users.participant_id": { $in: reciver_id },
              room_id: { $ne: room_id }, // exclude current room
            })
            .distinct("ongoing_users.participant_id");

          const actuallyBusy = reciver_id.filter((id: any) =>
            busyUsers.map((u: any) => u.toString()).includes(id.toString())
          );

          if (actuallyBusy.length > 0) {
            // get names for busy users
            const busyUserDocs = await user
              .find({ _id: { $in: actuallyBusy } })
              .select("first_name last_name")
              .lean();

            let customMessage = "";
            if (busyUserDocs.length === 1) {
              const u = busyUserDocs[0];
              customMessage = `${u.first_name} ${u.last_name} is already on another call`;
            } else {
              const names = busyUserDocs
                .map((u) => `${u.first_name} ${u.last_name}`)
                .join(", ");
              customMessage = `${names} are already on another call`;
            }

            const mySocketIds: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid == caller_id && item.cid == data.cid) {
                  mySocketIds.push(item.socket_id);
                }
              })
            );

            if (mySocketIds.length > 0) {
              // io.to(mySocketIds).emit("user_busy_in_call", {
              //   message: customMessage,
              //   room_id: room_id,
              //   busy_users: actuallyBusy,
              // });
            }
          }

          const myACKSocketIds: any[] = [];
          const myACKSocketIds_user: any = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (data.cid === item.cid && reciver_id.includes(item.uid)) {
                const is_inValidUser = await user_block.findOne({
                  $or: [
                    { block_by: caller_id, block_id: item.uid },
                    {
                      block_by: item.uid,
                      block_id: caller_id,
                    },
                  ],
                });
                if (!is_inValidUser) {
                  myACKSocketIds.push(item.socket_id);
                  myACKSocketIds_user.push(item.uid);
                }
              }
            })
          );
          if (myACKSocketIds.length > 0) {
            io.to(myACKSocketIds).emit("incoming_call", {
              caller_name: caller_name,
              group_name: group_name,
              group_image: group_image,
              user_image: user_image,
              caller_id: caller_id,
              group_id: group_id,
              call_type: call_type,
              room_id: room_id,
              group_length: group_users,
            });
          }
          let getpushtokens = await user_tokens.find({
            uid: { $in: reciver_id },
            push_token: { $ne: "" },
            osversion: 1,
          });
          let tmp_tokens: any[] = [];
          if (getpushtokens.length > 0) {
            await Promise.all(
              getpushtokens.map(async (items: any) => {
                let user_mute_notificaion_detail =
                  await notification_setting_users.findOne({
                    notification_mute_id: data.caller_id,
                    uid: items.uid,
                    notification_mute_type: { $ne: 4 },
                    isgroup: 0,
                  });
                const is_inValidUser = await user_block.findOne({
                  $or: [
                    { block_by: caller_id, block_id: items.uid },
                    {
                      block_by: items.uid,
                      block_id: caller_id,
                    },
                  ],
                });
                if (user_mute_notificaion_detail == null) {
                  if (!is_inValidUser) {
                    tmp_tokens.push(items.push_token);
                  }
                }
              })
            );
          }
          let title: any = "Incoming Call";
          let body: any = "Incoming Call";
          let token: any[] = tmp_tokens;

          if (token.length > 0) {
            let call_type_tmp: any;
            if (data.call_type == 1) {
              call_type_tmp =
                MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHAUIDO.toString();
            } else {
              call_type_tmp =
                MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHVIEDIO.toString();
            }
            //let tmp_group_count:any = get_reciver_nm?.group_users.length
            let notification_data: any = {
              type: data.call_type.toString(),
              id: data.caller_id,
              roomid: data.room_id.toString(),
              group_length: group_users.toString(),
              caller_name: caller_name,
              group_name: group_name,
              group_image: group_image,
              user_image: user_image,
              group_id: group_id,
            };
            sendPushNotification(title, body, token, notification_data);
          }

          let getpushtokens_ios = await user_tokens.find({
            uid: data.reciver_id,
            apns_push_token: { $ne: "" },
          });
          let tmp_tokens_ios: any[] = [];
          if (getpushtokens_ios.length > 0) {
            await Promise.all(
              getpushtokens_ios.map(async (items: any) => {
                tmp_tokens_ios.push(items.apns_push_token);
              })
            );
          }

          let token_ios: any[] = tmp_tokens_ios;

          if (token_ios.length > 0) {
            let call_type_tmp: any;
            if (data.call_type == 1) {
              call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHAUIDO;
            } else {
              call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHVIEDIO;
            }
            const decrypted_caller_name = decryptData(caller_name,get_caller_nm.eid)
            let notification_data: any = {
              caller_number: data.caller_id.toString(),
              "call-id": data.room_id.toString(),
              session_id: data.room_id.toString(),
              call_type: data.call_type,
              caller_id: data.call_type,
              signal_type: "startCall",
              caller_name: decrypted_caller_name.toString(),
              call_opponents: data.caller_id.toString(),
              user_info: data.caller_id.toString(),
              caller_image: user_image,
              group_id: data.group_id ? data.group_id.toString() : "",
            };
            sendPushNotificationios(title, body, token_ios, notification_data);
          }
        } catch (error: any) {
          console.log("error", error);
          if (data.sender_id !== undefined && data.sender_id !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.sender_id.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      });
      // socket.on("end_call", async function (data: any) {
      //   try {
      //       const room_id = data.room_id
      //       const user_id = data.user_id
      //       let get_calld_etail: any = await call_history.findOne({
      //         room_id: room_id
      //       })
      //       let call_users: any[] = [];
      //       if (get_calld_etail) {
      //         call_users = get_calld_etail.joined_users
      //       }
      //       let post = {
      //         room_id: room_id
      //       }
      //       if (get_calld_etail !== null && call_users.length == 2) {
      //         socket.leave(room_id)
    
      //         let get_call_start: any = get_calld_etail.call_start_time
      //         let call_end_time: any = moment().utc().format("YYYY-MM-DDTHH:mm:ss.sssZ")
      //         let startTime: any = moment(get_call_start, "YYYY-MM-DDTHH:mm:ss.sssZ").format("YYYY-MM-DD HH:mm:ss")
      //         let endTime: any = moment(call_end_time, "YYYY-MM-DDTHH:mm:ss.sssZ").format("YYYY-MM-DD HH:mm:ss")
      //         let duration: any = moment.duration(moment(endTime).diff(moment(startTime)))
      //         var seconds: any = duration.asSeconds();
    
      //         let totalSeconds = seconds;
      //         let hours_tmp: any = Math.floor(totalSeconds / 3600);
      //         totalSeconds %= 3600;
      //         let minutes: any = Math.floor(totalSeconds / 60);
      //         let seconds_tmp: any = totalSeconds % 60;
    
      //         minutes = String(minutes).padStart(2, "0");
      //         hours_tmp = String(hours_tmp).padStart(2, "0");
      //         seconds_tmp = String(seconds_tmp).padStart(2, "0");
      //         let duration_time: any = hours_tmp + ":" + minutes + ":" + seconds_tmp;
    
      //         await call_history.findOneAndUpdate({
      //           room_id: room_id
      //         },
      //           {
      //             call_Duration: duration_time
      //           }, {
      //           runValidators: true
      //         })
      //         let join_users = get_calld_etail.joined_users
    
      //         const myACKSocketIds: any[] = []
      //         await Promise.all(
      //           socket_users.map(async (item) => {
      //             if (join_users.includes(item.uid.toString())) {
      //               myACKSocketIds.push(item.socket_id);
      //             }
      //           })
      //         );
      //         socket.to(myACKSocketIds).emit("ack_end_call", post)
      //         const get_joined_clients = await io.in(room_id).fetchSockets()
      //         for (const socketref of get_joined_clients) {
      //           socketref.leave(room_id);
      //         }
      //         // await call_user_status.deleteMany({
      //         //   room_id: room_id
      //         // })
  
      //         let getpushtokens = await user_tokens.find({
      //           uid: { $in: call_users },
      //           push_token: { $ne: "" },
      //           push_type:0,
      //           osversion:1
      //         })
      //         let tmp_tokens: any[] = [];
      //         if (getpushtokens.length > 0) {
      //           await Promise.all(getpushtokens.map(async (items: any) => {
      //             tmp_tokens.push(items.push_token)
      //           }))
      //         }
      //         let title: any ="End Call";
      //         let body: any = "End Call";
      //         let token: any[] = tmp_tokens
      
      //         if (token.length > 0) {
      //           let call_type_tmp: any;
      //           if (get_calld_etail.call_type== 1) {
      //             call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.AUDIO.toString()
      //           } else {
      //             call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO.toString()
      //           }
      //           let notification_data: any = {
      //             type: call_type_tmp,
      //             roomid: room_id.toString()
      //           }
      //           sendPushNotification(title, body, token, notification_data);
      //         }
      //         // let getpushtokens_ios = await user_tokens.find({
      //         //   uid: { $in: call_users },
      //         //   apns_push_token: { $ne: "" },
      //         //   push_type:1
      //         // })
      //         // console.log(getpushtokens_ios,"getpushtokens_ios")
      //         // let tmp_tokens_ios: any[] = [];
      //         // if (getpushtokens_ios.length > 0) {
      //         //   await Promise.all(getpushtokens_ios.map(async (items: any) => {
      //         //     tmp_tokens_ios.push(items.apns_push_token)
      //         //   }))
      //         // }
           
      //         // let token_ios: any[] = tmp_tokens_ios
      
      //         // if (token_ios.length > 0) {
      //         //   let call_type_tmp: any;
      //         //   if (get_calld_etail.call_type== 1) {
      //         //     call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.AUDIO.toString()
      //         //   } else {
      //         //     call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO.toString()
      //         //   }
      //         //   let notification_data: any = {
      //         //     type: call_type_tmp,
      //         //     roomid: room_id.toString()
      //         //   }
      //         //   //sendPushNotificationios(title, body, token_ios, notification_data);
      //         // }
      //       }
          
      //   } catch (error: any) {
      //     console.log("error", error);
      //     if (data.sender_id !== undefined && data.sender_id !== null) {
      //       const emiter_arr: any[] = [];
      //       await Promise.all(
      //         socket_users.map(async (item) => {
      //           if (item.uid.toString() === data.sender_id.toString()) {
      //             emiter_arr.push(item.socket_id);
      //           }
      //         })
      //       );
      //       if (emiter_arr.length > 0) {
      //         let get_error: any = JSON.stringify(error.toString());
      //         io.to(emiter_arr).emit("Socket_emit_error", get_error);
      //       }
      //     }
      //   }
      // });
      socket.on("initialize_call_end", async function (data: any) {
        try {
            let caller_id:any = data.caller_id
            let call_users_tmp_array:any  = []
  
            let get_call_detail:any = await call_history.findOne({
              room_id:data.room_id,
            })
            await call_history.findOneAndUpdate({
              room_id:data.room_id,
            },
          {
          isCallEnded:1
          })
            console.log("initalize_group_call_end socket emited")
  
                console.log("second if called")
                let filtered_receiver_ids: any = await call_history.aggregate([
                  {
                    $match: { room_id: data.room_id },
                  },
                  {
                    $project: {
                      filtered_receiver_ids: {
                        $filter: {
                          input: "$reciver_id",
                          as: "receiver",
                          cond: { $not: { $in: ["$$receiver", "$joined_users"] } },
                        },
                      },
                      _id: 0,
                    },
                  },
                  {
                    $project: {
                      filtered_receiver_ids: {
                        $map: {
                          input: "$filtered_receiver_ids",
                          as: "id",
                          in: { $toString: "$$id" },
                        },
                      },
                    },
                  },
                ]);
               
                let invite_users_array:any = []
                if (filtered_receiver_ids.length > 0) {
                  invite_users_array = filtered_receiver_ids[0].filtered_receiver_ids
                }
                call_users_tmp_array = invite_users_array
                console.log("call_users_tmp_array",call_users_tmp_array)
                //console.log("socket_users",socket_users)
                const myACKSocketIds: any[] = []
                await Promise.all(
                  socket_users.map(async (item:any) => {
                    //console.log("socket_user_map",item)
                    if (data.cid === item.cid && invite_users_array.includes(item.uid.toString())) {
                      console.log("item",item)
                      myACKSocketIds.push(item.socket_id);
                    }
                  })
                );
  
                if (myACKSocketIds.length > 0) {
                  io.to(myACKSocketIds).emit("ack_initalize_call_end", {
                    call_type: data.call_type,
                    room_id: data.room_id,
                    caller_id:caller_id
                  });
                }
              
              let getpushtokens = await user_tokens.find({
                uid: { $in: call_users_tmp_array },
                push_token: { $ne: "" },
                osversion:1
              })
              console.log("getpushtokens",getpushtokens)
              let tmp_tokens: any[] = [];
              if (getpushtokens.length > 0) {
                await Promise.all(getpushtokens.map(async (items: any) => {
                  tmp_tokens.push(items.push_token)
                }))
              }
              let title: any ="End Call";
              let body: any = "End Call";
              let token: any[] = tmp_tokens
              console.log("tmp_tokens",tmp_tokens)
              if (token.length > 0) {
                console.log("if called token")
                let call_type_tmp: any;
                if (get_call_detail.call_type== 1) {
                  call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.AUDIO.toString()
                } else {
                  call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO.toString()
                }
                let notification_data: any = {
                  type: get_call_detail.call_type.toString(),
                  roomid: data.room_id.toString()
                }
                setTimeout(()=>{
                  console.log("reday to send push")
                  sendPushNotification(title, body, token, notification_data);
                },2000)
              }
  
              let getpushtokens_ios = await user_tokens.find({
                uid: { $in: call_users_tmp_array },
                apns_push_token: { $ne: "" },
                push_type:1
              })
              let tmp_tokens_ios: any[] = [];
              if (getpushtokens_ios.length > 0) {
                await Promise.all(getpushtokens_ios.map(async (items: any) => {
                  tmp_tokens_ios.push(items.apns_push_token)
                }))
              }
              // logic for misscall list 
              let get_call_data:any = await call_history.findOne({
               room_id:data.room_id,
              }).populate({
                path: "caller_id",
                select: "first_name last_name email eid" 
              });
              const callerName = get_call_data.caller_id
              const receiverIds = get_call_data.reciver_id || [];
              const callerId = get_call_data.caller_id;
              const usersToCheck = [...receiverIds]
              const joinedUserIds = get_call_data.joined_users?.map((item:any) => item.participant_id) || [];
              let notJoinedUsers = usersToCheck.filter(uid => !joinedUserIds.includes(uid));
              notJoinedUsers = notJoinedUsers.filter(uid => uid.toString() !== callerId.toString());
              console.log(notJoinedUsers,"notJoinedUsers list")
              let getpushtokensformisscall = await user_tokens.find({
                uid: { $in: notJoinedUsers },
                push_token: { $ne: "" },
              })
              let tmp_tokens_misscall: any[] = [];
              if (getpushtokensformisscall.length > 0) {
                await Promise.all(getpushtokensformisscall.map(async (items: any) => {
                  tmp_tokens_misscall.push(items.push_token)
                }))
              }
              let title_missed: any;
              if(get_call_data.call_type == MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHAUIDO || get_call_data.call_type == MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHVIEDIO){
                const groupdata:any = await group.findOne({
                  _id:get_call_data.group_id
                })
                title_missed = decryptData(groupdata.group_name, groupdata.cid)
              }else{
                title_missed =decryptData(callerName?.first_name,callerName?.eid)+" "+decryptData(callerName?.last_name,callerName?.eid);
              }
              let body_missed: any 
              if(get_call_data.call_type == MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO || get_call_data.call_type == MESSAGE.PUSH_NOTIFICATION_TYPE.GROUPWITHVIEDIO){
                body_missed  = "☎️ Missed video call";
              }else{
                body_missed = "☎️ Missed voice call"
              }
              let token_missed: any[] = tmp_tokens_misscall
              console.log("tmp_tokens_misscall",tmp_tokens_misscall)
                if (token_missed.length > 0) {
                console.log("if called token")
                let notification_data: any = {
                  type: MESSAGE.PUSH_NOTIFICATION_TYPE.MISSEDCALL.toString(),
                  roomid: data.room_id.toString()
                }
                let isMutable = 0
                sendPushNotification(title_missed, body_missed, token_missed, notification_data, isMutable);
              }
              // logic for misscall list end
              let token_ios: any[] = tmp_tokens_ios
      
              if (token_ios.length > 0) {
                let call_type_tmp: any;
                if (get_call_detail.call_type== 1) {
                  call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.AUDIO.toString()
                } else {
                  call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO.toString()
                }
                let notification_data: any = {
                  type: call_type_tmp,
                  roomid: data.room_id.toString()
                }
                //sendPushNotificationios(title, body, token_ios, notification_data);
              }
        } catch (error: any) {
          console.log("error", error);
        }
      });
      socket.on("incoming_call_reject", async function (data: any) {
        try {
          console.log("incoming_call_reject socket called",data)
          let uid: any = data.uid
          let room_id: any = data.room_id
          
          const mySocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item:any) => {
              if (uid.toString() ==  item.uid.toString()) {
                mySocketIds.push(item.socket_id);
              } 
            })
          );
       if (mySocketIds.length > 0) {
        io.to(mySocketIds).emit("ack_incoming_call_reject",{
          room_id
        });
      }
  
        } catch (error: any) {
          console.log("error", error);
        }
      });
      socket.on("last_user_end_call", async function (data:any) {
        try {
        let room_id: any = data.room_id
        const callData:any = await call_history.findOne({
          room_id:room_id
        })
        let recieverUser = callData.reciver_id || []
        console.log(recieverUser,"recieverUser list last_user_end_call")
        const mySocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item:any) => {
              if (recieverUser.includes(item.uid.toString())) {
                    mySocketIds.push(item.socket_id);
              }
            })
          );
          console.log(mySocketIds,"mySocketIds in last_user_end_call")
       if (mySocketIds.length > 0) {
        io.to(mySocketIds).emit("ack_initalize_call_end",{
          room_id
        });
      }
      let getpushtokens = await user_tokens.find({
        uid: { $in: recieverUser },
        push_token: { $ne: "" },
        osversion:1
      })
      let getpushtokensIos = await user_tokens.find({
        uid: { $in: recieverUser },
        push_token: { $ne: "" },
        osversion:2
      })
      let tmp_tokens: any[] = [];
      let tmp_tokens_ios: any[] = [];
      if (getpushtokens.length > 0) {
        await Promise.all(getpushtokens.map(async (items: any) => {
        tmp_tokens.push(items.push_token)
        }))
      }
      if (getpushtokensIos.length > 0) {
        await Promise.all(getpushtokensIos.map(async (items: any) => {
        tmp_tokens_ios.push(items.push_token)
        }))
      }
      let title: any ="End Call";
      let body: any = "End Call";
      let token: any[] = tmp_tokens
      let token_ios: any[] = tmp_tokens_ios
      
      if (token.length > 0) {
        let call_type_tmp: any;
        if (callData.call_type== 1) {
          call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.AUDIO.toString()
        } else {
          call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO.toString()
        }
        let notification_data: any = {
          type: call_type_tmp,
          roomid: room_id.toString()
        }
        sendPushNotification(title, body, token, notification_data);
      }if(token_ios.length > 0){
        let call_type_tmp: any;
        if (callData.call_type== 1) {
          call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.AUDIO.toString()
        } else {
          call_type_tmp = MESSAGE.PUSH_NOTIFICATION_TYPE.VIDEO.toString()
        }
        let notification_data: any = {
          type: call_type_tmp,
          roomid: room_id.toString()
        }
        sendPushNotificationios(title, body, token_ios, notification_data);
      }
        } catch (error) {
          console.log(error,"last_user_end_call socket error")
        }
      })
      socket.on("group_details_info",async function (data: any){
        try {
          const isValid = await isAuthorized(
          data.uid,
          connection_uid,
          socket
        );
        if (!isValid) {
          socket.disconnect();
          return;
        }
          let group_id: any = data.group_id;
          let last_activity_time: any = data.last_activity_time;
          let uid: any = data.uid;
          let device_id: any = data.device_id;
  
          if (
            mongoose.Types.ObjectId.isValid(group_id) ||
            (mongoose.Types.ObjectId.isValid(uid) &&
              moment(last_activity_time, "YYYY-MM-DDTHH:mm:ss.sss").isValid())
          ) {
            let last_message_time: any = moment(
              last_activity_time,
              "YYYY-MM-DDTHH:mm:ss.sss"
            ).format("YYYY-MM-DDTHH:mm:ss.sssZ");
            let get_year: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("YYYY");
            let get_month: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("MM");
            let get_day: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("DD");
            let get_hour: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("HH");
            let get_minutes: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("mm");
            let get_seconds: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("ss");
            let get_miliseconds: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("sss");
  
            let get_int_month: any = parseFloat(get_month) - 1;
  
            let new_tmp_date: any = new Date();
            console.log("new_tmp_date",new_tmp_date)
            new_tmp_date.setUTCFullYear(get_year);
            new_tmp_date.setUTCMonth(get_int_month);
            new_tmp_date.setUTCDate(get_day);
            new_tmp_date.setUTCHours(get_hour);
            new_tmp_date.setUTCMinutes(get_minutes);
            new_tmp_date.setUTCSeconds(get_seconds);
            new_tmp_date.setUTCMilliseconds(get_miliseconds);
            last_message_time = new_tmp_date;
  
            let check_group_detail: any = await group.findById({
              _id: group_id,
            });
  
            if (check_group_detail) {
              let get_group_user_detail: any = await group_members
                .find({
                  group_id: group_id
                })
                .populate({
                  path: "member_id",
                  model: "user",
                  select: "first_name last_name user_image",
                });
              let post = check_group_detail.toObject();
              post.group_users = get_group_user_detail;
  
              let mySocketIds: any[] = [];
              await Promise.all(
                socket_users.map(async (item) => {
                  if (
                    item.uid.toString() === data.uid.toString() &&
                    item.device_id.toString() === device_id.toString()
                  ) {
                    mySocketIds.push(item.socket_id);
                  }
                })
              );
              if (mySocketIds.length > 0) {
                io.to(mySocketIds).emit("receive_edit_group", post);
              }
            }
          }
        } catch (error: any) {
          console.log("error", error);
          if (data.uid !== undefined && data.uid !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.uid.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      })
      socket.on("user_last_info",async function (data: any){
        try {
          const isValid = await isAuthorized(
            data.uid,
            connection_uid,
            socket
          );
          if (!isValid) {
            socket.disconnect();
            return;
          }
          console.log("user_last_info",data)
          let last_activity_time: any = data.last_activity_time;
          let uid: any = data.uid;
          let device_id: any = data.device_id;
          let get_user_connection:any []= socket_users.filter((item)=>item.device_id.toString() === device_id.toString() && item.uid.toString() === uid.toString())
  
          if (mongoose.Types.ObjectId.isValid(uid) && moment(last_activity_time, "YYYY-MM-DDTHH:mm:ss.sss").isValid()) 
          {
            let last_message_time: any = moment(
              last_activity_time,
              "YYYY-MM-DDTHH:mm:ss.sss"
            ).format("YYYY-MM-DDTHH:mm:ss.sssZ");
            let get_year: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("YYYY");
            let get_month: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("MM");
            let get_day: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("DD");
            let get_hour: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("HH");
            let get_minutes: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("mm");
            let get_seconds: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("ss");
            let get_miliseconds: any = moment(
              last_message_time,
              "YYYY-MM-DDTHH:mm:ss.sssZ"
            ).format("sss");
  
            let get_int_month: any = parseFloat(get_month) - 1;
  
            let new_tmp_date: any = new Date();
            console.log("new_tmp_date",new_tmp_date)
            new_tmp_date.setUTCFullYear(get_year);
            new_tmp_date.setUTCMonth(get_int_month);
            new_tmp_date.setUTCDate(get_day);
            new_tmp_date.setUTCHours(get_hour);
            new_tmp_date.setUTCMinutes(get_minutes);
            new_tmp_date.setUTCSeconds(get_seconds);
            new_tmp_date.setUTCMilliseconds(get_miliseconds);
            last_message_time = new_tmp_date;
            last_message_time = new Date(last_message_time)
  
          
              let get_one_to_one_msg:any = await conversation.find({
                delete_message_users: {$in:uid},
                createdAt: { $gte: last_message_time },
              })
              if (get_one_to_one_msg.length > 0) {
                await Promise.all(
                  get_one_to_one_msg.map(async (item: any) => {
                    get_user_connection.map(async (row: any) => {
                      if (
                        row.uid.toString() != item.sender_id.toString() &&
                        row.uid.toString() == item.receiver_id.toString() &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("receive_delete_message", {
                          Deleted_messages: [item],
                          isgroup: 0,
                          sender_id: item.sender_id,
                          receiver_id: item.receiver_id,
                          group_id: null,
                        });
                      }
                      if (
                        row.uid.toString() === item.sender_id.toString() &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("ack_delete_message", {
                          Deleted_messages: [item],
                          isgroup: 0,
                          sender_id: item.sender_id,
                          receiver_id: item.receiver_id,
                          group_id: null,
                        });
                      }
                    });
                  })
                );
              }
  
              let get_add_group_deleted_messages: any[] =
                await group_conversation.find({
                  delete_message_users: {$in:uid},
                  createdAt: { $gte: last_message_time },
                });
                console.log("get_add_group_deleted_messages",get_add_group_deleted_messages)
              if (get_add_group_deleted_messages.length > 0) {
                await Promise.all(
                  get_add_group_deleted_messages.map(async (item: any) => {
                    let get_group_dteail: any = await group.findById({
                      _id: item.group_id
                    })
                    get_user_connection.map(async (row: any) => {
                      if (
                        row.uid.toString() != item.sender_id &&
                        get_group_dteail.group_users.includes(row.uid.toString()) &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("receive_delete_message", {
                          Deleted_messages: [item],
                          isgroup: 1,
                          sender_id: item.sender_id,
                          receiver_id: null,
                          group_id: item.group_id,
                        });
                      }
                      if (
                        row.uid.toString() === item.sender_id.toString() &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("ack_delete_message", {
                          Deleted_messages: [item],
                          isgroup: 1,
                          sender_id: item.sender_id,
                          receiver_id: null,
                          group_id: item.group_id,
                        });
                      }
                    });
                  })
                );
              }
              
              let get_user_updated_detail:any []= await user.find({
                _id:uid,
                is_deleted:0,
                updatedAt: { $gte: last_message_time },
              }).select("user_image first_name last_name eid")
  
              if(get_user_updated_detail.length > 0){
                await Promise.all(
                  get_user_updated_detail.map(async (item: any) => {
                    //console.log("item",item)
                    get_user_connection.map(async (row: any) => {
                      if (
                        row.uid.toString() === item._id.toString() &&
                        row.cid.toString() === item.eid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("ack_send_update_user", {
                          post:item
                        });
                      }
                    });
                  })
                );
              }
  
              let get_created_group:any = await group.find({
                group_users:{$in:[uid]},
                is_deleted:0,
                createdAt: { $gte: last_message_time }
              })
              //console.log("last_message_time",last_message_time)
  
              console.log("get_created_group",get_created_group)
              if(get_created_group.length > 0){
                await Promise.all(
                  get_created_group.map(async (item: any) => {
                    let get_group_dteail: any = await group.findById({
                      _id: item._id
                    })
                    //console.log("get_group_dteail",get_group_dteail)
                    if(get_group_dteail){
                      //console.log("get_group_dteail if called")
                      let group_user_detail:any [] = await group_members.find({
                        group_id:item._id
                      }).populate({
                        path:"member_id",
                        model:"user",
                        select:"first_name last_name user_image"
                      })
                      let post_group:any = get_group_dteail.toObject();
                      post_group.group_users = group_user_detail
  
                      let get_first_message:any = await group_conversation.findOne({
                        group_id:item._id
                      }).sort({createdAt:1})
  
  
                      let post_convarsation:any = get_first_message
                      //console.log("get_user_connection",get_user_connection)
                    get_user_connection.map(async (row: any) => {
                      if (
                        row.uid.toString() === item.created_by.toString() &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        //console.log("row.uid",row.uid)
                        io.to(row.socket_id).emit("ack_send_create_group", {
                          post: post_group,
                          infoMessage: post_convarsation
                        });
                      }
                      if (
                        row.uid.toString() !== item.created_by.toString() &&
                        row.cid.toString() ===  item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("receive_create_group",
                        {
                          post: post_group,
                          infoMessage: post_convarsation
                        });
                    
                      }
                    });
                    }
                  })
                );
              }
  
              let get_add_group_member_datils:any = await group_conversation.aggregate([
                {
                  $match:{
                    is_deleted:0,
                    media_type:{$in:[9,10,11,12,13,14]},
                    createdAt: { $gte: last_message_time }
                  }
                },
                {
                  $sort:{
                    createdAt:-1
                  }
                }
              ])
  
              if(get_add_group_member_datils.length > 0){
                await Promise.all(
                  get_add_group_member_datils.map(async (item: any) => {
                    let get_group_dteail: any = await group.findById({
                      _id: item.group_id,
                    })
                    console.log("item",item)
                    if(get_group_dteail !== null){
                      console.log("if called of group member")
                    let group_user_detail:any [] = await group_members.find({
                      group_id:item.group_id
                    }).populate({
                      path:"member_id",
                      model:"user",
                      select:"first_name last_name user_image"
                    }).select("member_id is_admin isleaved");
  
                    let get_group_user_detail_tmp:any = await group_members.findOne({
                      group_id:item.group_id,
                      member_id:uid
                    })
  
  
                    let post_group:any = get_group_dteail.toObject();
                    post_group.group_users = group_user_detail
                     let post_convarsation:any = item
                    //console.log("get_group_dteail",get_group_dteail)
                    if(get_group_dteail && item.media_type == 9){
                      let check_user_detail:any [] = group_user_detail.filter(itemss=>itemss.member_id._id.toString() == uid.toString())
                      // console.log("check_user_detail",check_user_detail)
                      // console.log("check_user_detail",check_user_detail[0].isleaved == 0)
                      //console.log("get_group_user_detail.member_id.toString() !== uid.toString() ",get_group_user_detail)
                      //console.log("get_group_user_detail.member_id.toString() !== uid.toString() ",get_group_user_detail.member_id.toString() !== uid.toString())
                      get_user_connection.map(async (row: any) => {
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 0 &&
                          item.add_member_id.toString() !== uid.toString() &&
                          row.cid.toString() === item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid ack_add_group_members",row.uid,item)
                          io.to(row.socket_id).emit("ack_add_group_members", {
                            group_details: post_group,
                            groupPost: [post_convarsation]
                          });
                        }
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 0 &&
                          item.add_member_id.toString() == uid.toString() &&
                          row.cid.toString() ===  item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid receive_group_member_detail",row.uid,item)
                          console.log("row.socket_id",row.socket_id)
                          console.log("row.uid",row.uid)
                          console.log("row.device_id",row.device_id)
                            io.to(row.socket_id).emit("receive_group_member_detail", {
                              group_details: post_group,
                              groupPost: [post_convarsation],
                              ismemebr_added: 1
                            });
                      
                        }
                      });
                    }
                    if(get_group_dteail && item.media_type == 10){
                      let get_group_user_detail:any = await group_members.findOne({
                        group_id:item.group_id,
                        leave_member_time:{$gte:new Date(item.createdAt)}
                      }).sort({leave_member_time:-1})
  
                      let check_user_detail:any [] = group_user_detail.filter(itemss=>itemss.member_id._id.toString() == uid.toString())
  
                      get_user_connection.map(async (row: any) => {
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 0 &&
                          item.remove_member_id.toString() !== uid.toString() &&
                          row.cid.toString() === item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid ack_remove_group_members",row.uid,item)
                          io.to(row.socket_id).emit("ack_remove_group_members", {
                            group_details: post_group,
                            groupPost: [post_convarsation]
                          });
                        }
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 1 &&
                          item.remove_member_id.toString() === uid.toString() &&
                          row.uid.toString() !== item.sender_id.toString() &&
                          row.cid.toString() ===  item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid receive_group_member_detail",row.uid,item)
                            io.to(row.socket_id).emit("receive_group_member_detail", {
                              group_details: post_group,
                              groupPost: [post_convarsation],
                              ismemebr_added: 0
                            });
                      
                        }
                      });
                    }
                    if(get_group_dteail && item.media_type == 11){
                      let check_user_detail:any [] = group_user_detail.filter(itemss=>itemss.member_id._id.toString() == uid.toString())
                      get_user_connection.map(async (row: any) => {
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 0 &&
                          item.make_admin_id.toString() !== uid.toString() &&
                          row.cid.toString() === item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid ack_add_group_members",row.uid,item)
                          let post_member:any = await group_members.findOne({
                            group_id:item.group_id,
                            member_id:item.sender_id
                          })
                          io.to(row.socket_id).emit("receive_group_admin", {
                            role:2,
                            post:post_member,
                            group_users: get_group_dteail.group_users,
                            group_id: item.group_id,
                            infoMessage: post_convarsation
                          });
                        
                        }
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 0 &&
                          item.make_admin_id.toString() == uid.toString() &&
                          row.cid.toString() ===  item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid receive_group_member_role",row.uid,item)
                            io.to(row.socket_id).emit("receive_group_member_role", {
                              role:2,
                              group_id:item.group_id,
                              infoMessage: post_convarsation
                            });
                        }
                          
                      });
                    }
                    if(get_group_dteail && item.media_type == 12){
                      let check_user_detail:any [] = group_user_detail.filter(itemss=>itemss.member_id._id.toString() == uid.toString())
                      get_user_connection.map(async (row: any) => {
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 0 &&
                          item.make_member_id.toString() !== uid.toString() &&
                          row.cid.toString() === item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid ack_add_group_members",row.uid,item)
                          //console.log("row.uid",row.uid)
                          let post_member:any = await group_members.findOne({
                            group_id:item.group_id,
                            member_id:item.sender_id
                          })
                          io.to(row.socket_id).emit("receive_group_admin", {
                            role:1,
                            post:post_member,
                            group_users: get_group_dteail.group_users,
                            group_id: item.group_id,
                            infoMessage: post_convarsation
                          });
                        
                        }
                        if (
                          check_user_detail.length > 0 &&
                          check_user_detail[0].isleaved == 0 &&
                          item.make_member_id.toString() == uid.toString() &&
                          row.cid.toString() ===  item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          console.log("row.uid receive_group_member_role",row.uid,item)
                            io.to(row.socket_id).emit("receive_group_member_role", {
                              role:1,
                              group_id:item.group_id,
                              infoMessage: post_convarsation
                            });
                        }
                      });
                    }
                    if(get_group_dteail && item.media_type == 13){
                      get_user_connection.map(async (row: any) => {
                        if (
                          row.uid.toString() === item.sender_id.toString() &&
                          row.cid.toString() === item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          //console.log("row.uid",row.uid)
                          io.to(row.socket_id).emit("ack_leave_goup", {
                            message_detail:post_convarsation,
                            group_detail:get_group_dteail,
                            uid:item.sender_id
                          });
                        }
                        if (
                          get_group_dteail.group_users.includes(row.uid.toString()) &&
                          row.uid.toString() !== item.sender_id.toString() &&
                          row.cid.toString() ===  item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                            io.to(row.socket_id).emit("receive_leave_goup", {
                              message_detail:post_convarsation,
                              group_detail:get_group_dteail,
                              uid:item.sender_id
                            });
                        } 
                      });
                    }
                    if(get_group_dteail && item.media_type == 14){
                      get_user_connection.map(async (row: any) => {
                        if (
                          get_group_dteail.group_users.includes(row.uid.toString()) &&
                          row.uid.toString() === uid.toString() &&
                          row.cid.toString() ===  item.cid.toString() &&
                          row.device_id.toString() === device_id.toString()
                        ) {
                          io.to(row.socket_id).emit("ack_update_group_message_setting", {
                            message_detail:post_convarsation,
                            group_detail:get_group_dteail
                          });
                        }
                      });
                    }
                  }
                  })
                );
              }
  
              //console.log("get_add_group_member_datils",get_add_group_member_datils)
  
              let get_edit_groups:any = await group.find({
                is_deleted:0,
                group_users:{$in:[uid]},
                updatedAt: { $gte: last_message_time }
              })
              //console.log("get_edit_groups",get_edit_groups)
              if(get_edit_groups.length > 0){
                await Promise.all(
                  get_edit_groups.map(async (item: any) => {
                    let get_group_dteail: any = await group.findById({
                      _id: item._id
                    })
  
                    if(get_group_dteail){
                      let group_user_detail:any [] = await group_members.find({
                        group_id:item._id
                      }).populate({
                        path:"member_id",
                        model:"user",
                        select:"first_name last_name user_image"
                      })
                      let post_group:any = get_group_dteail.toObject();
                      post_group.group_users = group_user_detail
  
                    get_user_connection.map(async (row: any) => {
                      if (
                        get_group_dteail.group_users.includes(row.uid.toString()) &&
                        row.uid.toString() === uid.toString() &&
                        row.cid.toString() ===  item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                       
                          io.to(row.socket_id).emit("receive_edit_group", post_group);
                      }
                    });
                    }
                  })
                );
              }
  
              let get_one_to_one_msg_eidted:any = await conversation.find({
                is_edited:1,
                updatedAt: { $gte: last_message_time },
              })
              if (get_one_to_one_msg_eidted.length > 0) {
                await Promise.all(
                  get_one_to_one_msg_eidted.map(async (item: any) => {
                    get_user_connection.map(async (row: any) => {
                      if (
                        row.uid.toString() != item.sender_id &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString() &&
                        row.uid.toString() ==  item.receiver_id.toString()
                      ) {
                        io.to(row.socket_id).emit("receive_edit_message", {
                          message_detail:item,
                          isgroup:0,
                          group_id:null
                        });
                      }
                      if (
                        row.uid.toString() === item.sender_id.toString() &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("ack_send_edit_message", {
                          message_detail:item,
                          isgroup:0,
                          group_id:null
                        });
                      }
                    });
                  })
                );
              }
  
              let get_add_group_edited_messages: any[] =
                await group_conversation.find({
                  is_edited:1,
                  updatedAt: { $gte: last_message_time },
                }).populate({
                  path: "group_id",   // field in group_conversation
                  model: "group",     // group collection
                  select: "group_name group_users" // optional: select required fields
                });
                // console.log("get_add_group_edited_messages",get_add_group_edited_messages)
              if (get_add_group_edited_messages.length > 0) {
                await Promise.all(
                  get_add_group_edited_messages.map(async (item: any) => {
                    get_user_connection.map(async (row: any) => {
                      if (
                        row.uid.toString() != item.sender_id &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString() &&
                        item.group_id.group_users.includes(row.uid)
                      ) {
                        io.to(row.socket_id).emit("receive_edit_message", {
                          message_detail:item,
                          isgroup:1,
                          group_id:item.group_id
                        });
                      }
                      if (
                        row.uid.toString() === item.sender_id.toString() &&
                        row.cid.toString() === item.cid.toString() &&
                        row.device_id.toString() === device_id.toString()
                      ) {
                        io.to(row.socket_id).emit("ack_send_edit_message", {
                          message_detail:item,
                          isgroup:1,
                          group_id:item.group_id
                        });
                      }
                    });
                  })
                );
              }
              
          }
        } catch (error: any) {
          console.log("error", error);
          if (data.uid !== undefined && data.uid !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.uid.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      })
      socket.on("read_all_delivered_message",async function (data: any){
        try {
          console.log("read all socket:",connection_uid)
          const isValid = await isAuthorized(
            data.uid,
            connection_uid,
            socket
          );
          if (!isValid) {
            socket.disconnect();
            return;
          }
          let uid:any = data.uid
          let recevier_id:any = data.recevier_id
          let isgroup:any = data.isgroup
          let cid:any = data.cid
          let message_sender_id_arr:any = []
          let sender_msges_arr:any = []
          let sender_msges_id_arr:any = []
  
          
          if(isgroup && mongoose.Types.ObjectId.isValid(uid) && mongoose.Types.ObjectId.isValid(recevier_id)){
  
            let get_msgess_ids:any []= await group_message_status.find({
              receiver_id:uid,
              group_id:recevier_id,
              // delivery_type:2
            }).distinct("message_id")
  
            let updated_group_receive_msg:any = await group_message_status.updateMany({
              receiver_id:uid,
              group_id:recevier_id,
              // delivery_type:2
            },
            { 
              $set: { delivery_type: 3, read_time: new Date() }
            }
            )
  
            // console.log("updated_group_receive_msg",updated_group_receive_msg)
            // console.log("get_msgess_ids",get_msgess_ids)
          
            let update_group_message_ids:any = await group_conversation.aggregate([
              {
                $match:{
                  _id:{$in:get_msgess_ids}
                }
              },
              {
                $lookup: {
                  from: "group_message_statuses",
                  localField: "_id",
                  foreignField: "message_id",
                  as: "group_messages_total_count"
                }
              },
               {
                $lookup: {
                  from: "group_message_statuses",
                  localField: "_id",
                  foreignField: "message_id",
                  pipeline: [
                    {
                      $match: {
                        delivery_type:2
                      }
                    },
                  ],
                  as: "group_messages_total_deliver_count"
                }
              },
              {
                $lookup: {
                  from: "group_message_statuses",
                  localField: "_id",
                  foreignField: "message_id",
                  pipeline: [
                    {
                      $match: {
                        delivery_type:3
                      }
                    },
                  ],
                  as: "group_messages_total_read_count"
                }
              },
              {
                $addFields:{
                  delivery_type_tmp:{
                    $switch: {
                      branches: [
                          {
                              case: { $eq: [{ $size: "$group_messages_total_deliver_count" }, { $size: "$group_messages_total_count" }] },
                              then:2
                          },
                          {
                              case: { $eq: [{ $size: "$group_messages_total_read_count" }, { $size: "$group_messages_total_count" }] },
                              then:3
                          }
                      ],
                      default:1
                  }
                  }
                }
              },
              {
                $match: {
                    delivery_type_tmp:3
                }
            },
              {
                $project: {
                    _id: 1
                }
            }
           
            ])
  
            //console.log("update_group_message_ids",update_group_message_ids)
            sender_msges_id_arr = update_group_message_ids.map((row:any)=>{
              return row._id;
            })
  
           let updated_msg:any= await group_conversation.updateMany({
              _id:{$in:update_group_message_ids}
            },
            { 
              $set: { delivery_type: 3 }
            })
  
            //console.log("updated_msg",updated_msg)
  
            let updated_group_message_ids:any = await  group_conversation.find({
              _id:{$in:update_group_message_ids}
            }).distinct("sender_id") 
  
            message_sender_id_arr = updated_group_message_ids.map((row:any)=> {
              return row.toString()
            })
  
            //console.log("message_sender_id_arr",message_sender_id_arr)
  
            let get_updated_msg:any = await group_conversation.find({
              _id:{$in:update_group_message_ids}
            })
  
            sender_msges_arr = get_updated_msg
            
  
          }
          if(!isgroup && mongoose.Types.ObjectId.isValid(uid) && mongoose.Types.ObjectId.isValid(recevier_id)){
            let get_read_message:any = await conversation.find({
              receiver_id:uid,
              sender_id:recevier_id,
              block_message_users:{$nin:uid},
              // delivery_type: 2,
              delivery_type: { $in: [1, 2] },
              delete_message_users: { $nin: uid }
            }).distinct("_id")
  
            sender_msges_id_arr = get_read_message
            console.log("get_read_message",get_read_message)
  
  
            let get_read_message_obj:any = await conversation.find({
              receiver_id:uid,
              sender_id:recevier_id,
              // delivery_type: 2,
              delivery_type: { $in: [1, 2] },
              delete_message_users: { $nin: uid }
            })
  
            let updated_one_to_msg:any = await conversation.updateMany({
              receiver_id:uid,
              sender_id:recevier_id,
              // delivery_type: 2,
              delete_message_users: { $nin: uid }
            },
            {
              $set: { delivery_type: 3 }
            })
  
            //console.log("updated_one_to",updated_one_to_msg)
  
          
  
            sender_msges_arr = get_read_message_obj
            message_sender_id_arr.push(recevier_id)
  
            //console.log("sender_msges_arr",sender_msges_arr)
            
          }
          console.log(sender_msges_id_arr,"ack_read_all_delivered_message list")
        await Promise.all(
          socket_users.map(async (item) => {
            if (item.uid.toString() === uid.toString() && item.cid.toString() === cid.toString()) {
              let post:any = {
                uid:uid,
                recevier_id:recevier_id,
                isgroup:isgroup,
                cid:cid,
                message_sender_id_arr:sender_msges_id_arr
              }
              io.to(item.socket_id).emit("ack_read_all_delivered_message", post);
            }
            if(item.uid.toString() !== uid.toString() && message_sender_id_arr.includes(item.uid) && item.cid.toString() === cid.toString()){
              let get_sender_message_tmp:any = sender_msges_arr.filter((row:any)=>row.sender_id.toString() === item.uid.toString())
              //console.log("get_sender_message_tmp",get_sender_message_tmp)
              let updated_message_id:any = get_sender_message_tmp.map((row:any)=>{
                return row._id;
              })
              let post:any = {
                uid:uid,
                recevier_id:recevier_id,
                isgroup:isgroup,
                cid:cid,
                message_sender_id_arr:updated_message_id,
                updatedAt: new Date()
              }
              io.to(item.socket_id).emit("receive_read_all_delivered_message", post);
            }
          })
        );
          
  
  
        } catch (error: any) {
          console.log("error", error);
          if (data.uid !== undefined && data.uid !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.uid.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      })
      socket.on("call_start_time_update", async function (data: any) {
        try {
          let call_id:any = data.call_id;
          let uid = data.uid;
  
          let localtime_date = moment().local().format('YYYY-MM-DDTHH:mm:ss.sssZ');
          
          let get_year:any = moment(localtime_date,"YYYY-MM-DDTHH:mm:ss.sssZ").format("YYYY")
          let get_month:any = moment(localtime_date,"YYYY-MM-DDTHH:mm:ss.sssZ").format("MM")
          let get_day:any = moment(localtime_date,"YYYY-MM-DDTHH:mm:ss.sssZ").format("DD")
          let get_hour:any = moment(localtime_date,"YYYY-MM-DDTHH:mm:ss.sssZ").format("HH")
          let get_minutes:any = moment(localtime_date,"YYYY-MM-DDTHH:mm:ss.sssZ").format("mm")
          let get_seconds:any = moment(localtime_date,"YYYY-MM-DDTHH:mm:ss.sssZ").format("ss")
  
          let get_int_month:any = parseFloat(get_month) - 1
  
         
         let new_tmp_date:any = new Date();
         new_tmp_date.setUTCFullYear(get_year)
         new_tmp_date.setUTCMonth(get_int_month)
         new_tmp_date.setUTCDate(get_day)
         new_tmp_date.setUTCHours(get_hour)
         new_tmp_date.setUTCMinutes(get_minutes)
         new_tmp_date.setUTCSeconds(get_seconds)
  
          let update_call_detail = await call_history.findOneAndUpdate({
            call_id:call_id
          },{
            call_start_time:new_tmp_date
          })
  
          const mySocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (uid == item.uid) {
                mySocketIds.push(item.socket_id);
              } 
            })
          );
  
           if (mySocketIds.length > 0) {
            io.to(mySocketIds).emit("ack_call_start_time_update",{
              call_id:call_id,
              uid:uid
            });
          }
  
        } catch (error: any) {
          console.log("error", error);
          if (data.uid !== undefined && data.uid !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.uid.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      });
      socket.on("message_key", async function (data: any) {
        try {
          console.log("message_key",data)
          let recevierid:any = data.recevierid
          let isGroup:any = data.isgroup;
          let receiver_ids_arr:any = []
          console.log("recevierid",recevierid)
          console.log("isGroup",isGroup)
          if(isGroup){
            let get_group_detail:any = await group.findOne(
              {
                _id:recevierid
              }
            )
            if(get_group_detail){
              receiver_ids_arr = get_group_detail.group_users
            }
          }else{
            receiver_ids_arr = [recevierid]
          }
          console.log("receiver_ids_arr",receiver_ids_arr)
          const mySocketIds: any[] = [];
              await Promise.all(
                socket_users.map(async (item:any) => {
                  console.log("item.uid",item.uid)
                  if (receiver_ids_arr.includes(item.uid)) {
                    mySocketIds.push(item.socket_id);
                  } 
                })
              );
           if (mySocketIds.length > 0) {
            io.to(mySocketIds).emit("receive_message_key",data);
          }
  
        } catch (error: any) {
          console.log("error", error);
          if (data.uid !== undefined && data.uid !== null) {
            const emiter_arr: any[] = [];
            await Promise.all(
              socket_users.map(async (item) => {
                if (item.uid.toString() === data.uid.toString()) {
                  emiter_arr.push(item.socket_id);
                }
              })
            );
            if (emiter_arr.length > 0) {
              let get_error: any = JSON.stringify(error.toString());
              io.to(emiter_arr).emit("Socket_emit_error", get_error);
            }
          }
        }
      });
      socket.on("user_chat_status_update", async (data: any) => {
        try {
          console.log("user_chat_status_update socket emited",data)
          let offlineUser = socket_users.find(
          (item) => item.socket_id === socket.id
        );
        console.log("offlineUser",offlineUser)
        let user_detail_get:any={};
        let is_online = data.is_online
          // let get_user_all_devices:any[]= socket_users.filter((row)=>row.uid.toString() === offlineUser.uid.toString())
          if(is_online){
            // let update_to_online = await user_tokens.findOneAndUpdate({
            //   device_id:connection_device_id
            // },
            // {
            //   is_online:1
            // }
            // )
            //  user_detail_get = await user.findByIdAndUpdate(
            //   {
            //     _id: offlineUser.uid,
            //   },
            //   {
            //     is_online: 1,
            //   },)
            user_detail_get = await statusManage(connection_uid,connection_device_id,1)
          }else{
            user_detail_get = await statusManage(connection_uid,connection_device_id,0)
          // let update_to_ofline = await user_tokens.findOneAndUpdate({
          //   device_id:connection_device_id
          // },
          // {
          //   is_online:0
          // }
          // )
          //   console.log("else called")
          //   if(get_user_all_devices.length == 1){
          //    user_detail_get = await user.findByIdAndUpdate(
          //     {
          //       _id: offlineUser.uid,
          //     },
          //     {
          //       is_online: 0,
          //       last_seen: new Date()
          //     },
          //     {
          //       new: true,
          //       runValidators: true,
          //     }
          //   );
          // }else{
          //   user_detail_get = await user.findById(
          //     {
          //       _id: offlineUser.uid,
          //     }
          //   );
          // }
        }
  
          const mySocketIds: any[] = [];
          console.log("mySocketIds",mySocketIds)
          await Promise.all(
            socket_users.map(async (item) => {
              if (
                item.uid !== offlineUser.uid &&
                item.cid === offlineUser.cid
              ) {
                mySocketIds.push(item.socket_id);
              }
            })
          );
          console.log("mySocketIds",mySocketIds)
          let post = {
            _id: offlineUser.uid,
            is_online: user_detail_get?.is_online,
            last_seen:user_detail_get?.is_online == 0  ? user_detail_get.last_seen:null,
            first_name:user_detail_get ? user_detail_get.first_name : "",
            last_name:user_detail_get ? user_detail_get.last_name : "",
            user_name:user_detail_get ? user_detail_get.user_name : "",
            user_image:user_detail_get ? user_detail_get.user_image : ""
          };
            if (mySocketIds.length > 0) {
              io.to(mySocketIds).emit("send_online_status", post);
          }
  
        } catch (error: any) {
          console.log("error", error);
        }
      });
      socket.on("get_block_data", async (data: any) => {
        try {
          let req_userID = data.reciver_id;
          let uid = connection_uid;

          let block_data: any = await user_block.findOne({
            block_by: uid,
            block_id: req_userID,
          });
          
          let block_data_reverse: any = await user_block.findOne({
            block_by: req_userID,
            block_id: uid,
          });

          let block_post = {
            isBlocked: block_data == null ? 0 : 1,
            block_id: block_data ? block_data.block_id : req_userID,
            block_by: block_data ? block_data.block_by : uid,
          };
          let block_post_reverse = {
            isBlocked: block_data_reverse == null ? 0 : 1,
            block_id: block_data_reverse ? block_data_reverse.block_id : req_userID,
            block_by: block_data_reverse ? block_data_reverse.block_by : uid,
          };

          let user_notification: any;
          let mute_member_name: any;
          user_notification = await notification_setting_users.findOne({
            uid: uid,
            // isgroup: 0,
            notification_mute_id: req_userID,
          });
          let get_mute_member_detail: any = await user.findById({
            _id: req_userID,
          });
          if (get_mute_member_detail) {
            mute_member_name =
              encryptDataname(get_mute_member_detail?.first_name ,get_mute_member_detail?.last_name, get_mute_member_detail.eid);
          }
          user_notification = {
            cid: user_notification
              ? user_notification.cid
              : connection_cid,
            uid: user_notification ? user_notification.uid : uid,
            isgroup: user_notification ? user_notification.isgroup : 0,
            notification_mute_id: user_notification
              ? user_notification.notification_mute_id
              : req_userID,
            notification_mute_type: user_notification
              ? user_notification.notification_mute_type
              : MESSAGE.NOTIFICATION_MUTE_TYPES.UNMUTE,
            unmute_date: user_notification
              ? user_notification.unmute_date
              : null,
          };

          const emiter_arr: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === uid.toString()) {
                emiter_arr.push(item.socket_id);
              }
            })
          );
          const emiter_arr_reverse: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === uid.toString()) {
                emiter_arr_reverse.push(item.socket_id);
              }
            })
          );

          if (emiter_arr.length > 0) {
            io.to(emiter_arr).emit("ack_send_block", block_post);
            io.to(emiter_arr).emit("ack_mute_conversation", {
              mute_conversation: user_notification,
              mute_member_name: mute_member_name,
            });
          }
          if (emiter_arr_reverse.length > 0) {
            io.to(emiter_arr_reverse).emit("recive_send_block", block_post_reverse);
          }
        } catch (error) {
          console.log("error", error);
        }
      });
      socket.on("message_deliver_update_status", async (data: any) => {
        try {
            const messageId = data.messageId
            const isGroup= data.isGroup
            const receiver_id = data.receiver_id          
          console.log(messageId,isGroup,receiver_id, "message log")
        } catch (error) {
          console.log(error)
        }
      })
      socket.on("authentication_fail", async (data: any) => {
        try {
          console.log("auth fail socket emmit to",data)
          const type = data.type;
          const uid = data.uid;
          const deviceid = data.device_id;
          const mySocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item: any) => {
              console.log("item.uid", item.uid);
              if (type == MESSAGE.AUTH_FAIL_TYPE.EDIT || type == MESSAGE.AUTH_FAIL_TYPE.DELETEBYADMIN) {
                if (uid == item.uid) {
                  mySocketIds.push(item.socket_id);
                }
              } else if(type == MESSAGE.AUTH_FAIL_TYPE.DELETE){
                if (item.device_id == deviceid) {
                  mySocketIds.push(item.socket_id);
                }
              }else{}
            })
          );
          console.log(mySocketIds,"authentication_fail mysocketids")
          if (mySocketIds.length > 0) {
            io.to(mySocketIds).emit("authentication_fail", data);
          }
        } catch (error: any) {
      console.error("[socket.ts] error:", error);
    }
      });

      socket.on("add_device",async(data:any)=>{
        try {
          const parsed = typeof data === "string" ? JSON.parse(data) : data;
          const token =  parsed.token
          const web_restore_date = parsed?.web_restore_date
            ? moment(parsed.web_restore_date).utc()
            : null;
          // const tokenExist = web_users.find((u: any) => u.token === token);
          const tokenExistInDB =await qr_token.findOne({
            token:token
          })
          console.log("debug add in DB: Add device token exist",tokenExistInDB)
          if (tokenExistInDB) {
            await user.findOneAndUpdate({
            _id:connection_uid
          },
          {web_restore_date:web_restore_date}
        )
            const isSecondaryExist = await user_tokens.findOne({
              uid: connection_uid,
              is_primary: false,
            });
            console.log(isSecondaryExist, "is secondary exist");
            if (isSecondaryExist) {
              console.log("ack debug: account limit reached");
              io.to(socket.id).emit("ack_add_Device", {
                success: false,
                message: "Secondary account device limit reached",
              });
              return;
            } 
          }
          // if (tokenExist) {
          if (tokenExistInDB) {
            const isSecondaryExist =  await user_tokens.findOne({
              uid:connection_uid,
              is_primary:false
            })
            console.log(isSecondaryExist,"is secondary exist")
            if(isSecondaryExist){
              console.log("ack debug: account limit reached")
              io.to(socket.id).emit("ack_add_Device", {
              success: false,
              message: "Secondary account device limit reached",
            });
            return;
            }
            const LoginToken = jwt.sign(
              {
                uid: connection_uid,
                eid: connection_cid,
                device_id: tokenExistInDB.device_id,
              },
              config.key.secret_key
            );
            const refresh_token = jwt.sign(
              {
                uid: connection_uid,
                eid: connection_cid,
                device_id: tokenExistInDB.device_id,
              },
              config.key.secret_key,
              {
                expiresIn: "1d",
              }
            );
            const encrypted_token = encryptData(LoginToken);
            const encrypted_refresh_token = encryptData(refresh_token);
            const token_post:any = new user_tokens();
            token_post.uid = new mongoose.Types.ObjectId(connection_uid);
            token_post.token = encrypted_token;
            token_post.refresh_token = encrypted_refresh_token;
            token_post.push_token = "";
            token_post.device_id = tokenExistInDB.device_id;
            token_post.device_name = "Web Browser";
            token_post.osversion = 3;
            token_post.device_os_version = "";
            token_post.apns_push_token = "";
            token_post.login_Time = new Date();
            token_post.is_primary = false;
            await token_post.save();
            console.log(socket_users, socket.id,"ack debug: ack send to App")
            io.to(socket.id).emit("ack_add_Device", {
              success: true,
              message: "Login Sucessfully",
            });
            console.log("ack debug: ack send to web")
            io.to(tokenExistInDB.socket_id).emit("ack_add_Device", {
              success: true,
              token: encrypted_token,
              message: "Login Sucessfully",
            });
          }
          else{
            console.log("ack debug: Token expired or Token not match")
            io.to(socket.id).emit("ack_add_Device", {
              success: false,
              message: "Token expired or Token not match",
            });
          }
        } catch (error) {
          console.log(error,"error")
        }
      })

      socket.on("secondary_devices",async(data:any)=>{
        try {
          const secondary_devices_list = await user_tokens.find({
            uid:connection_uid,
            is_primary:false
          }).select("_id device_name login_Time")
          io.to(socket.id).emit("ack_secondary_devices", {
            success: true,
            data:secondary_devices_list,
          });
        } catch (error) {
          console.log(error,"error secondary_devices")
        }
      })
      socket.on("secondary_devices_onlogout", async(data:any)=>{
        try {
          console.log("secondary_devices_onlogout called")
          const secondary_devices_list = await user_tokens.find({
            uid:data.uid,
            is_primary:false
          }).select("_id device_name login_Time")
          let mySocketIds:any []= [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (
                item.uid == data.uid
              ) {
                mySocketIds.push(item.socket_id);
              }
            })
          );
          console.log(mySocketIds,"mySocketIds secondary_devices_onlogout called ack")
          io.to(mySocketIds).emit("ack_secondary_devices", {
            success: true,
            data:secondary_devices_list,
          });
        } catch (error) {
          console.log(error,"error secondary_devices")
        }
      })
      socket.on("get_username",async(data:any)=>{
        try {
          const user_id = data.user_id
          const userData:any = await user.findById({
            _id:user_id
          })
          const username = userData.user_name
          io.to(socket.id).emit("ack_get_username",{
            user_id:user_id,
            username:username
          })
        } catch (error) {
          console.log(error)
        }
      })
      socket.on("sync_data", async(data:any)=>{
        try {
          console.log("sync data called")
          const uid = data.uid
          const myACKSocketIds: any[] = [];
          await Promise.all(
            socket_users.map(async (item) => {
              if (item.uid.toString() === uid.toString()) {
                myACKSocketIds.push(item.socket_id);
              }
            })
          );
          if (myACKSocketIds.length > 0) {
            io.to(myACKSocketIds).emit("ack_sync_data", {
              sync_for:"contact"
            });
          }
        } catch (error) {
         console.log(error) 
        }
      })
      socket.on("update_app_version",async(data:any)=>{
        console.log(data,connection_uid,"update_app_version socket called")
        const token = data.token
        const app_version = data.app_version
        const browser_version = data.browser_version
        const uid = new mongoose.Types.ObjectId(connection_uid);

        const updateData = await user_tokens.findOneAndUpdate({
          token:token,
          uid:uid
        }, { $set: { app_version: app_version } },
        {
          new:true
        })

        const updateBrowserDeviceName = await user_tokens.findOneAndUpdate({
          uid:uid,
          osversion:3,
          token:token
        },{
          device_name:browser_version
        })
        console.log(updateData,updateBrowserDeviceName,"updateData app version")
      })
      socket.on("get_group_data",async(data:any)=>{
        try {
         const group_id = data.group_id
         const groupData = await group.findOne({
          _id:group_id
         })
         const is_adminData = await group_members.find({
          group_id:group_id,
          member_id:connection_uid,
          is_admin:1,
          isleaved:0
         })
        let mySocketIds:any []= [];
         await Promise.all(
            socket_users.map(async (item) => {
              if (
                item.uid == connection_uid
              ) {
                mySocketIds.push(item.socket_id);
              }
            })
          );
          console.log(mySocketIds,connection_uid,"mySocketIds get group data called ack")
          if(mySocketIds.length>0){
            io.to(mySocketIds).emit("ack_get_group_data", {
              success: true,
              data:groupData,
              is_admin:is_adminData.length>0?1:0
            });
          }
        } catch (error: any) {
      console.error("[socket.ts] error:", error);
    }
      })
      socket.on("disconnect", async () => {
        let offlineUser = socket_users.find(
          (item) => item.socket_id === socket.id
        );
 
        if (offlineUser) {
          console.log("offlineUser.uid", offlineUser.uid)
          // let get_user_all_devices:any[]= socket_users.filter((row)=>row.uid.toString() === offlineUser.uid.toString())
          // if(get_user_all_devices.length == 1){
          console.log("offlineUser.uid final ofline", offlineUser.uid)
          // let user_detail_get: any = await user.findByIdAndUpdate(
          //   {
          //     _id: offlineUser.uid,
          //   },
          //   {
          //     is_online: 0,
          //     last_seen: new Date()
          //   },
          //   {
          //     new: true,
          //     runValidators: true,
          //   }
          // );
          let user_detail_get: any =await statusManage(connection_uid,connection_device_id,0)
          const mySocketIds: any[] = [];
  
          await Promise.all(
            socket_users.map(async (item) => {
              if (
                item.uid !== offlineUser.uid &&
                item.cid === offlineUser.cid
              ) {
                mySocketIds.push(item.socket_id);
              }
            })
          );
          let post = {
            _id: offlineUser.uid,
            is_online: user_detail_get?.is_online,
            last_seen:user_detail_get ? user_detail_get.last_seen:null,
            first_name:user_detail_get ? user_detail_get.first_name : "",
            last_name:user_detail_get ? user_detail_get.last_name : "",
            user_name:user_detail_get ? user_detail_get.user_name : "",
            user_image:user_detail_get ? user_detail_get.user_image : ""
          };
          if (mySocketIds.length > 0) {
            // console.log("debug post data diff issue", post)
            io.to(mySocketIds).emit("send_online_status", post);
          }
          console.log(user_detail_get,"after new online ofline")
        }
        // }
        console.log("offlineUser socket.id", socket.id)
        socket_users = socket_users.filter(
          (item) => item.socket_id !== socket.id
        );
        socket.removeAllListeners();
      });
    } catch (error: any) {
      console.error("[socket.ts] error:", error);
    }
    

  });
}
