export const MESSAGE = {
  MESSAGE_TYPES: {
    REGULAR: 0,
    REPLY: 1,
    FORWARD: 2,
    SCHEDULE: 3,
  },
  MESSAGE_DELIVERY_STATUS: {
    NOTHING: 0,
    SENDED: 1,
    DELIVERED: 2,
    READED: 3,
    FAILED: 4,
  },
  MESSAGE_MEDIA_TYPES: {
    TEXT: 0,
    IMAGE: 1,
    VIDEO: 2,
    AUDIO: 3,
    DOCUMENTS: 4,
    CONTACT: 5,
    LOCATION: 6,
    INFO: 7,
    GROUP_CREATE:8,
    GROUP_MEMBER_ADD:9,
    GROUP_MEMBER_REMOVE:10,
    GROUP_MAKE_ADMIN:11,
    GROUP_REMOVE_FROM_ADMIN:12,
    GROUP_LEAVE:13,
    GROUP_MESSAGE_SETING_UPDATE:14,
    VOICENOTE:15,
    MESSAGEBYMASTERADMIN:16
  },
  BROADCAST_USEES_ADD_STATUS: {
    ADD_MEMBER: 1,
    REMOVE_MEMBER: 0
  },
  notification_mute_type: {
    "8Hours": 1,
    "1week": 2,
    "always": 3,
    "unmute": 4
  },
  NOTIFICATION_MUTE_TYPES: {
    EAIGHTHOURS: 1,
    ONEWEEK: 2,
    ALWAYS: 3,
    UNMUTE: 4
  },
  pause_type: {
    unpause: 0,
    pause: 1
  },
  PUSH_NOTIFICATION_TYPE: {
    ONETOONE: 1,
    GROUP: 2,
    AUDIO: 3,
    VIDEO: 4,
    GROUPWITHAUIDO: 5,
    GROUPWITHVIEDIO: 6,
    MISSEDCALL:7
  },
  CALL_TYPE:{
    AUDIO:3,
    VIDEO:4,
    GROUPWITHAUIDO: 5,
    GROUPWITHVIEDIO: 6
  },
  AUTH_FAIL_TYPE:{
    DELETE:0,
    DELETEBYADMIN:2,
    EDIT:1
  }
};
