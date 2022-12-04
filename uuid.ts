import { user_auth } from "./types/basic";

// uuid function
export default function uuid(): user_auth {
  const _uuid: user_auth = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  // do not allow uuid to begin with a number
  if (/[0-9]/g.test(_uuid[0])) {
    return uuid();
  }
  
  return _uuid;
}
