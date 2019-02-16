import EventEmitter from 'events';

class User extends EventEmitter
{
  /**
   * Collection of User object instances
   * @type {Array}
   */
  static _instances = [];
  /**
   * Get a user instance by username
   * @param  {string} username
   * @return {User|boolean}
   */
  static getByUsername = (username) =>
  {
    if(typeof username != 'string') return false;
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