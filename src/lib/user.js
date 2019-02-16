import EventEmitter from 'events';

class User extends EventEmitter
{
  static _instances = [];
  static getByUsername = (username) =>
  {
    if(typeof username == 'undefined') return false;
    let result = User._instances.filter((a) => a.username == username);
    return result.length == 1 ? result[0] : false;
  }
  constructor(opts)
  {
    super();
    Object.assign(this, opts);
    this.channelName = '';
    this.status = null;
    this.talking = null;
    User._instances.push(this);
  }
}

export default User;