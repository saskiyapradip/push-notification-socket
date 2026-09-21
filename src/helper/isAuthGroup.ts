import group from "../models/group";

export async function isAuthorizedGroup(
  groupId: string,
  userId: string,
  socket: any
) {
  let isValid;
  const groupData: any = await group.findOne({
    _id: groupId,
    is_deleted: 0,
  });
  let group_users;
  if (groupData) {
    group_users = groupData.group_users;
  }

  let isInGroup;
  if (group_users) {
    isInGroup = group_users?.some(
      (memberId: string) => memberId.toString() === userId
    );
  }

  if (!isInGroup) {
    socket.disconnect();
    return false; // user not in group
  }

  // Assuming you store the current socketId in the user record
  isValid = userId == socket.data.uid;
  if (isValid == false) {
    socket.disconnect();
    return false;
  }
  return isValid;
}
