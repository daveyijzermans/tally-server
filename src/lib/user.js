import EventEmitter from 'events';

/**
 * Class for modeling connected users.
 *
 * @memberof   Backend
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
    /**
     * Username this user is known by on the intercom/client application
     * 
     * @type       {String}
     */
    this.username = opts.username;
    /**
     * Display name of the user in the administrator interface.
     * 
     * @type       {String}
     */
    this.name = opts.name;
    /**
     * Camera number of this user. Note this camera number is shared across all
     * connected servers providing tally information.
     *
     * @type       {String}
     */
    this.camNumber = opts.camNumber;
    /**
     * The channel that this user is currently in.
     *
     * @type       {string}
     */
    this.channelName = '';
    /**
     * The tally status this user currently has.
     *
     * @type       {number}
     */
    this.status = 0;
    /**
     * Whether the user is currently talking.
     *
     * @type       {boolean}
     */
    this.talking = false;
    User._instances.push(this);
  }
}

export default User;