import Config from './config';

import Server from './server';
import Mumble from './mumble';
import Vmix from './vmix';
import Aten from './aten';
import Atem from './atem';
import Netgear from './netgear';
import User from './user';
import { Client as TPLinkClient } from 'tplink-smarthome-api';

import express from 'express';
import { Server as HttpServer } from 'http';
import SocketIO from 'socket.io';
import { exec } from 'child_process';
import wol from 'wol';
import EventEmitter from 'events';

/**
 * Server application
 *
 * @extends    EventEmitter
 * @memberof   Backend
 */
class Application extends EventEmitter
{
  /**
   * Static instance of this class.
   *
   * @type     Backend.Application
   */
  static _instance;
  /**
   * Process an object with tally states from multiple hosts and combine them into
   * one. Program states (1) take precedence over preview (2) states and lastly
   * comes the stand-by (0) state.
   *
   * @param      {Object}  t       Tally information from all hosts
   * @return     {Array}   Array of tally information, combined by importance
   */
  static _combineTallies = t =>
  {
    let all = Object.values(t);
    let max = Math.max(...(all.map(el => el != null && el.length)));
    let result = [];
    for (let i = 0; i < max; i++)
    {
      let map = all.map(el => el ? parseInt(el[i]) || 0 : 0);
      let status = map.indexOf(1) != -1 ? 1 : Math.max(...map);
      result.push(status);
    }
    return result;
  }
  /**
   * Collection of all Plug objects
   *
   * @type       {Array}
   */
  _plugs = []
  /**
   * Logger function. Will relay log to console.log and will use the first
   * parameter as a string to log to connected admin clients.
   *
   * @param      {string}  msg     First parameter
   */
  logger = function(msg)
  {
    console.log.apply(console, arguments);
    this._io.to('admins').emit('admin.log', msg);
  };
  /**
   * Constructs the object or returns the instance if it already exists.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts) 
  {
    super();
    if(Application._instance) return Application._instance;
    Application._instance = this;
    /**
     * Configuration instance
     *
     * @type       {Backend.Config}
     */
    this.config = new Config(opts.configPaths)
      .on('saved.users', () => this.logger('Users.json file has been saved!'));

    /**
     * Kick-off server connections
     */
    this.config.getServerConfigByType('mumble', this._createMumble);
    this.config.getServerConfigByType('vmix', this._createVmix);
    this.config.getServerConfigByType('aten', this._createAten);
    this.config.getServerConfigByType('atem', this._createAtem);
    this.config.getServerConfigByType('netgear', this._createNetgear);

    /**
     * TPLink Kasa API
     *
     * @type       {TPLinkClient}
     */
    this.tplink = new TPLinkClient()
      .startDiscovery()
      .on('plug-new', this._smartPlugHandler);

    /**
     * Broadcast server status to admin clients
     *
     * @event      Backend.Application#event:"broadcast.servers"
     */
    this.on('broadcast.servers', this._broadcastServers);
    /**
     * Broadcast tally status to admins and users connected to the socket
     *
     * @event      Backend.Application#event:"broadcast.tallies"
     */
    this.on('broadcast.tallies', this._broadcastTallies);
    /**
     * Broadcast user status to admin clients
     *
     * @event      Backend.Application#event:"broadcast.users"
     */
    this.on('broadcast.users', this._broadcastUsers);
    /**
     * Broadcast smartplug status to admin clients
     *
     * @event      Backend.Application#event:"broadcast.plugs"
     */
    this.on('broadcast.plugs', this._broadcastPlugs);
    /**
     * Broadcast all component statuses to admin clients and users
     *
     * @event      Backend.Application#event:broadcast
     */
    this.on('broadcast', this._broadcastServers);
    this.on('broadcast', this._broadcastTallies);
    this.on('broadcast', this._broadcastUsers);
    this.on('broadcast', this._broadcastPlugs);

    /**
     * Socket.IO
     */
    /**
     * Express application
     */
    this._app = express();
    /**
     * http.Server instance
     */
    this._server = HttpServer(this._app);
    /**
     * Socket.IO server
     */
    this._io = SocketIO(this._server);

