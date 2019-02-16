/**
 * Logger function. Will relay log to console.log
 * and will use the first parameter as a string
 * to log to connected admin clients.
 * @param  {string} msg First parameter
 */
const logger = function(msg)
{
  console.log.apply(console, arguments);
  io.to('admins').emit('admin.log', msg);
};

/**
 * CONFIGURATION
 */

import Config from './lib/config'
import path from 'path'

/**
 * Main config object
 * @type Config
 */
const config = new Config({
  admin: path.resolve(__dirname, '../config/admin.json'),
  servers: path.resolve(__dirname, '../config/servers.json'),
  users: path.resolve(__dirname, '../config/users.json')
}).on('saved', () => logger('Users.json file has been saved!'));

/**
 * SERVER CONNECTIONS
 */

import Server from './lib/server';
import Mumble from './lib/mumble';
import Vmix from './lib/vmix';
import Aten from './lib/aten';
import Atem from './lib/atem';
import Netgear from './lib/netgear';
import User from './lib/user';

/**
 * Bind some standard behavior to all servers
 * @param  {Server} server 
 * @return {Server}        
 */
const defaultHandlers = (server) =>
{
  return server.on('connection', (c) =>
  {
    if(!c) logger('No connection to ' + server.name + '.');
  })
  .on('connected', () =>
  {
    logger('Connected to ' + server.name + '!');
    broadcastChanges('servers');
  })
  .on('disconnected', () =>
  {
    broadcastChanges('servers');
  });
}

/**
 * Kick-off server connections
 */
config.servers.forEach((opts) =>
{
  if(opts.type == 'mumble')
  {
    let server = defaultHandlers(new Mumble(opts))
      .on('user-channels', (channels) =>
      {
        Object.keys(channels).forEach((username) =>
        {
          let user = User.getByUsername(username);
          if(user) user.channelName = channels[username];
        })
        broadcastChanges('users');
      })
      .on('user-moved', (username, channelName) =>
      {
        console.log(username, channelName)
        let user = User.getByUsername(username);
        if(user) user.channelName = channelName;
        broadcastChanges('users');
      })
      .on('user-talk', (username, status) =>
      {
        if(username.indexOf('user') == 0)
        {
          let user = User.getByUsername(username);
          if(user.talking != status)
          {
            user.talking = status;
            broadcastChanges('users');
          }
        }
      });
  }
  if(opts.type == 'vmix')
  {
    let server = defaultHandlers(new Vmix(opts))
      .on('disconnected', () =>
      {
        broadcastChanges('tallies');
      })
      .on('tallies', (tallies) =>
      {
        broadcastChanges('tallies');
      });
  }
  if(opts.type == 'aten')
  {
    let server = defaultHandlers(new Aten(opts))
  }
  if(opts.type == 'atem')
  {
    let server = defaultHandlers(new Atem(opts))
      .on('tallies', (tallies) =>
      {
        broadcastChanges('tallies');
      });
  }
  if(opts.type == 'netgear')
  {
    let server = defaultHandlers(new Netgear(opts));
  }
});

/**
 * SMART PLUGS
 */
import { Client } from 'tplink-smarthome-api';
/**
 * TPLink Kasa API
 * @type {tplink-smarthome-api\Client}
 */
const tplink = new Client();
/**
 * Collection of all Plug objects
 * @type {Array}
 */
const plugs = [];
tplink.startDiscovery().on('plug-new', (device) =>
{
  logger('Found smartplug ' + device.alias + ' on the network!');
  plugs.push(device);

  /**
   * Poll the smart plug. If we get a response, call broadcastChanges
   * to send the new states to clients. If we get an error, assume the
   * device is dead and will be found again later by auto-discovery.
   */
  let poll = () =>
  {
    device.getSysInfo().then(obj =>
    {
      broadcastChanges('plugs');
      setTimeout(poll, 5000);
    }).catch(error =>
    {
      logger('No connection to smartplug ' + device.alias + ' or an error occured.');
      delete plugs[plugs.indexOf(device)];
      io.to('admins').emit('admin.plugs.disconnect', device.host)
    });
  }
  poll();
});

