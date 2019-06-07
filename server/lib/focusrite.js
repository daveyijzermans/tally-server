import Mixer from './mixer';
import { Socket } from 'net';
import XMLParser from 'fast-xml-parser';
import Logger from './logger';
const log = Logger.getLogger('Focusrite');
import dgram from 'dgram';

/**
 * Class for connecting to Focusrite Control Server via TCP.
 *
 * @extends    Backend.Mixer
 * @memberof   Backend
 */
class Focusrite extends Mixer
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super(opts);
    /**
     * Focusrite model, used for identifing right device
     * 
     * @type       {string}
     */
    this.model = opts.model;
    /**
     * Focusrite serial no. used for identifing right device
     * 
     * @type       {number}
     */
    this.serial = opts.serial;
    /**
     * Client key. Used for identifying client in Focusrite Control Software
     * 
     * @type       {number|string}
     */
    this.clientKey = opts.clientKey;
    /**
     * Client name. Used for identifying client in Focusrite Control Software
     * 
     * @type       {number|string}
     */
    this.clientName = opts.clientName;
    /**
     * Holds parsed XML info from the Focusrite server
     * 
     * @type       {Object}
     */
    this._info = {};
    /**
     * Holds all values to settings in info object, by id.
     * 
     * @type       {Object.<number, mixed>}
     */
    this._values = {};

    Focusrite.discoverServer(this.hostname, this._check);
  }
  /**
   * Parse raw data that come from Focusrite
   *
   * @method     Backend.Focusrite#_onData
   *
   * @param      {Buffer}  data    The data
   */
  _onData = data =>
  {
    let str = data.toString();
    const regex = /(?=Length\=)/g;
    let parts = str.split(regex);
    return this._parseData(parts);
  };
  /**
   * Parse lines that come from Focusrite
   *
   * @method     Backend.Focusrite#_parseData
   *
   * @param      {string[]}  data    The data
   */
  _parseData = data =>
  {
    for (var i = 0; i < data.length; i++)
    {
      let str = data[i];
      let hasLength = str.substring(0, 7) == 'Length=';
      let length = parseInt(str.substring(7, 13), 16) || false;
      if(hasLength)
      {
        this.bufferLength = length;
        this.buffer = str.substring(14);
      } else {
        this.buffer += str
      }
      if(this.buffer.length == this.bufferLength)
      {
        let json = XMLParser.parse(this.buffer, {
          attributeNamePrefix: '',
          ignoreAttributes: false,
          allowBooleanAttributes: true,
          parseAttributeValue: true,
          parseTrueNumberOnly: true
        });
        if(json['device-arrival'])
        {
          let device = json['device-arrival'].device;
          if(device && device['serial-number'] == this.serial && device['model'] == this.model)
          {
            /* Subscribe to device */
            this._write('<device-subscribe devid="' + device.id + '" subscribe="true"/>');
            this._info = Object.assign(this._info, device);
            return;
          }
          log.debug(' No device found with serial ' + this.serial + '. Did find: ' + device['serial-number']);
        }
        if(json['set'] && json['set'].item)
        {
          let item = json['set'].item;
          if(Array.isArray(item))
          {
            let settings = item.reduce((a, c) =>
            {
              a[c.id] = c.value;
              return a;
            }, {});
            this._values = Object.assign(this._values, settings);
          } else {
            this._values[item.id] = item.value;
          }
          this._updateData();
          return;
        }
      }
    }
  };
  /**
   * Set input and output data using the cached settings object.
   * Also fire update event if data is changed.
   * Also fires 'meter' event if audio level data is changed.
   *
   * @method     Backend.Focusrite#_updateData
   * 
   * @fires      Backend.Server#event:updated
   * @fires      Backend.Mixer#event:controlChange
   */
  _updateData = () =>
  {
    let settings = this.settings;
    let changed = false;
    ['inputs', 'outputs'].forEach((w) =>
    {
      if(settings[w])
      {
        let all = Object.keys(settings[w])
          .filter((s) => s != 'playback')
          .reduce((a, c) => a.concat(settings[w][c]), [null]);
        for (let i = 1; i < all.length; i++)
        {
          let variable = all[i];
          let newName = variable.nickname.value;
          if(!this[w][i]) this[w][i] = {};
          if(this[w][i].name != newName)
          {
            this[w][i].name = newName;
            changed = true;
          }
          let newLevel = Math.round(1000000000 * Math.pow(10, variable.meter.value / 20)) / 1000000000;
          if(typeof newLevel == 'number' && this[w][i].level != newLevel)
          {
            this[w][i].level = newLevel;
            let newData = { w: w, i: i, level: newLevel };
            log.trace('[_updateData] Control change:', newData);
            this.throttledEmit(40, 'controlChange', w+i, newData);
          }
          if(w == 'inputs')
          {
            this[w][i].source_id = variable.id;
          }
          if(w == 'outputs')
          {
            let source_id = variable.source.value;
            let match = this.inputs.filter((i) => i && i.source_id === source_id);
            if(match.length == 1)
            {
              let newInput = this.inputs.indexOf(match[0]);
              if(this[w][i].input != newInput)
              {
                this[w][i].input = newInput;
                changed = true;
              }
            }
          }
        }
      }
    });
    if(changed)
    {
      log.trace('[_updateData]', this.inputs, this.outputs);
      this.emit('updated');
    }
  }
  /**
   * Combine device info with the values
   *
   * @method     Backend.Focusrite#_updateSettings
   *
   * @param      {object}  settings  The settings
   */
  get settings()
  {
    const replaceId = (input) =>
    {
      let isArray = Array.isArray(input);
      let r = isArray ? [] : {};
      let keys = isArray ? input : Object.keys(input);
      for (var i = 0; i < keys.length; i++)
      {
        let key = isArray ? i : keys[i];
        let val = input[key];
        if(typeof val == 'object')
        {
          r[key] = replaceId(val);
          continue;
        }
        if(key == 'id')
        {
          let add = {};
          if(this._values[val])
            add.value = this._values[val];
          r = Object.assign(input, add);
          continue;
        }
        r = input;
      }
      return r;
    }
    return replaceId(this._info);
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Focusrite#_connected
   *
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
   */
  _connected = () =>
  {
    if(!this.connected)
    {
      this.connected = true;
      this.emit('connected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._keepAlive, 2500);

    this.client.on('data', this._onData);
    this._write('<client-details hostname="' + this.clientName + '" client-key="' + this.clientKey + '"/>');
  }
  /**
   * Write to Focusrite server. Prepends the message length to the message.
   *
   * @method     Backend.Focusrite#_write
   * 
   * @param      {string}  msg     The message
   */
  _write = (msg) =>
  {
    this.client.write(Focusrite.prependHex(msg));
  }
  /**
   * Send keep alive message to server
   *
   * @method     Backend.Focusrite#_keepAlive
   */
  _keepAlive = () =>
  {
    this._write('<keep-alive/>');
    this.timeout = setTimeout(this._keepAlive, 3000);
  }
  /**
   * Setup a new connection to the server and connect
   *
   * @method     Backend.Focusrite#_check
   * 
   * @param      {number|string} port Port number
   */
  _check = (port) =>
  {
    if(port) this.port = port;
    this.client = new Socket();
    this.client.setTimeout(3000);
    this.client.on('close', this._closed);
    this.client.on('error', () => {});
    this.client.on('timeout', () => this.client.end() && this.client.destroy());
    this.client.connect(this.port, this.hostname, this._connected);
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Focusrite#_closed
   *
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _closed = (error) =>
  {
    if(this.connected)
    {
      this.connected = false;
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    clearTimeout(this.timeout);
    this.timeout = setTimeout(this._check, 3000);
  }
}

/**
 * Prepends the message length to the message.
 * 
 * @param      {string}  msg     The message
 */
Focusrite.prependHex = (msg) =>
{
  let hex = ('000000' + msg.length.toString(16)).substr(-6);
  return 'Length=' + hex + ' ' + msg;
}
/**
 * Set up UDP broadcast client. When a message is received, execute registered
 * callbacks
 */
Focusrite.discoverServer = (() =>
{
  const client = dgram.createSocket('udp4');
  let interval;
  let announce = Focusrite.prependHex('<client-discovery app="SAFFIRE-CONTROL" version="4" device="iOS"/>');
  let message = Buffer.from(announce);
  let callbacks = {};

  let broadcast = () =>
  {
    if(Object.keys(callbacks).length == 0) return;
    client.send(message, 0, message.length, 30096, "255.255.255.255");
    client.send(message, 0, message.length, 30097, "255.255.255.255");
    client.send(message, 0, message.length, 30098, "255.255.255.255");
  }

  client.on('listening', () =>
  {
    let address = client.address();
    log.debug('UDP Client listening on ' + address.address + ":" + address.port);
    client.setBroadcast(true)
    client.setMulticastTTL(128); 

    interval = setInterval(broadcast, 1000);
  });

  client.on('message', (message, remote) =>
  {
    log.debug('Found server: ' + message.toString());
    let foundHost = remote.address;
    let port = message.toString().match(/port\=\'([0-9]*)\'/);
    if(port && callbacks[foundHost])
    {
      callbacks[foundHost].forEach((cb) => cb(port[1]));
      delete callbacks[foundHost];
    }
  });

  client.bind(61392);

  return (hostname, callback) => {
    if(callbacks[hostname]) callbacks[hostname].push(callback);
    else callbacks[hostname] = [callback];
  }
})();

export default Focusrite;