import User from './user';
import Server from './server';
import fs from 'fs';
import EventEmitter from 'events';

/**
 * Class for retrieving and saving configuration.
 *
 * @memberof   Backend
 */
class Config extends EventEmitter
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super();
    //TODO add special character filter/escaping

    /**
     * Data from admin.json file
     * 
     * @type       {Object}
     */
    this.admin = require(opts.admin);
    /**
     * Data from servers.json file
     * 
     * @type       {Object}
     */
    this.servers = require(opts.servers);
    /**
     * Data from users.json file
     * 
     * @type       {Object}
     */
    this.users = require(opts.users);
    /**
     * Paths to the configuration files
     * 
     * @type       {Object}
     */
    this.paths = opts;
  }
  /**
   * Save user data back to JSON file
   *
   * @method     Backend.Config#saveUsers
   * 
   * @fires      Backend.Config#event:"saved.users"
   */
  saveUsers = () =>
  {
    let save = User._instances.map(a =>
    {
      return {
        username: a.username,
        name: a.name,
        camNumber: a.camNumber
      };
    });
    let json = JSON.stringify(save);
    fs.writeFile(this.paths.users, json, 'utf8', (err) => {
      if (err) return console.error(err);
      /**
       * Let listeners know the user configuration was saved.
       * 
       * @event      Backend.Config#event:"saved.users"
       */
      this.emit('saved.users');
    });
  }
  /**
   * Get user configuration from JSON file
   *
   * @method     Backend.Config#getUser
   *
   * @param      {string}        username  The username
   * @return     {User|boolean}  The user.
   */
  getUser = (username) =>
  {
    if(typeof username != 'string') return false;
    let match = this.users.filter((a) => a.username == username);
    let opts = match.length == 1 ? match[0] : false;
    if(!opts) return false;
    let user = User.getByUsername(username)
    if(!user) return new User(opts);
    return user;
  }
  /**
   * Get server configuration from JSON file by type
   *
   * @method     Backend.Config#getServerConfigByType
   *
   * @param      {string}        type      The type
   * @param      {Function}      callback  Callback to execute on the matches
   * @return     {Array.Object}  Array of config items matching the server type
   */
  getServerConfigByType = (type, callback) =>
  {
    if(typeof type != 'string') return false;
    let matches = this.servers.filter((a) => a.type == type);
    if(typeof callback == 'function') matches.forEach(callback);
    return matches;
  }
}

export default Config;