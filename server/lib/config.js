import User from './user';
import Server from './server';
import fs from 'fs';
import EventEmitter from 'events';
import log from './logger';

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
      if(err) return log.error(err);
      /**
       * Let listeners know the user configuration was saved.
       * 
       * @event      Backend.Config#event:"saved.users"
       * @param      {Object} config Settings that were saved
       */
      this.emit('saved.users', save);
    });
  }
  /**
   * Save admin config back to JSON file
   *
   * @method     Backend.Config#saveAdmin
   * 
   * @fires      Backend.Config#event:"saved.admin"
   */
  saveAdmin = () =>
  {
    let json = JSON.stringify(this.admin);
    fs.writeFile(this.paths.admin, json, 'utf8', (err) => {
      if(err) return log.error(err);
      /**
       * Let listeners know the admin configuration was saved.
       * 
       * @event      Backend.Config#event:"saved.admin"
       * @param      {Object} config Settings that were saved
       */
      this.emit('saved.admin', this.admin);
    });
  }
  /**
   * Make all users using configuration from JSON file
   *
   * @method     Backend.Config#makeUsers
   *
   * @return     {Backend.User[]}  The users.
   */
  makeUsers = () =>
  {
    this.users.forEach((opts) =>
    {
      new User(opts);
    });
    return User._instances;
  }
  /**
   * Get server configuration from JSON file by type
   *
   * @method     Backend.Config#getServerConfigByType
   *
   * @param      {string}        type      The type
   * @param      {Function}      callback  Callback to execute on the matches
   * @return     {Object[]}  Array of config items matching the server type
   */
  getServerConfigByType = (type, callback) =>
  {
    if(typeof type != 'string') return false;
    let matches = this.servers.filter((a) => a.type == type);
    if(typeof callback == 'function') matches.forEach(callback);
    return matches;
  }
  /**
   * Toggle admin config item
   *
   * @param      {string}  item    The item
   * @listens    Socket#event:"admin.config.toggle"
   */
  adminToggle = (item) =>
  {
    if(typeof this.admin[item] == 'boolean')
    {
      this.admin[item] = !this.admin[item];
      this.saveAdmin();
    }
  }
}

export default Config;