    this._server.listen(80);
    this._app.use(express.static('dist/www'));

    /**
     * User joins socket server
     */
    this._io.on('connection', this._onSocketConnection);
  }
  /**
   * Executed when a client connects to socket.io
   *
   * @param      {Object}  socket  The socket
   */
  _onSocketConnection = socket => {
    let username = socket.handshake.query.username;
    if(username == 's')
    {
      return socket.disconnect(); // disallow username 'users'
    }

    if(username)
    {
      if (!this.config.getUser(username))
        return socket.disconnect(); // user not in config

      socket.join('users');
      this.emit('broadcast.users');
      let room = socket.join(username);

      this.logger(username + ' has connected!');

      /**
       * User-only commands
       */
      socket.on('request', () =>
      {
        this.logger(username + ' sent an update request.');
        room.emit('status', User.getByUsername(username));
      });
      socket.on('cycleUser', () =>
      {
        Mumble.cycleUser(username);
      });
      socket.on('disconnect', () =>
      {
        this.logger(username + ' has disconnected.');
        this._io.to('admins').emit('admin.user.disconnect', username)
      });
    }

    let password = socket.handshake.query.password;
    if(typeof password != 'undefined')
    {
      if(password != this.config.admin.adminPass)
        return socket.disconnect();

      socket.join('admins').emit('authenticated');
      this.logger('An admin has connected!');

      /**
       * Admin-only commands
       */

      /**
       * Set new data on a user and save the config file
       */
      socket.on('admin.set.user', (data, cb) =>
      {
        let user = User.getByUsername(data.username);
        let newName = !data.name ? '' :
                      data.name.replace(/[^\w\s]/gi, '').substring(0, 30);
        let newNumber = parseInt(data.camNumber);
        let newChannel = !data.channelName ? '' :
                         data.channelName.replace(/[^\w\s]/gi, '').substring(0, 30);
        let r = { errors: false, camNumber: false, channelName: false };

        if (isNaN(newNumber) || newNumber < 1 || newNumber > 99)
        {
          r.camNumber = true;
          r.errors = true;
        }
        if (Mumble.cycleableChannels.indexOf(newChannel) == -1)
        {
          r.channelName = true;
          r.errors = true;
        }

        if(r.errors) return cb(r);

        user.name = newName;
        user.camNumber = newNumber;
        Server.getByType('mumble').forEach((m) =>
        {
          if(!m.client) return;
          let mumbleUser = m.client.userByName(data.username);
          if(!mumbleUser) return;
          mumbleUser.moveToChannel(newChannel);
        });
        this.emit('broadcast.users');
        this.emit('broadcast.tallies');
        this.config.saveUsers();
        cb(r);
      });

      /**
       * Toggle the power state of a smart plug
       */
      socket.on('admin.plug.toggle', (hostname) =>
      {
        if(typeof hostname == 'undefined') return false;
        let result = this._plugs.filter((a) => a.host == hostname);
        let device = result.length == 1 ? result[0] : false;
        if(device) device.togglePowerState();
      })

      /**
       * Logout admin user
       */
      socket.on('admin.logout', () => socket.disconnect());
      /**
       * Broadcast all settings
       */
      socket.on('admin.update', () => this.emit('broadcast'));
      /**
       * Restart the server by exiting the process and letting
       * forever start it again.
       */
      socket.on('admin.restart', () => process.exit(0));
      /**
       * Reboot a user or server.
       */
      socket.on('admin.reboot', (p) =>
      {
        if(p.indexOf('user') == 0)
          return this._io.to(p).emit('reboot');
        let server = Server.getByName(p);
        if(server)
        {
          if(server.type == 'vmix')
          {
            // Reboot windows pc
            return exec('shutdown /r /m \\\\' + server.hostname + ' /f /t 5 /c "Reboot by administration interface"');
          }
          if(server.type == 'netgear')
            server.rebootPending = true; // will reboot on next ping
        }
      });
      /**
       * Shutdown a user or server.
       */
      socket.on('admin.shutdown', (p) =>
      {
        if(p.indexOf('user') == 0)
          return this._io.to(p).emit('shutdown');
        let server = Server.getByName(p);
        if(server)
        {
          // Shutdown windows pc
          if(server.type == 'vmix')
            return exec('shutdown /s /m \\\\' + server.hostname + ' /f /t 5 /c "Shutdown by administration interface"');
        }
      });
      /**
       * Send a WOL packet to a server that supports it.
       */
      socket.on('admin.wake', (p) =>
      {
        let server = Server.getByName(p);
        if(server && typeof server.wol == 'string')
        {
          if(server.type == 'vmix')
          {
            // Wake windows pc
            let mac = server.wol;
            wol.wake(mac, () => this.logger('WOL sent to ' + mac + '.'));
          }
        }
      });

      /**
       * Reboot all users
       */
      socket.on('admin.rebootUsers', () => this._io.to('users').emit('reboot'));
      /**
       * Update the client software on all users.
       */
      socket.on('admin.updateUsers', () => this._io.to('users').emit('update'));
      /**
       * Shutdown all users
       */
      socket.on('admin.shutdownUsers', () => this._io.to('users').emit('shutdown'));
      /**
       * Shutdown all users and servers, and then shut down self.
       */
      socket.on('admin.shutdownAll', () =>
      {
        io.to('users').emit('shutdown');
        Server._instances.forEach((server) =>
        {
          // Shutdown windows pc
          exec('shutdown /s /m \\\\' + server.hostname + ' /f /t 5 /c "Shutdown by administration interface"');
        });
        // Shutdown self
        exec('shutdown /s /f /t 10 /c "Shutdown by administration interface"');
        this.logger('Bye bye!');
      });
    }
  }
  /**
   * Executed when a new smartplug is found
   *
   * @param      {Object}  device  The device
   */
  _smartPlugHandler = (device) =>
  {
    this.logger('Found smartplug ' + device.alias + ' on the network!');
    let index = this._plugs.push(device) - 1;

    /**
     * Poll the smart plug. If we get a response, call broadcastChanges to send
     * the new states to clients. If we get an error, assume the device is dead
     * and will be found again later by auto-discovery.
     */
    const poll = () =>
    {
      device.getSysInfo().then(obj =>
      {
        this.emit('broadcast.plugs');
        setTimeout(poll, 5000);
      }).catch(error =>
      {
        this.logger('No connection to smartplug ' + device.alias + ' or an error occured.');
        delete this._plugs[index];
        this._io.to('admins').emit('admin.plugs.disconnect', device.host)
      });
    }
    poll();
  }
  /**
   * Broadcast server updates
   *
   * @listens Backend.Application#event:"broadcast.servers"
   * @listens Backend.Application#event:broadcast
   */
  _broadcastServers = () =>
  {
    let result = Server._instances.map(s =>
    {
      return {
        type: s.type,
        hostname: s.hostname,
        name: s.name,
        wol: s.wol,
        connected: s.connected
      };
    });
    this._io.to('admins').emit('admin.status.servers', result);
  }
  /**
   * Broadcast tally updates
   * 
   * @listens Backend.Application#event:"broadcast.tallies"
   * @listens Backend.Application#event:broadcast
   */
  _broadcastTallies = () =>
  {
    let result = {};
    let allTallies = Server.tallies;
    // Make a duplicate and sort by server name
    Object.keys(allTallies).sort().forEach(key => result[key] = allTallies[key]);
    // Append the combined (calculated) tally state at the end with a special key '_combined'
    result._combined = Application._combineTallies(allTallies)
    this._io.to('admins').emit('admin.status.tallies', result);

    /**
     * Compare connected users' old tally state and only emit
     * an event when it has changed.
     */
    User._instances.forEach(user =>
    {
      let oldStatus = user.status;
      let newStatus = result._combined[user.camNumber - 1];
      if(newStatus != oldStatus)
      {
        user.status = newStatus;
        this._io.to(user.username).emit('status', user);
      }
    });
  }
  /**
   * Broadcast user updates
   * 
   * @listens Backend.Application#event:"broadcast.users"
   * @listens Backend.Application#event:broadcast
   */
  _broadcastUsers = () =>
  {
    this._io.in('users').clients((error, users) =>
    {
      let result = [];
      users.forEach((id) =>
      {
        let socket = this._io.sockets.connected[id];
        let username = socket.handshake.query.username;
        let user = User.getByUsername(username);
        // Users only appear if they exists in the users.json file
        if(user) result.push(user);
      });
      // Sort users by username
      result.sort((a, b) =>
      {
        let textA = a.username.toUpperCase();
        let textB = b.username.toUpperCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
      });
      this._io.to('admins').emit('admin.users.list', result);
    });
  }
  /**
   * Broadcast smart plug updates
   * 
   * @listens Backend.Application#event:"broadcast.plugs"
   * @listens Backend.Application#event:broadcast
   */
  _broadcastPlugs = () =>
  {
    let result = this._plugs.map(p =>
    {
      return {
        hostname: p.host,
        name: p.alias,
        description: p.description,
        on: p.relayState
      };
    });
    // Sort them by name
    result.sort((a, b) =>
    {
      let textA = a.name.toUpperCase();
      let textB = b.name.toUpperCase();
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
    this._io.to('admins').emit('admin.plugs.list', result);
  }
  /**
   * Bind some standard behavior to all servers
   *
   * @param      {Server}  server  The server
   * @return     {Server}  The server
   * @listens    Backend.Server#event:connection
   * @listens    Backend.Server#event:connected
   * @listens    Backend.Server#event:disconnected
   */
  _defaultServerHandlers = (server) =>
  {
    return server.on('connection', (c) =>
    {
      if(!c) this.logger('No connection to ' + server.name + '.');
    })
    .on('connected', () =>
    {
      this.logger('Connected to ' + server.name + '!');
      this.emit('broadcast.servers');
    })
    .on('disconnected', () =>
    {
      this.emit('broadcast.servers');
    });
  }
  /**
   * Initialize a Mumble server object
   *
   * @param      {Object}          opts    The options
   * @return     {Backend.Mumble}  The server instance that was created
   */
  _createMumble = (opts) =>
  {
    return this._defaultServerHandlers(new Mumble(opts))
      .on('user-channels', (channels) =>
      {
        Object.keys(channels).forEach((username) =>
        {
          let user = User.getByUsername(username);
          if(user) user.channelName = channels[username];
        })
        this.emit('broadcast.users');
      })
      .on('user-move', (username, channelName) =>
      {
        let user = User.getByUsername(username);
        if(user) user.channelName = channelName;
        this.emit('broadcast.users');
      })
      .on('user-talk', (username, status) =>
      {
        if(username.indexOf('user') == 0)
        {
          let user = User.getByUsername(username);
          if(user.talking != status)
          {
            user.talking = status;
            this.emit('broadcast.users');
          }
        }
      });
  }
  /**
   * Initialize a vMix server object
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Vmix}  The server instance that was created
   */
  _createVmix = (opts) =>
  {
    return this._defaultServerHandlers(new Vmix(opts))
      .on('disconnected', () =>
      {
        this.emit('broadcast.tallies');
      })
      .on('tallies', (tallies) =>
      {
        this.emit('broadcast.tallies');
      });
  }
  /**
   * Initialize a Aten server object
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Aten}  The server instance that was created
   */
  _createAten = (opts) =>
  {
    return this._defaultServerHandlers(new Aten(opts))
  }
  /**
   * Initialize a Atem server object
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Atem}  The server instance that was created
   */
  _createAtem = (opts) =>
  {
    return this._defaultServerHandlers(new Atem(opts))
      .on('disconnected', () =>
      {
        this.emit('broadcast.tallies');
      })
      .on('tallies', (tallies) =>
      {
        this.emit('broadcast.tallies');
      });
  }
  /**
   * Initialize a Netgear server object
   *
   * @param      {Object}           opts    The options
   * @return     {Backend.Netgear}  The server instance that was created
   */
  _createNetgear = (opts) =>
  {
    return this._defaultServerHandlers(new Netgear(opts));
  }
}

export default Application;