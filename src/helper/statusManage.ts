import user from "../models/user";
import user_tokens from "../models/user_tokens";

export const statusManage = async (uid: any, device_id: any, status: any) => {
  try {
    const is_data:any = await user_tokens.findOne({uid: uid, device_id:device_id})
    if(is_data==null){
      await user_tokens.findByIdAndUpdate(
      {_id:uid},
      { is_online: 0  },
      { new: true }
    );
    }else{
      const update_status = await user_tokens.findByIdAndUpdate(
        {_id:is_data?._id},
        { is_online: status  },
        { new: true }
      );
    }
    if (status == 1) {
      await user.findByIdAndUpdate(uid, { $set: { is_online: 1 } });
    }else {
      const anyDeviceOnline = await user_tokens.exists({
        uid: uid,
        is_online: 1,
      });

      if (!anyDeviceOnline) {
        await user.findByIdAndUpdate(uid, { $set: { is_online: 0 , last_seen: new Date()} });
      }
    }
    const updatedUser = await user.findById(uid);
    return updatedUser;
  } catch (error) {
    console.log(error, "status manage error");
  }
};
