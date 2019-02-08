/**
 * Load and save config functions
 */

const config = require('./config.json'),
      fs = require('fs');
config.servers = require('./servers.json').map(a =>
{
  a.connected = false;
  a.client = null;
  if(!a.wol) a.wol = false;
  return a;
});
config.users = require('./users.json').map(a =>
{
  a.status = null;
  return a;
});

/**
 * Retrieve servers with certain type from config.servers
 * @param {string} type Which type to retrieve
 * @return {Array} Array of servers with given type
 */
config.getServersByType = (type) =>
{
  if(typeof type == 'undefined') return config.servers;
  return config.servers.filter((a) => a.type == type);
}

/**
 * Retrieve server by name
 * @param {string} name
 * @return {Object}
 */
config.getServer = (name) =>
{
  if(typeof name == 'undefined') return false;
  let result = config.servers.filter((a) => a.name == name);
  return result.length == 1 ? result[0] : false;
}

/**
 * Retrieve user by username
 * @param {string} username
 * @return {Object}
 */
config.getUser = (username) =>
{
  if(typeof username == 'undefined') return false;
  let result = config.users.filter((a) => a.username == username);
  return result.length == 1 ? result[0] : false;
}

/**
 * Save user data back to JSON file
 */
config.saveUsers = () =>
{
  let json = JSON.stringify(config.users);
  fs.writeFile('./users.json', json, 'utf8', (err) => {
    if (err) return console.error(err);
    console.log('Users.json file has been saved!');
  });
}

/**
 * Mumble bot
 */

const connect = require('mumble-client-tcp');

/**
 * Connect to the mumble server set in the config file and
 * make the client globally available. Reconnect when disconnected
 * or when error occurs.
 * @param {Object} mumble Server information
 */
connectToMumble = (mumble) =>
{
  connect(mumble.hostname, 64738, {
    tls: {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem'),
      rejectUnauthorized: false
    },
    username: mumble.username,
    password: mumble.password,
  }, (err, client) =>
  {
    if(err)
    {
      console.log('No connection to Mumble host ' + mumble.name + '.');
      setTimeout(() => connectToMumble(mumble), 3000);
      return;
    }
    console.log('Connected to Mumble @ ' + mumble.hostname + '!');
    mumble.client = client;
    mumble.connected = true;
    broadcastChanges('servers');

    client.on('disconnected', () =>
    {
      mumble.client = null;
      mumble.connected = false;
      broadcastChanges('servers');
      console.log('Disconnected from ' + mumble.name + '. Reconnect in 5 seconds...');
      setTimeout(() => connectToMumble(mumble), 3000);
    });
  });
}

/**
 * Cycle a specific user to the next channel set in config.cycleChannels
 * @param  {Object} mumble   Mumble client
 * @param  {string} username
 * @return {boolean}         Whether the move was executed
 */
cycleUser = (mumble, username) =>
{
  let r = false;
  if(!mumble.client) return r;
  mumble.client.users.forEach(user =>
  {
    if(user.username != username) return;

    let channel = user.channel.name;
    process.stdout.write('Found ' + username + ' in channel ' + channel + '. ');

    let index = config.cycleChannels.indexOf(channel);
    if(index != -1)
    {
      // Figure out the next channel, or reset to the 0th one.
      index = index + 1 >= config.cycleChannels.length ? 0 : index + 1;
      let newChannel = mumble.client.getChannel(config.cycleChannels[index]);
      console.log('Moving to channel', newChannel.name);
      user.setChannel(newChannel);
      r = true;
    } else
      console.log('Channel not in cycle list.');
  });
  return r;
}

/**
 * vMix connection and Input/tally mapping
 */

const Socket = require('net').Socket,
      readline = require('readline');
const hostTallies = {};

/**
 * Process an object with tally states from multiple vMix instances
 * and combine them into one. Program states (1) take precedence over preview (2)
 * states and lastly comes the stand-by (0) state.
 * @param  {Object}
 * @return {Array}
 */
combineTallies = t =>
{
  let all = Object.values(t);
  let max = Math.max(...(all.map(el => el != null && el.length)));
  let result = [];
  for (let i = 0; i < max; i++)
  {
    let map = all.map(el => el ? parseInt(el.split('')[i]) || 0 : 0);
    let status = map.indexOf(1) != -1 ? 1 : Math.max(...map);
    result.push(status);
  }
  return result;
}

/**
 * Set-up a TCP connection with a vMix API and subscribe to tally changes
 * @param  {Object} Server information
 */
