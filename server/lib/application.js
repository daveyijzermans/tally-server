import Config from './config';

import Server from './server';
import Mixer from './mixer';
import Router from './router';
import Mumble from './mumble';
import Vmix from './vmix';
import Focusrite from './focusrite';
import Videohub from './videohub';
import Aten from './aten';
import Atem from './atem';
import Netgear from './netgear';
import Huawei from './huawei';
import Apc from './apc';
import User from './user';
import API from './api';
/**
 * TPLinkClient API
 *
 * @class      TPLinkClient
 * @see        {@link https://github.com/plasticrake/tplink-smarthome-api/blob/master/API.md tplink-smarthome-api documentation}
 */
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
import EventEmitter from './events-custom';
import log from './logger';

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
      .on('saved.users', () => log.info('Users.json file has been saved!'))
      .on('saved.admin', (config) =>
      {
        log.info('Admin.json file has been saved!');
        if(config.updateMixerNames)
          Mixer.updateMixerNames(User._instances);
        this.emit('broadcast.config');
      });

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

    const port = 8080;
    this._server.listen(port);
    this._app.use(express.static('dist/www'));
    this._app.use('/docs', express.static('dist/docs'));
    log.debug('[Application] Express server listening on port', port);
    log.on('info', this._socketLog);
    log.on('warn', this._socketLog);
    log.on('error', this._socketLog);

    /* Kick-off server connections */
    this.config.getServerConfigByType('mumble', this._createMumble);
    this.config.getServerConfigByType('vmix', this._createVmix);
    this.config.getServerConfigByType('atem', this._createAtem);
    this.config.getServerConfigByType('videohub', this._createVideohub);
    this.config.getServerConfigByType('aten', this._createAten);
    this.config.getServerConfigByType('focusrite', this._createFocusrite);
    this.config.getServerConfigByType('huawei', this._createHuawei);
    this.config.getServerConfigByType('apc', this._createApc);
    this.config.getServerConfigByType('netgear', this._createNetgear);

    /* Create all users */
    log.debug('[Application] Creating all users from config...');
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
     * Broadcast config to admin clients
     *
     * @event      Backend.Application#event:"broadcast.config"
     */
    this.on('broadcast.config', this._broadcastConfig);
    /**
     * Broadcast all component statuses to admin clients and users
     *
     * @event      Backend.Application#event:broadcast
     */
    this.on('broadcast', this._broadcastServers);
    this.on('broadcast', this._broadcastUsers);
    this.on('broadcast', this._broadcastPlugs);
    this.on('broadcast', this._broadcastConfig);

    log.debug('[Application] Initializing web API...');
    /**
     * Web API class instance
     * 
     * @type {Backend.API}
     */
    this._webAPI = new API({
      adminPass: this.config.admin.adminPass
    });
    this._app.use('/api', this._webAPI.router);

    /**
     * Listen to plug commands from the API
     *
     * @listens Backend.API#event:plugs
     */
    this._webAPI.on('plugs', (hosts, cmd, cb) =>
    {
      cb(this._plugCmd(hosts, cmd));
    })

    /**
     * User joins socket server
     * 
     * @event      Socket#event:connection
     */
    this._io.on('connection', this._onSocketConnection);
    this._uptimeInterval = setInterval(() => this._io.to('admins').emit('uptime', process.uptime()), 5000);
  }
  /**
   * Redirect log messages to admins
   *
   * @method      Backend.Application#_socketLog
   *
   * @param      {mixed}  msg     The message
   * @listens    Backend.Logger#event:info
   * @listens    Backend.Logger#event:warn
   * @listens    Backend.Logger#event:error
   */
  _socketLog = (msg) =>
  {
    if(typeof msg == 'object') msg = msg.toString();
    /**
     * Send a log message to admin clients
     *
     * @event      Socket#event:"admin.log"
     * @param      {string}  msg     The message.
     */
    this._io.to('admins').emit('admin.log', msg);
  }
  /**
   * Executed when a client connects to socket.io
   *
   * @method     Backend.Application#_onSocketConnection
   *
   * @param      {Object}  socket  The socket
   * @fires      Backend.Application#event:"broadcast.users"
   * @fires      Socket#event:authenticated
   * @listens    Socket#event:connection
   */
  _onSocketConnection = socket => {
    let username = socket.handshake.query.username;
    if(username == 's')
      return socket.disconnect(); // disallow username 'users'

    if(username)
    {
      if(!User.getByUsername(username))
      {
        log.warn(username + ' tried to connect, but is not in config. Disconnecting...');
        return socket.disconnect(); // user not in config
      }

      socket.join('users');
      let room = socket.join(username);

      log.info(username + ' has connected!');
      User.getByUsername(username).connections++;
      this.emit('broadcast.users');

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

      socket.on('disconnect', () => this._userDisconnect(username));
    }

    let password = socket.handshake.query.password;
    if(typeof password != 'undefined')
    {
      if(password != this.config.admin.adminPass)
      {
        log.warn('Administrator tried to connect with wrong password. Disconnecting...');
        return socket.disconnect();
      }
      log.info('An admin has connected!');

      /**
       * Let the admin know the authentication was successful
       * 
       * @event      Socket#event:authenticated
       */
      socket.join('admins').emit('authenticated');

      /* Admin-only commands */
      /**
       * Set new data on a user and save the config file
       *
       * @event      Socket#event:"admin.set.user"
       * @param      {Object}         data              The data
       * @param      {string}         data.username     Current username
       * @param      {string}         data.name         New display name
       * @param      {string|number}  data.camNumber    New camera number
       * @param      {string}         data.channelName  New channel name
       * @param      {Function}       cb                Callback
       */
      socket.on('admin.set.user', this._adminUserSet);

      socket.on('subscribe', socket.join);

      /**
       * Toggle the power state of a smart plug
       *
       * @event      Socket#event:"admin.plug.toggle"
       * @param      {string}  hosts         Hostnames comma seperated or '*' to
       *                                     target all. Start with ! to exclude
       * @param      {string}  [cmd=toggle]  Command to execute (on, off or
       *                                     toggle)
       */
      socket.on('admin.plug.toggle', this._plugCmd);

      /**
       * Send a command to a mixer
       *
       * @event      Socket#event:"admin.mixer.command"
       */
      socket.on('admin.mixer.command', this._mixerCmd);
      
      /**
       * Link a mixer to another mixer
       * 
       * @event      Socket#event:"admin.mixer.link"
       */
      socket.on('admin.mixer.link', this._mixerLink);
      /**
       * Unlink a mixer
       *
       * @event      Socket#event:"admin.mixer.unlink"
       */
      socket.on('admin.mixer.unlink', this._mixerUnlink);

      /**
       * Send route a router
       *
       * @event      Socket#event:"admin.router.route"
       */
      socket.on('admin.router.route', this._routerRoute);
      /**
       * Toggle config value
       * 
       * @event      Socket#event:"admin.config.toggle"
       */
      socket.on('admin.config.toggle', this.config.adminToggle);
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
       * @fires      Backend.Application#event:broadcast
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

      this._io.to('admins').emit('uptime', process.uptime());
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
    log.debug('[Application] ' + username + ' sent an update request.');
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
    log.debug('[Application] ' + username + ' sent an a user cycle request.');
    Mumble.cycleUser(username);
  }
  /**
   * User is disconnected
   *
   * @method     Backend.Application#_userDisconnect
   * @param      {string}  username  The username
   *
   * @listens      Socket#event:disconnect
   */
  _userDisconnect = (username) =>
  {
    log.info(username + ' has disconnected.');
    User.getByUsername(username).connections--;
    this.emit('broadcast.users');
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
   * @fires      Backend.Application#event:"broadcast.servers"
   */
  _adminUserSet = (data, cb) =>
  {
    log.debug('[Application] Editing user with new data:', data)
    let user = User.getByUsername(data.username);
    let newName = !data.name ? '' :
                  data.name.replace(/[^\w\s]/gi, '').substring(0, 30);
    let newNumber = parseInt(data.camNumber);
    let newChannel = !data.channelName ? '' :
                     data.channelName.replace(/[^\w\s]/gi, '').substring(0, 30);
    let r = { errors: false, camNumber: false, channelName: false };

    if(isNaN(newNumber) || newNumber < 1 || newNumber > 99)
    {
      r.camNumber = true;
      r.errors = true;
    }
    if(Mumble.cycleableChannels.indexOf(newChannel) == -1)
    {
      r.channelName = true;
      r.errors = true;
    }

    if(r.errors)
    {
      log.debug('[Application] Errors is new data:', r.errors)
      return cb(r);
    }

    if(user.name != newName)
    {
      user.name = newName;
      this.config.admin.updateMixerNames && Mixer.updateMixerNames(User._instances);
    }
    user.camNumber = newNumber;
    Server.getByType('mumble').forEach((m) =>
    {
      if(!m.client) return;
      let mumbleUser = m.client.userByName(data.username);
      if(!mumbleUser) return;
      mumbleUser.moveToChannel(newChannel);
    });
    this.emit('broadcast.servers');
    this.emit('broadcast.users');
    this.config.saveUsers();
    cb(r);
  }
  /**
   * Send a command to a mixer
   *
   * @method     Backend.Application#_mixerCmd
   *
   * @listens    Socket#event:"admin.mixer.command"
   *
   * @param      {string}   name    The mixer name or '*' to target all
   * @param      {string}   method  The method to call
   * @param      {Array}    args    Arguments to pass to the function
   * @return     {boolean}  Whether the command was successful.
   */
  _mixerCmd = (name, method, args) =>
  {
    const methods = ['switchInput', 'cut', 'transition', 'fade', 'setTransition', 'setDuration'];
    if(methods.indexOf(method) == -1) return false;
    log.debug('[Application] Executing mixer command', method, 'on mixer', name, 'with arguments', args);
    if(name === '*')
    {
      Mixer._instances.filter((s) => !(s.linked instanceof Mixer))
        .forEach((s) => s[method] ? s[method].apply(s, args) : false);
      return true;
    }
    
    let s = Mixer.getByName(name);
    return s && s[method] ? s[method].apply(s, args) : false;
  };
  /**
   * Link a mixer to another mixer
   *
   * @method     Backend.Application#_mixerLink
   * 
   * @listens    Socket#event:"admin.mixer.link"
   */
  _mixerLink = (params) =>
  {
    let s = Mixer.getByName(params.slave);
    if(s && s.linkTo)
      try { return s.linkTo(params.master); }
      catch(e) { log.error(e.message); return false }
  }
  /**
   * Unlink a mixer
   *
   * @method     Backend.Application#_mixerUnlink
   * 
   * @listens    Socket#event:"admin.mixer.unlink"
   */
  _mixerUnlink = (name) =>
  {
    let s = Mixer.getByName(name)
    return s.unlink ? s.unlink() : false;
  }
  /**
   * Route an input to an output
   *
   * @method     Backend.Application#_routerRoute
   *
   * @param      {string}  name    The router name
   * @param      {number}  input   The input number
   * @param      {number}  output  The output number
   * 
   * @listens    Socket#event:"admin.router.route"
   */
  _routerRoute = (name, input, output) =>
  {
    let r = Router.getByName(name)
    return r.route ? r.route(input, output) : false;
  }
  /**
   * Toggle a smartplug power state
   *
   * @method     Backend.Application#_plugCmd
   *
   * @param      {string}   hosts         The hostname or '*' to target all
   * @param      {string}   [cmd=toggle]  Command to execute (on, off or toggle)
   * @return     {Promise}  Promise object
   * @listens    Socket#event:"admin.plug.toggle"
   */
  _plugCmd = (hosts, cmd = 'toggle') =>
  {
    if(typeof hosts == 'undefined') return Promise.reject(new Error('hosts?'));
    let execute = (device) =>
    {
      if(!device) return Promise.reject(new Error('device?'));
      if(cmd == 'toggle')
        return device.togglePowerState();
      if(cmd == 'on')
        return device.setPowerState(true);
      if(cmd == 'off')
        return device.setPowerState(false);
    }
    /* Target all plugs that are discovered. */
    if(hosts === '*')
      return Promise.all(this._plugs.map((d) => execute(d)));

    /*
     * If the host starts with ! then we want to target all except the given host
     */
    let exclude = false;
    if(hosts.charAt(0) === '!')
    {
      exclude = true;
      hosts = hosts.substring(1);
    }
    /*
     * Array of hosts we want to exclude
     */
    hosts = hosts.split(',');

    return Promise.all(this._plugs.map((d) =>
    {
      /*
       * Is this host in the list?
       */
      let i = hosts.indexOf(d.host);
      /*
       * If we want to exclude this host, this host should not be in the list.
       * If we want to include this host, this host should be in the list.
       * If the requirement is true for the given situation, execute the action.
       */
      if(exclude ? i == -1 : i != -1) return execute(d);
    }));
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
    {
      log.info('Rebooting user ' + p);
      return this._io.to(p).emit('reboot');
    }
    let server = Server.getByName(p);
    if(server)
    {
      if(server.type == 'vmix')
      {
        log.info('Rebooting server ' + server.name);
        // Reboot windows pc
        return exec('/usr/bin/net rpc shutdown -r -I ' + server.hostname + ' -U ' + server.winUserPass + ' -f -t 5 -C "Shutdown by administration interface"');
      }
      if(server.type == 'netgear')
        return server.rebootPending = true; // will reboot on next ping
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
        wol.wake(mac, () => log.info('WOL sent to ' + mac + '.'));
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
    {
      log.info('Shutdown user ' + p);
      return this._io.to(p).emit('shutdown');
    }
    let server = Server.getByName(p);
    if(server)
    {
      // Shutdown windows pc
      if(server.type == 'vmix')
      {
        log.info('Shutting down server ' + server.name);
        return exec('/usr/bin/net rpc shutdown -I ' + server.hostname + ' -U ' + server.winUserPass + ' -f -t 5 -C "Shutdown by administration interface"');
      }
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
    log.info('Shutdown all users');
    this._io.to('users').emit('shutdown');
    Server._instances.forEach((server) =>
    {
      // Shutdown windows pc
      log.info('Shutting down server ' + server.name);
      exec('/usr/bin/net rpc shutdown -I ' + server.hostname + ' -U ' + server.winUserPass + ' -f -t 5 -C "Shutdown by administration interface"');
    });
    // Shutdown self
    exec('/usr/bin/sudo /sbin/shutdown 1');
    log.info('Self-shutdown set for one minute. Use sudo shutdown -c to cancel. Bye bye!');
  }
  /**
   * Executed when a new smartplug is found
   *
   * @method     Backend.Application#_smartPlugHandler
   * @param      {Object}  device  The device
   * @fires      Socket#event:"admin.plugs.list"
   * @fires      Socket#event:"admin.plugs.disconnect"
   */
  _smartPlugHandler = (device) =>
  {
    log.info('Found smartplug ' + device.alias + ' on the network!');
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
        log.info('No connection to smartplug ' + device.alias + ' or an error occured.');
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
   * @fires      Socket#event:status
   * @fires      Socket#event:"admin.status.servers"
   */
  _broadcastServers = () =>
  {
    /*
     * Compare connected users' old tally state and only emit
     * an event when it has changed.
     */
    let combined = Mixer.combined;
    User._instances.forEach(user =>
    {
      let oldStatus = user.status;
      let newStatus = combined[user.camNumber];
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
        log.trace('[Application] Broadcasted user status', user);
      }
    });
    /**
     * Broadcast an array on server information
     *
     * @event      Socket#event:"admin.status.servers"
     * @param      {Object[]}        result            Array of servers.
     */
    this._io.to('admins').emit('admin.status.servers', Server.allStatus);
    log.trace('[Application] Broadcasted server and mixer information', Server.allStatus, Mixer.allStatus);
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
    let result = User._instances;
    /**
     * Broadcast users data to admins
     * 
     * @event Socket#event:"admin.users.list"
     * @param      {Backend.User[]} result Array of users
     */
    this._io.to('admins').emit('admin.users.list', result);
    log.trace('[Application] Broadcasted user information', result);
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
    let result = this._plugs
    .filter((p) => { return typeof p == 'object'; })
    .map(p =>
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
    log.trace('[Application] Broadcasted smartplug information', result);
  }
  /**
   * Broadcast config options
   *
   * @method     Backend.Application#_broadcastConfig
   * 
   * @listens Backend.Application#event:"broadcast.config"
   * @listens Backend.Application#event:broadcast
   * @fires   Socket#event:"admin.config"
   */
  _broadcastConfig = () =>
  {
    let safe = Object.assign({}, this.config.admin);
    delete safe.adminPass;
    this._io.to('admins').emit('admin.config', safe);
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
      if(!c) log.info('No connection to ' + server.name + '.');
    })
    .on('connected', () =>
    {
      log.info('Connected to ' + server.name + '!');
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
   * @listens    Backend.Mumble#event:user-channels
   * @listens    Backend.Mumble#event:user-move
   * @listens    Backend.Mumble#event:user-talk
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
   * @listens    Backend.Mixer#event:linked
   * @listens    Backend.Mixer#event:unlinked
   * @listens    Backend.Mixer#event:action
   * @listens    Backend.Mixer#event:controlChange
   * @listens    Backend.Server#event:disconnected
   * @listens    Backend.Mixer#event:tallies
   * @fires      Backend.Application#event:"broadcast.servers"
   * @fires      Backend.Application#event:"broadcast.users"
   * @fires      Socket#event:"admin.audiomixer.controlChange"
   */
  _createVmix = (opts) =>
  {
    return this._defaultServerHandlers(new Vmix(opts))
      .on('connected', () =>
      {
        if(this.config.admin.updateMixerNames)
          Mixer.updateMixerNames(User._instances);
      })
      .on('disconnected', () =>
      {
        this.emit('broadcast.servers');
        this.emit('broadcast.users');
      })
      .on('tallies', (tallies) =>
      {
        this.emit('broadcast.servers');
        this.emit('broadcast.users');
      })
      .on('action', () =>
      {
        this.emit('broadcast.servers');
      })
      .on('linked', () =>
      {
        this.emit('broadcast.servers');
      })
      .on('unlinked', () =>
      {
        this.emit('broadcast.servers');
      })
      .on('controlChange', (data) =>
      { 
        let type = data.w;
        let number = data.i;
        this._io.to('controlChange').emit('admin.audiomixer.controlChange', opts.name, type, number, data);
      });
  }
  /**
   * Initialize a Focusrite server object
   *
   * @method     Backend.Application#_createFocusrite
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Focusrite}  The server instance that was created
   * @listens    Backend.Server#event:updated
   * @listens    Backend.Router#event:controlChange
   * @listens    Backend.Server#event:disconnected
   * @fires      Backend.Application#event:"broadcast.servers"
   * @fires      Socket#event:"admin.audiomixer.controlChange"
   */
  _createFocusrite = (opts) =>
  {
    return this._defaultServerHandlers(new Focusrite(Object.assign({
      clientKey: this.config.admin.clientKey,
      clientName: this.config.admin.clientName
    }, opts)))
    .on('updated', () =>
    {
      this.emit('broadcast.servers');
    })
    .on('controlChange', (data) =>
    {
      let type = data.w;
      let number = data.i;
      this._io.to('controlChange').emit('admin.audiomixer.controlChange', opts.name, type, number, data);
    });
  }
  /**
   * Initialize a Videohub server object
   *
   * @method     Backend.Application#_createVideohub
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Videohub}  The server instance that was created
   * @listens    Backend.Server#event:updated
   */
  _createVideohub = (opts) =>
  {
    return this._defaultServerHandlers(new Videohub(opts))
    .on('updated', () =>
    {
      this.emit('broadcast.servers');
    });
  }
  /**
   * Initialize a Aten server object
   *
   * @method     Backend.Application#_createAten
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Aten}  The server instance that was created
   * 
   * @listens    Backend.Server#event:updated
   */
  _createAten = (opts) =>
  {
    return this._defaultServerHandlers(new Aten(opts))
    .on('updated', () =>
    {
      this.emit('broadcast.servers');
    });
  }
  /**
   * Initialize a Atem server object
   *
   * @method     Backend.Application#_createAtem
   *
   * @param      {Object}        opts    The options
   * @return     {Backend.Atem}  The server instance that was created
   * @listens    Backend.Mixer#event:linked
   * @listens    Backend.Mixer#event:unlinked
   * @listens    Backend.Mixer#event:action
   * @listens    Backend.Server#event:disconnected
   * @listens    Backend.Mixer#event:tallies
   * @fires      Backend.Application#event:"broadcast.servers"
   * @fires      Backend.Application#event:"broadcast.users"
   */
  _createAtem = (opts) =>
  {
    return this._defaultServerHandlers(new Atem(opts))
      .on('connected', () =>
      {
        if(this.config.admin.updateMixerNames)
          Mixer.updateMixerNames(User._instances);
      })
      .on('disconnected', () =>
      {
        this.emit('broadcast.servers');
        this.emit('broadcast.users');
      })
      .on('tallies', (tallies) =>
      {
        this.emit('broadcast.servers');
        this.emit('broadcast.users');
      })
      .on('action', () =>
      {
        this.emit('broadcast.servers');
      })
      .on('linked', () =>
      {
        this.emit('broadcast.servers');
      })
      .on('unlinked', () =>
      {
        this.emit('broadcast.servers');
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
  /**
   * Initialize a Huawei server object
   *
   * @method     Backend.Application#_createHuawei
   *
   * @param      {Object}           opts    The options
   * @return     {Backend.Huawei}  The server instance that was created
   * @listens    Backend.Server#event:updated
   */
  _createHuawei = (opts) =>
  {
    return this._defaultServerHandlers(new Huawei(opts))
    .on('updated', () =>
    {
      this.emit('broadcast.servers');
    });
  }
  /**
   * Initialize a Apc server object
   *
   * @method     Backend.Application#_createApc
   *
   * @param      {Object}           opts    The options
   * @return     {Backend.Apc}  The server instance that was created
   * @listens    Backend.Server#event:updated
   */
  _createApc = (opts) =>
  {
    return this._defaultServerHandlers(new Apc(opts))
    .on('updated', () =>
    {
      this.emit('broadcast.servers');
    });
  }
}
/**
 * Static instance of this class.
 *
 * @type     {Backend.Application}
 */
Application._instance;

/**
 * Catch-all for admin commands
 *
 * @event      Socket#event:"admin.*"
 */

export default Application;
