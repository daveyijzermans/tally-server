import User from './user';
import Server from './server';
import fs from 'fs';
import EventEmitter from 'events';

class Config extends EventEmitter
{
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
      this.emit('saved');
    });
  }
  getUser = (username) =>
  {
    if(typeof username == 'undefined') return false;
    let match = this.users.filter((a) => a.username == username);
    let opts = match.length == 1 ? match[0] : false;
    if(!opts) return false;
    let user = User.getByUsername(username)
    if(!user) return new User(opts);
    return user;
  }
  static get cycleableChannels()
  {
    return Server.getByType('mumble').reduce((a, m) =>
    {
      return m.cycleChannels ? a.concat(m.cycleChannels) : a;
    }, []);
  }
}

export default Config;