connectToVmix = vmix =>
{
  let client = vmix.client = new Socket();
  client.setTimeout(500, () => client.destroy());
  client.once('connect', () => client.setTimeout(0));

  client.connect(8099, vmix.hostname, () =>
  {
    console.log('Connected to vMix @ ' + vmix.hostname + '!');
    vmix.connected = true;
    broadcastChanges('servers');

    client.write('SUBSCRIBE TALLY\r\n');

    let tallyInfo = readline.createInterface({
      input: client
    }).on('line', line =>
    {
      if(line.indexOf('TALLY OK ') == 0)
      {
        hostTallies[vmix.name] = line.substring(9);
        broadcastChanges('tallies');
      }
    });
  });

  client.on('error', err => {});

  client.on('close', () =>
  {
    console.log('No connection to vMix host', vmix.hostname);
    if(vmix.connected == true)
    {
      vmix.connected = false;
      delete hostTallies[vmix.name];
      broadcastChanges('tallies');
      broadcastChanges('servers');
    }
    setTimeout(() => connectToVmix(vmix), 3000);
  });
}

/**
 * Aten switcher connections
 */

/**
 * Set-up a TCP connection with a Aten switcher
 * @param  {Object} Server information
 */
connectToAten = aten =>
{
  let client = aten.client = new Socket();
  client.setTimeout(500, () => client.destroy());
  client.once('connect', () => client.setTimeout(0));

  client.connect(23, aten.hostname, () =>
  {
    client.write(aten.username + '\r\n' + aten.password + '\r\n');

    readline.createInterface({
      input: client
    }).on('line', line =>
    {
      if(line.indexOf('Connection to VM0808HA is established') == 0)
      {
        console.log('Connected to Aten @ ' + aten.hostname + '!');
        aten.connected = true;
        broadcastChanges('servers');
      }
    });
  });

  client.on('error', err => {});

  client.on('close', () =>
  {
    console.log('No connection to Aten host', aten.hostname);
    if(aten.connected == true)
    {
      aten.connected = false;
      broadcastChanges('servers');
    }
  });
}

/**
 * ATEM switcher connections
 */

const Atem = require('atem');

/**
 * Connect and bind to ATEM switcher events
 * @param  {Object} Server information
 */
connectToAtem = atem =>
{
  /**
   * Tally callback handler
   * @param  {number} n     Camera number
   * @param  {Object} state Object containing state information
   */
  let handleTally = (n, state) =>
  {
    if (n > 0 && n < 100)
    {
      let tallies = hostTallies[atem.name] || '';
      let newState = state.program == true ? '1' : state.preview == true ? '2' : '0';
      tallies = tallies.split('');
      tallies[n-1] = newState;
      hostTallies[atem.name] = tallies.join('');
      broadcastChanges('tallies');
    }
  }
  let client = atem.client = new Atem(atem.hostname);
  client.on('connectionStateChange', (state) =>
  {
    /**
     * Toggle the connected property only if it wasn't previously connected or disconnected
     */
    if(!atem.connected && state.description == 'connected')
    {
      atem.connected = true;
      broadcastChanges('servers');
    }
    if(atem.connected && state.description != 'connected')
    {
      atem.connected = false;
      broadcastChanges('servers');
    }
  }).on('sourceTally', handleTally).on('inputTally', handleTally) //TODO: check if this works
    .on('error', err => console.error(err));
}

/**
 * Ping the Netgear switch to see if it's online.
 * @param  {Object} Server information
 */
connectToNetgear = netgear =>
{
  let check = () =>
  {
    let client = new Socket();
    client.setTimeout(500, () => client.destroy());
    client.once('connect', () => client.setTimeout(0));

    client.connect(60000, netgear.hostname, () =>
    {
      if(!netgear.connected)
      {
        netgear.connected = true;
        broadcastChanges('servers');
      }
      if(netgear.rebootPending)
      {
        console.log('Rebooting Netgear...');
        client.write('admin\r\npassword\r\nenable\r\n\r\nreload\r\nyy');
        netgear.selfDestroy = false;
        netgear.rebootPending = false;
        clearTimeout(netgear.client);
        netgear.client = setTimeout(check, 3000);
      } else {
        netgear.selfDestroy = true;
        client.destroy();
      }
    });

    client.on('error', err => {});

    client.on('close', () =>
    {
      if(!netgear.selfDestroy && netgear.connected == true)
      {
        netgear.connected = false;
        broadcastChanges('servers');
      }
      netgear.selfDestroy = false;
      clearTimeout(netgear.client);
      netgear.client = setTimeout(check, 10000);
    });
  }
  netgear.client = setTimeout(check, 100);
}

/**
 * Kick-off server connections
 */
