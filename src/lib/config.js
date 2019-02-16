import User from './user';
import Server from './server';
import fs from 'fs';
import EventEmitter from 'events';

class Config extends EventEmitter
{
  constructor(opts)
  {
    super();
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
  static get cycleableChannels()
  {
    return Server.getByType('mumble').reduce((a, m) =>
    {
      return m.cycleChannels ? a.concat(m.cycleChannels) : a;
    }, []);
  }
}

export default Config;