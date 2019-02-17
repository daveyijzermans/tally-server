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
    this.admin = require(opts.admin);
    this.servers = require(opts.servers);
    this.users = require(opts.users);
    this.paths = opts;
  }
  /**
   * Save user data back to JSON file
   * 
   * @fires      Backend.Config#event:saved
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
       * Snowball event.
       * 
       * @event      Backend.Config#event:saved
       */
      this.emit('saved');
    });
  }
  /**
   * Get user configuration from JSON file
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
}

export default Config;