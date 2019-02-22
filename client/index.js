const os = require('os'),
      exec = require('child_process').exec,
      io = require('socket.io-client'),
      SerialPort = require('serialport'),
      robot = require('robotjs');

/**
 * Class for client.
 *
 * @class      Client
 */
class Client
{
  constructor(opts)
  {
    /**
     * Configuration
     *
     * @type       {Object}
     * @property   {string}   intercom    Intercom address
     * @property   {string}   comPrefix   USB com port prefix
     * @property   {boolean}  enableGPIO  Whether to enable USB tally support
     */
    this.config = opts;
    /**
     * Username to identify with to the server
     * 
     * @type       {string}
     */
    this.username = 'user' + os.hostname().replace('intercom-id', '');
    console.log('My username is', this.username);
    /**
     * Socket.io client connection
     * 
     */
    this.socket = io(this.config.intercom, {
      query: {
        username: this.username
      }
    })
    this.socket.connect()
               .on('connect', this._connect)
               .on('reconnect', this._reconnect)
               .on('status', this._status)
               .on('update', this._update)
               .on('reboot', this._reboot)
               .on('shutdown', this._shutdown);
    /**
     * COM Port instance
     * 
     * @type       {SerialPort|undefined}
     */
    this._port = null;
    /**
     * Brightness level of USB tally
     * 
     * @type       {number}
     */
    this._brightness = 10;
    if(this.config.enableGPIO)
    {
      const Gpio = require('onoff').Gpio;

      this.buttonPTT = new Gpio(4, 'in', 'both', {debounceTimeout: 50});
      this.buttonPTT.watch(this._btnPTTPress);

      this.buttonCycle = new Gpio(17, 'in', 'falling', {debounceTimeout: 50});
      this.buttonPTT.watch(this._btnCyclePress);
    }
    this._findArduinos();
  }
  /**
   * First connection is established
   *
   * @method     Client#_connect
   *
   * @listens      Socket#event:connect
   */
  _connect = () =>
  {
    console.log('Connected to server!');
  }
  /**
   * Subsequent reconnections are established
   *
   * @method     Client#_reconnect
   *
   * @listens      Socket#event:reconnect
   * @fires        Socket#event:request
   */
  _reconnect = () =>
  {
    this.socket.emit('request');
  }
  /**
   * Parse server return data
   *
   * @method     Client#_status
   *
   * @param      {Backend.User|boolean}  res     The resulting user
   *
   * @listens     Socket#event:status
   */
  _status = (res) =>
  {
    if(!res)
    {
      if(this._port) this._port.write('mode 2\n');
      return;
    }
    this._setStatus(res.status);
    this._setCamNumber(res.camNumber);
    if(this._port) this._port.write('mode 1\n');
    console.log(res);
  }
  /**
   * Update using the update script hosted by the server
   * 
   * @method       Client#_update
   * @listens      Socket#event:update
   */
  _update = () =>
  {
    exec('/usr/bin/wget -O - ' + this.config.intercom + '/client/update.sh | /bin/bash')
  }
  /**
   * Reboot system
   * 
   * @method       Client#_reboot
   * @listens      Socket#event:reboot
   */
  _reboot = () =>
  {
    exec('sudo /sbin/shutdown -r now');
  }
  /**
   * Shutdown system
   * 
   * @method       Client#_shutdown
   * @listens      Socket#event:shutdown
   */
  _shutdown = () =>
  {
    exec('sudo /sbin/shutdown now');
  }
  /**
   * Find USB tally on COM port
   * 
   * @method     Client#_findArduinos
   */
  _findArduinos = () =>
  {
    let paths = [];
    SerialPort.list((err, ports) =>
    {
      ports.forEach((port) =>
      {
        let cn = port.comName;
        if(cn.indexOf(this.config.comPrefix) == 0)
          paths.push(cn);
      });
      if(paths.length > 0) this._tryArduinos(paths);
      else setTimeout(this._findArduinos, 200);
    });
  }
  /**
   * Try to connect to an Arduino
   * 
   * @method     Client#_tryArduinos
   *
   * @param      {string[]}  paths   String of com port paths
   * @fires      Socket#event:request
   */
  _tryArduinos = (paths) =>
  {
    var index = 0;
    const tryNext = () =>
    {
      let port = new SerialPort(paths[index], { baudRate: 9600 }).on('error', () =>
      {
        if(index == paths.length - 1)
          return this._findArduinos();
        tryNext(index++);
      }).on('open', () =>
      {
        this._port = port;
        this._port.on('data', data => {});
        this._port.write('bright ' + this._brightness + '\n');
        this.socket.emit('request');
      }).on('close', () =>
      {
        this._port = null;
        this._findArduinos();
      });
    };
    tryNext();
  }
  /**
   * Sets the camera number on the USB tally
   * 
   * @method     Client#_setCamNumber
   *
   * @param      {(number|string)}    n       Camera number
   * @return     {boolean|undefined}  
   */
  _setCamNumber = (n) =>
  {
    if(!this._port) return false;
    if(typeof n == 'number' && n > 0 && n < 100)
      this._port.write('cam ' + n + '\n');
  }
  /**
   * Sets the status color on the USB tally
   * 
   * @method     Client#_setStatus
   *
   * @param      {boolean}            status  Status
   * @return     {boolean|undefined}  
   */
  _setStatus = (status) =>
  {
    if(!this._port) return false;
    this._port.write('status ' + status + '\n');
  }
  /**
   * Press t to push to talk
   *
   * @method     Client#_btnPTTPress
   *
   * @param      {Error}  err     The error
   * @param      {number}  value   The value
   */
  _btnPTTPress = (err, value) =>
  {
    robot.keyToggle('t', value == 0 ? 'down' : 'up');
  }
  /**
   * Inform the server we want to cycle to the next channel.
   *
   * @method     Client#_btnCyclePress
   * 
   * @fires      Socket#event:cycleUser
   */
  _btnCyclePress = (err, value) =>
  {
    this.socket.emit('cycleUser', this.username)
  }
  /**
   * Cleanup before exit
   * 
   * @method     Client#cleanup
   */
  cleanup = () =>
  {
    if(this.config.enableGPIO)
    {
      this.buttonPTT.unexport();
      this.buttonCycle.unexport();
    }

    if(this._port) this._port.write('mode 0\n');
  };
}

const client = new Client(require('./config.json'));

process.on('SIGTERM', () =>
{
  client.cleanup();
  setTimeout(() => process.exit(0), 100);
});
process.on('SIGINT', () =>
{
  client.cleanup();
  setTimeout(() => process.exit(0), 100);
})

/**
 * First connection is established
 *
 * @event      Socket#event:connect
 */
/**
 * Subsequent connections are established
 *
 * @event      Socket#event:reconnect
 */
/**
 * Update using the update script hosted by the server
 *
 * @event      Socket#event:update
 */
/**
 * Reboot system
 *
 * @event      Socket#event:reboot
 */
/**
 * Shutdown system
 *
 * @event      Socket#event:shutdown
 */