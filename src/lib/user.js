import EventEmitter from 'events';

/**
 * Class for modeling connected users.
 *
 * @class      User
 */
class User extends EventEmitter
{
  /**
   * Collection of User object instances
   * @type       {Array}
   */
  static _instances = [];
  /**
   * Get a user instance by username
   *
   * @param      {string}        username  The username
   * @return     {User|boolean}  The user.
   */
  static getByUsername = (username) =>
  {
    if(typeof username != 'string') return false;
    let result = User._instances.filter((a) => a.username == username);
    return result.length == 1 ? result[0] : false;
  }
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
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