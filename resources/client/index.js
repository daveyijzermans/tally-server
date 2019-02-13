const os = require('os'),
      config = require('./config.json'),
      exec = require('child_process').exec;
const username = 'user' + os.hostname().replace('intercom-id', '');
console.log('My username is', username);

// Socket stuff

const io = require('socket.io-client'),
    socket = io(config.intercom, {
      query: {
        username: username
      }
    }).connect();

socket.on('connect', () =>
{
  console.log('Connected to server!');
});

socket.on('reconnect', () => socket.emit('request'));

socket.on('status', (res) =>
{
  if(!res)
  {
    if(port) port.write('mode 2\n');
    return;
  }
  setStatus(res.status);
  setCamNumber(res.camNumber);
  if(port) port.write('mode 1\n');
  console.log(res);
});

socket.on('update', () => exec('/usr/bin/wget -O - ' + config.intercom + '/client/update.sh | /bin/bash'));
socket.on('reboot', () => exec('sudo /sbin/shutdown -r now'));
socket.on('shutdown', () => exec('sudo /sbin/shutdown now'));

// GPIO stuff

if(config.enableGPIO)
{
  var Gpio = require('onoff').Gpio,
      buttonPTT = new Gpio(4, 'in', 'both', {debounceTimeout: 50}),
      buttonCycle = new Gpio(17, 'in', 'falling', {debounceTimeout: 50}),
      robot = require('robotjs');

  buttonPTT.watch((err, value) => robot.keyToggle('t', value == 0 ? 'down' : 'up'));
  buttonCycle.watch((err, value) => socket.emit('cycleUser', username));
}

// USB tally

const SerialPort = require('serialport');

findArduino = () =>
{
  let paths = [];
  SerialPort.list((err, ports) =>
  {
    ports.forEach((port) =>
    {
      let cn = port.comName;
      if(cn.indexOf(config.comPrefix) == 0)
        paths.push(cn);
    });
    if(paths.length > 0) tryConnect(paths);
    else setTimeout(findArduino, 200);
  });
};

var port = null;

var connected = false;
var brightness = 10;

tryConnect = (paths) =>
{
  var index = 0;
  tryNext = () =>
  {
    port = new SerialPort(paths[index], { baudRate: 9600 }).on('error', () =>
    {
      if(index == paths.length - 1)
        return findArduino();
      tryNext(index++);
    }).on('open', () =>
    {
      port.on('data', data => {});
      port.write('bright ' + brightness + '\n');
      connected = true;
      socket.emit('request');
    }).on('close', () =>
    {
      port = null;
      findArduino();
    });
  };
  tryNext();
};

setCamNumber = (n) =>
{
  if(!port) return false;
  if(typeof n == 'number' && n > 0 && n < 100)
    port.write('cam ' + n + '\n');
};

setStatus = (status) =>
{
  if(!port) return false;
  port.write('status ' + status + '\n');
};

findArduino();

cleanup = () =>
{
  if(config.enableGPIO)
  {
    buttonPTT.unexport();
    buttonCycle.unexport();
  }

  if(port) port.write('mode 0\n');
  setTimeout(() => process.exit(0), 100);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);