/**
 * SOCKET.IO
 */

import express from 'express';
import { Server as HttpServer } from 'http';
import SocketIO from 'socket.io';
import { exec } from 'child_process';
import wol from 'wol';
const app = express(),
      server = HttpServer(app),
      io = SocketIO(server);

server.listen(80);
app.use(express.static('dist/www'));

/**
 * User joins socket server
 */
io.on('connection', socket => {
  let username = socket.handshake.query.username;
  if(username == 's')
  {
    return socket.disconnect(); //disallow username 'users'
  }

  if(username)
  {
    if (!config.getUser(username))
      return socket.disconnect(); //user not in config

    socket.join('users');
    broadcastChanges('users');
    let room = socket.join(username);

    logger(username + ' has connected!');

    /**
     * User-only commands
     */
    socket.on('request', () =>
    {
      logger(username + ' sent an update request.');
      room.emit('status', User.getByUsername(username));
    });
    socket.on('cycleUser', () =>
    {
      Mumble.cycleUser(username);
    });
    socket.on('disconnect', () =>
    {
      logger(username + ' has disconnected.');
      io.to('admins').emit('admin.user.disconnect', username)
    });
  }

  let password = socket.handshake.query.password;
  if(typeof password != 'undefined')
  {
    if(password != config.admin.adminPass)
      return socket.disconnect();

    socket.join('admins').emit('authenticated');
    logger('An admin has connected!');

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
      broadcastChanges('users');
      broadcastChanges('tallies');
      config.saveUsers();
      cb(r);
    });

    /**
     * Toggle the power state of a smart plug
     */
    socket.on('admin.plug.toggle', (hostname) =>
    {
      if(typeof hostname == 'undefined') return false;
      let result = plugs.filter((a) => a.host == hostname);
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
    socket.on('admin.update', () => broadcastChanges());
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
        return io.to(p).emit('reboot');
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
        return io.to(p).emit('shutdown');
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
          wol.wake(mac, () => logger('WOL sent to ' + mac + '.'));
        }
      }
    });

    /**
     * Reboot all users
     */
    socket.on('admin.rebootUsers', () => io.to('users').emit('reboot'));
    /**
     * Update the client software on all users.
     */
    socket.on('admin.updateUsers', () => io.to('users').emit('update'));
    /**
     * Shutdown all users
     */
    socket.on('admin.shutdownUsers', () => io.to('users').emit('shutdown'));
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
      logger('Bye bye!');
    });
  }
});

/**
 * Process an object with tally states from multiple hosts
 * and combine them into one. Program states (1) take precedence over preview (2)
 * states and lastly comes the stand-by (0) state.
 * @param  {Object}
 * @return {Array}
 */
const combineTallies = t =>
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
 * Send update notifications to admin sockets
 * @param  {string|undefined} What to update
 */
const broadcastChanges = (s) =>
{
  /**
   * Broadcast server updates
   */
  if(s == 'servers' || !s)
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
    io.to('admins').emit('admin.status.servers', result);
  }
  /**
   * Broadcast tally updates
   */
  if(s == 'tallies' || !s)
  {
    let result = {};
    let allTallies = Server.tallies;
    // Make a duplicate and sort by server name
    Object.keys(allTallies).sort().forEach(key => result[key] = allTallies[key]);
    // Append the combined (calculated) tally state at the end with a special key '_combined'
    result._combined = combineTallies(allTallies)
    io.to('admins').emit('admin.status.tallies', result);

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
        io.to(user.username).emit('status', user);
      }
    });
  }
  /**
   * Broadcast user updates
   */
  if(s == 'users' || !s)
  {
    io.in('users').clients((error, users) =>
    {
      let result = [];
      users.forEach((id) =>
      {
        let socket = io.sockets.connected[id];
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
      io.to('admins').emit('admin.users.list', result);
    });
  }
  /**
   * Broadcast smart plug updates
   */
  if(s == 'plugs' || !s)
  {
    let result = plugs.map(p =>
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
    io.to('admins').emit('admin.plugs.list', result);
  }
};