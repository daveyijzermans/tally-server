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
/**
 * Socket.IO server
 *
 * @class      Socket
 * @see         {@link https://socket.io/docs/server-api/ Socket.IO server API}
 */
import Socket from 'socket.io';
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
   * Collection of all Plug objects
   *
   * @type       {Object[]}
   */
  _plugs = []
  /**
   * Logger function. Will relay log to console.log and will use the first
   * parameter as a string to log to connected admin clients.
   *
   * @method     Backend.Application#logger
   * 
   * @param      {string}  msg     First parameter
   */
  logger = function(msg)
  {
    console.log.apply(console, arguments);
    /**
     * Send a log message to admin clients
     *
     * @event      Socket#event:"admin.log"
     * @param      {string}  msg     The message.
     */
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
     * @listens    Backend.Config#event:"saved.users"
     */
    this.config = new Config(opts.paths)
      .on('saved.users', () => this.logger('Users.json file has been saved!'));

    /*
     * Kick-off server connections
     */
    this.config.getServerConfigByType('mumble', this._createMumble);
    this.config.getServerConfigByType('vmix', this._createVmix);
    this.config.getServerConfigByType('aten', this._createAten);
    this.config.getServerConfigByType('atem', this._createAtem);
    this.config.getServerConfigByType('netgear', this._createNetgear);

    /*
     * Create all users
     */
    this.config.makeUsers();

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

    /* Socket.IO */
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
     * 
     * @type {Socket}
     */
    this._io = Socket(this._server);

    this._server.listen(80);
    this._app.use(express.static('dist/www'));

    /**
     * User joins socket server
     * 
     * @event      Socket#event:connection
     */
    this._io.on('connection', this._onSocketConnection);
  }
  /**
   * Executed when a client connects to socket.io
   *
   * @method     Backend.Application#_onSocketConnection
   *
   * @param      {Object}  socket  The socket
   * @fires      Backend.Application#event:"broadcast.users"
   * @fires      Socket#event:"authenticated"
   * @listens    Socket#event:connection
   * @listens    Socket#event:request
   */
  _onSocketConnection = socket => {
    let username = socket.handshake.query.username;
    if(username == 's')
    {
      return socket.disconnect(); // disallow username 'users'
    }

    if(username)
    {
      if (!User.getByUsername(username))
        return socket.disconnect(); // user not in config

      socket.join('users');
      this.emit('broadcast.users');
      let room = socket.join(username);

      this.logger(username + ' has connected!');

      /* User-only commands */
      /**
       * Event sent by a user to request their status
       *
       * @event      Socket#event:request
       */
      socket.on('request', () => this._userRequest(username));
      /**
       * Event sent by a user to request to cycle them to the next configured
       * channel
       *
       * @event      Socket#event:cycleUser
       */
      socket.on('cycleUser', () => this._userCycle(username));
      /**
       * User or admin was disconnected
       *
       * @event      Socket#event:disconnect
       */
      socket.on('disconnect', () => this._userDisconnect(username));
    }

    let password = socket.handshake.query.password;
    if(typeof password != 'undefined')
    {
      if(password != this.config.admin.adminPass)
        return socket.disconnect();

      /**
       * Let the admin know the authentication was successful
       * 
       * @event      Socket#event:authenticated
       */
      socket.join('admins').emit('authenticated');
      this.logger('An admin has connected!');

      /* Admin-only commands */
      /**
       * Set new data on a user and save the config file
       * 
       * @event      Socket#event:"admin.set.user"
       * @param      {Object}         data    The data
       * @param      {string}         data.username     Current username
       * @param      {string}         data.name         New display name
       * @param      {string|number}  data.camNumber    New camera number
       * @param      {string}         data.channelName  New channel name
       * @param      {Function}       cb                Callback
       */
      socket.on('admin.set.user', this._adminUserSet);

      /**
       * Toggle the power state of a smart plug
       * 
       * @event      Socket#event:"admin.plug.toggle"
       * @param      {string}   hostname  The hostname
       */
      socket.on('admin.plug.toggle', this._adminPlugToggle)

      /**
       * Logout admin user
       * 
       * @event      Socket#event:"admin.logout"
       */
      socket.on('admin.logout', () => socket.disconnect());
      /**
       * Event sent by admin to request server data
       * 
       * @event      Socket#event:"admin.update"
       * @fires      Socket#event:broadcast
       */
      socket.on('admin.update', () => this.emit('broadcast'));
      /**
       * Restart the server by exiting the process and letting
       * forever start it again.
       * 
       * @event      Socket#event:"admin.restart"
       */
      socket.on('admin.restart', () => process.exit(0));
      /**
       * Reboot a user or server.
       * 
       * @event      Socket#event:"admin.reboot"
       * @param      {string} p Parameter, either a username or server name
       */
      socket.on('admin.reboot', this._adminReboot);
      /**
       * Shutdown a user or server.
       * 
       * @event      Socket#event:"admin.shutdown"
       * @param      {string} p Parameter, either a username or server name
       */
      socket.on('admin.shutdown', this._adminShutdown);
      /**
       * Send a WOL packet to a server that supports it.
       *
       * @event      Socket#event:"admin.wake"
       * @param      {string}  p       Server name
       */
      socket.on('admin.wake', this._adminWake);
      /**
       * Reboot all users
       *
       * @event      Socket#event:"admin.rebootUsers"
       * @fires      Socket#event:reboot
       */
      socket.on('admin.rebootUsers', () => this._io.to('users').emit('reboot'));
      /**
       * Update the client software on all users.
       *
       * @event      Socket#event:"admin.updateUsers"
       * @fires      Socket#event:update
       */
      socket.on('admin.updateUsers', () => this._io.to('users').emit('update'));
      /**
       * Shutdown all users
       *
       * @event      Socket#event:"admin.shutdownUsers"
       * @fires      Socket#event:shutdown
       */
      socket.on('admin.shutdownUsers', () => this._io.to('users').emit('shutdown'));
      /**
       * Shutdown all users and servers, and then shut down self.
       *
       * @event      Socket#event:"admin.shutdownAll"
       */
      socket.on('admin.shutdownAll', this._adminShutdownAll);
    }
  }
  /**
   * Broadcast user status to user
   *
   * @method     Backend.Application#_userRequest
   * @param      {string}  username  The username
   *
   * @listens      Socket#event:request
   * @fires      Socket#event:status
   */
  _userRequest = (username) =>
  {
    this.logger(username + ' sent an update request.');
    /**
     * Broadcast user status to user
     *
     * @event      Socket#event:status
     * @param      {Backend.User|boolean}  user    The user
     */
    this._io.to(username).emit('status', User.getByUsername(username));
  }
  /**
   * Cycle user between configured mumble channels
   *
   * @method     Backend.Application#_userCycle
   * @param      {string}  username  The username
   *
   * @listens      Socket#event:cycleUser
   */
  _userCycle = (username) =>
  {
    Mumble.cycleUser(username);
  }
  /**
   * User is disconnected
   *
   * @method     Backend.Application#_userDisconnect
   * @param      {string}  username  The username
   *
   * @fires      Socket#event:"admin.user.disconnect"
   * @listens      Socket#event:disconnect
   */
  _userDisconnect = (username) =>
  {
    this.logger(username + ' has disconnected.');
    /**
     * Let admins know that user was disconnected
     * 
     * @event      Socket#event:"admin.user.disconnect"
     */
    this._io.to('admins').emit('admin.user.disconnect', username)
  }
  /**
   * Validate and save user information
   *
   * @method     Backend.Application#_adminUserSet
   *
   * @param      {Object}         data              The data
   * @param      {string}         data.username     Current username
   * @param      {string}         data.name         New display name
   * @param      {string|number}  data.camNumber    New camera number
   * @param      {string}         data.channelName  New channel name
   * @param      {Function}       cb                Callback
   * @listens    Socket#event:"admin.set.user"
   * @fires      Backend.Application#event:"broadcast.users"
   * @fires      Backend.Application#event:"broadcast.tallies"
   */
  _adminUserSet = (data, cb) =>
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
  }
  /**
   * Toggle a smartplug power state
   *
   * @method     Backend.Application#_adminPlugToggle
   *
   * @param      {string}   hostname  The hostname
   * @listens    Socket#event:"admin.plug.toggle"
   */
  _adminPlugToggle = (hostname) =>
  {
    if(typeof hostname == 'undefined') return false;
    let result = this._plugs.filter((a) => a.host == hostname);
    let device = result.length == 1 ? result[0] : false;
    if(device) device.togglePowerState();
  }
  /**
   * Reboot a user or server.
   *
   * @method     Backend.Application#_adminReboot
   *
   * @param      {string}  p       Parameter, either a username or server name
   * @listens    Socket#event:"admin.reboot"
   * @fires      Socket#event:reboot
   */
  _adminReboot = (p) =>
  {
    if(p.indexOf('user') == 0)
      return this._io.to(p).emit('reboot');
    let server = Server.getByName(p);
    if(server)
    {
      if(server.type == 'vmix')
      {
        // Reboot windows pc
        return exec('/usr/bin/net rpc shutdown -r -I ' + server.hostname + ' -U ' + this.config.admin.winUserPass + ' -f -t 5 -C "Shutdown by administration interface"');
      }
      if(server.type == 'netgear')
        server.rebootPending = true; // will reboot on next ping
    }
  }
  /**
   * Send a WOL packet to a server that supports it.
   *
   * @method     Backend.Application#_adminWake
   *
   * @param      {string}  p       Server name
   * @listens    Socket#event:"admin.wake"
   */
  _adminWake = (p) =>
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
  }
  /**
   * Shutdown a user or server.
   *
   * @method     Backend.Application#_adminShutdown
   *
   * @param      {string}  p       Parameter, either a username or server name
   * @listens    Socket#event:"admin.shutdown"
   * @fires      Socket#event:shutdown
   */
  _adminShutdown = (p) =>
  {
    if(p.indexOf('user') == 0)
      return this._io.to(p).emit('shutdown');
    let server = Server.getByName(p);
    if(server)
    {
      // Shutdown windows pc
      if(server.type == 'vmix')
        return exec('/usr/bin/net rpc shutdown -I ' + server.hostname + ' -U ' + this.config.admin.winUserPass + ' -f -t 5 -C "Shutdown by administration interface"');
    }
  }
  /**
   * Shutdown all users and server.
   *
   * @method     Backend.Application#_adminShutdownAll
   *
   * @listens    Socket#event:"admin.shutdownAll"
   * @fires      Socket#event:shutdown
   */
  _adminShutdownAll = () =>
  {
    io.to('users').emit('shutdown');
    Server._instances.forEach((server) =>
    {
      // Shutdown windows pc
      exec('/usr/bin/net rpc shutdown -I ' + server.hostname + ' -U ' + this.config.admin.winUserPass + ' -f -t 5 -C "Shutdown by administration interface"');
    });
    // Shutdown self
    exec('/sbin/shutdown -t 30');
    this.logger('Bye bye!');
  }
  /**
   * Executed when a new smartplug is found
   *
   * @method     Backend.Application#_smartPlugHandler
   * @param      {Object}  device  The device
   * @fires      Socket#event:"broadcast.plugs"
   * @fires      Socket#event:"admin.plugs.disconnect"
   */
  _smartPlugHandler = (device) =>
  {
    this.logger('Found smartplug ' + device.alias + ' on the network!');
    let index = this._plugs.push(device) - 1;

    /*
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
        /**
         * Let admins know a smartplug was disconnected
         *
         * @event      Socket#event:"admin.plugs.disconnect"
         * @param      {string}  hostname  The hostname.
         */
        this._io.to('admins').emit('admin.plugs.disconnect', device.host)
      });
    }
    poll();
  }
  /**
   * Broadcast server updates
   *
   * @method     Backend.Application#_broadcastServers
   *
   * @listens Backend.Application#event:"broadcast.servers"
   * @listens Backend.Application#event:broadcast
   * @fires      Socket#event:"admin.status.servers"
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
    /**
     * Broadcast an array on server information
     *
     * @event      Socket#event:"admin.status.servers"
     * @param      {Object[]}        result            Array of servers.
     * @param      {string}          result.type       The server type
     * @param      {string}          result.hostname   The server hostname
     * @param      {string}          result.name       The server display name
     * @param      {string|boolean}  result.wol        WOL address
     * @param      {boolean}         result.connected  Connection status
     */
    this._io.to('admins').emit('admin.status.servers', result);
  }
  /**
   * Broadcast tally updates
   *
   * @method     Backend.Application#_broadcastTallies
   * 
   * @listens Backend.Application#event:"broadcast.tallies"
   * @listens Backend.Application#event:broadcast
   * @fires   Socket#event:"admin.status.tallies"
   * @fires   Socket#event:status
   */
  _broadcastTallies = () =>
  {
    let result = {};
    let allTallies = Server.tallies;
    // Make a duplicate and sort by server name
    Object.keys(allTallies).sort().forEach(key => result[key] = allTallies[key]);
    // Append the combined (calculated) tally state at the end with a special key '_combined'
    result._combined = Application._combineTallies(allTallies);
    /**
     * Broadcast tally information
     *
     * @event      Socket#event:"admin.status.tallies"
     * @param      {Object.<string, number[]>}  result  Array of tally
     *                                                  information
     */
    this._io.to('admins').emit('admin.status.tallies', result);

    /*
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
        /**
         * Send updated user details to affected users
         *
         * @event      Socket#event:status
         * @param      {Backend.User}  user    User object
         */
        this._io.to(user.username).emit('status', user);
      }
    });
  }
  /**
   * Broadcast user updates
   *
   * @method     Backend.Application#_broadcastUsers
   * 
   * @listens Backend.Application#event:"broadcast.users"
   * @listens Backend.Application#event:broadcast
   * @fires   Socket#event:"admin.users.list"
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
      /**
       * Broadcast users data to admins
       * 
       * @event Socket#event:"admin.users.list"
       * @param      {Backend.User[]} result Array of users
       */
      this._io.to('admins').emit('admin.users.list', result);
    });
  }
  /**
   * Broadcast smart plug updates
   *
   * @method     Backend.Application#_broadcastPlugs
   * 
   * @listens Backend.Application#event:"broadcast.plugs"
   * @listens Backend.Application#event:broadcast
   * @fires   Socket#event:"admin.plugs.list"
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
    /**
     * Broadcast smartplug status to admins
     *
     * @event      Socket#event:"admin.plugs.list"
     * @param      {Object[]}  result              Array of smartplug
     *                                             information
     * @param      {string}    result.hostname     The hostname
     * @param      {string}    result.name         The name
     * @param      {string}    result.description  The description
     * @param      {boolean}   result.on           Whether the plug is powered
     *                                             on
     */
    this._io.to('admins').emit('admin.plugs.list', result);
  }
  /**
   * Bind some standard behavior to all servers
   *
   * @method     Backend.Application#_defaultServerHandlers
   *
   * @param      {Server}  server  The server
   * @return     {Server}  The server
   * @listens    Backend.Server#event:connection
   * @listens    Backend.Server#event:connected
   * @listens    Backend.Server#event:disconnected
   * @fires      Backend.Application#event:"broadcast.servers"
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
   * @method     Backend.Application#_createMumble
   *
   * @param      {Object}          opts    The options
   * @return     {Backend.Mumble}  The server instance that was created
   * @fires      Backend.Application#event:"broadcast.users"
   */
  _createMumble = (opts) =>
  {
    return this._defaultServerHandlers(new Mumble(opts))
      .on('user-channels', (channels) =>
      {
        let b = false;
        Object.keys(channels).forEach((username) =>
        {
          let user = User.getByUsername(username);
          if(user)
          {
            user.channelName = channels[username];
            b = true;
          }
        })
        if(b) this.emit('broadcast.users');
      })
      .on('user-move', (username, channelName) =>
      {
        let user = User.getByUsername(username);
        if(user)
        {
          user.channelName = channelName;
          this.emit('broadcast.users');
        }
      })
      .on('user-talk', (username, status) =>
      {
        if(username.indexOf('user') == 0)
        {
          let user = User.getByUsername(username);
          if(user && user.talking != status)
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
   * @method     Backend.Application#_createVmix
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Vmix}  The server instance that was created
   * @listens    Backend.Server#event:disconnected
   * @listens    Backend.Server#event:tallies
   * @fires      Backend.Application#event:"broadcast.tallies"
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
   * @method     Backend.Application#_createAten
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
   * @method     Backend.Application#_createAtem
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Atem}  The server instance that was created
   * @listens    Backend.Server#event:disconnected
   * @listens    Backend.Server#event:tallies
   * @fires      Backend.Application#event:"broadcast.tallies"
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
   * @method     Backend.Application#_createNetgear
   *
   * @param      {Object}           opts    The options
   * @return     {Backend.Netgear}  The server instance that was created
   */
  _createNetgear = (opts) =>
  {
    return this._defaultServerHandlers(new Netgear(opts));
  }
}
/**
 * Static instance of this class.
 *
 * @type     {Backend.Application}
 */
Application._instance;
/**
 * Process an object with tally states from multiple hosts and combine them into
 * one. Program states (1) take precedence over preview (2) states and lastly
 * comes the stand-by (0) state.
 *
 * @param      {Object.<string, number[]>}  t       Tally information from all hosts
 * @return     {number[]}   Array of tally information, combined by importance
 */
Application._combineTallies = t =>
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

export default Application;