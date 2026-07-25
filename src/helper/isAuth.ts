import user from "../models/user";

export async function isAuthorized(
  userId: string,
  socketId: string,
  socket: any
) {
  let isValid;

  const userData = await user.findById(userId).lean();
  if (!userData) {
    isValid = false; 
    return false;
  }

  // Assuming you store the current socketId in the user record
  isValid = userId == socketId;
  if (isValid == false) {
    socket.disconnect();
    return false;
  }

  return isValid;
}