config.servers.forEach((server) =>
{
  if(server.type == 'mumble')
    connectToMumble(server);
  if(server.type == 'vmix')
    connectToVmix(server);
  if(server.type == 'aten')
    connectToAten(server);
  if(server.type == 'atem')
    connectToAtem(server);
  if(server.type == 'netgear')
    connectToNetgear(server);
});

/**
 * Connect to smart plugs
 */

const TPLink = require('tplink-smarthome-api').Client;
const tplink = new TPLink();
const plugs = [];
tplink.startDiscovery().on('plug-new', (device) =>
{
  console.log('Found smartplug ' + device.alias + ' on the network!');
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
      console.log('No connection to smartplug ' + device.alias + ' or an error occured.');
      delete plugs[plugs.indexOf(device)];
      io.to('admins').emit('admin.plugs.disconnect', device.host)
    });
  }
  poll();
});

/**
 * Socket.io server
 */
const express = require('express'),
      app = express(),
      server = require('http').Server(app),
      io = require('socket.io')(server),
      exec = require('child_process').exec,
      wol = require('wol');

server.listen(80);
app.use(express.static('www'));

/**
 * User joins socket server
 */
io.on('connection', socket => {
  let username = socket.handshake.query.username;
  if(username == 's')
    return socket.disconnect(); //disallow username 'users'

  if(username && username.indexOf('user') == 0)
  {
    socket.join('users');
    broadcastChanges('users');
    let room = socket.join(username);

    /**
     * User-only commands
     */
    socket.on('request', () =>
    {
      console.log('Got update request from', username);
      room.emit('status', config.getUser(username));
    });
    socket.on('cycleUser', () =>
    {
      config.getServersByType('mumble').forEach((m) => cycleUser(m, username));
    });
    socket.on('disconnect', () =>
    {
      io.to('admins').emit('admin.user.disconnect', username)
    });
  }

  let password = socket.handshake.query.password;
  if(typeof password != 'undefined')
  {
    if(password != config.adminPass)
      return socket.disconnect();

    socket.join('admins').emit('authenticated');
    console.log('Admin connected!');

    /**
     * Admin-only commands
     */

    /**
     * Set new data on a user and save the config file
     */
    socket.on('admin.set.user', (data, cb) =>
    {
      let user = config.getUser(data.username);
      let newName = data.name.replace(/[^\w\s]/gi, '').substring(0, 30);
      let newNumber = parseInt(data.camNumber);

      if (isNaN(newNumber) || newNumber < 1 || newNumber > 99)
        return cb({ camnumber: false });

      user.name = newName
      user.camNumber = newNumber;
      broadcastChanges('users');
      broadcastChanges('tallies');
      config.saveUsers();
      cb(null);
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
      let server = config.getServer(p);
      if(typeof server != 'undefined')
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
      let server = config.getServer(p);
      if(typeof server != 'undefined')
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
      let server = config.getServer(p);
      if(typeof server != 'undefined' && typeof server.wol == 'string')
      {
        if(server.type == 'vmix')
        {
          // Wake windows pc
          let mac = server.wol;
          wol.wake(mac, () => console.log('WOL sent to', mac));
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
      config.servers.forEach((server) =>
      {
        // Shutdown windows pc
        exec('shutdown /s /m \\\\' + server.hostname + ' /f /t 5 /c "Shutdown by administration interface"');
      });
      // Shutdown self
      exec('shutdown /s /f /t 10 /c "Shutdown by administration interface"');
    });
  }
});

/**
 * Send update notifications to admin sockets
 * @param  {string|undefined} What to update
 */
broadcastChanges = (s) =>
{
  /**
   * Broadcast server updates
   */
  if(s == 'servers' || !s)
  {
    let result = config.servers.map(s =>
    {
      let n = Object.assign({}, s);
      delete n.client;
      return n;
    });
    io.to('admins').emit('admin.status.servers', result);
  }
  /**
   * Broadcast tally updates
   */
  if(s == 'tallies' || !s)
  {
    let result = {};
    // Make a duplicate and sort by server name
    Object.keys(hostTallies).sort().forEach(key => result[key] = hostTallies[key]);
    // Append the combined (calculated) tally state at the end with a special key '_combined'
    result._combined = combineTallies(hostTallies).join('');
    io.to('admins').emit('admin.status.tallies', result);

    /**
     * Compare connected users' old tally state and only emit
     * an event when it has changed.
     */
    config.users.forEach(user =>
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
        // Users only appear if they exists in the users.json file
        if(user = config.getUser(username))
          result.push(user);
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
    let result = [];
    plugs.forEach(device =>
    {
      let plug = {
        hostname: device.host,
        name: device.alias,
        description: device.description,
        on: device.relayState
      }
      result.push(plug);
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