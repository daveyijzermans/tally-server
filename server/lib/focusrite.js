import Router from './router';
import { Socket } from 'net';
import readline from 'readline';
import XMLParser from 'fast-xml-parser';
import log from './logger';

/**
 * Class for connecting to Focusrite Control Server via TCP.
 *
 * @extends    Backend.Router
 * @memberof   Backend
 */
class Focusrite extends Router
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

    this.throttles = {};

    this.inputs = this.inputs.map((o) => Object.assign(o, { level: -128 }));
    this.outputs = this.outputs.map((o) => Object.assign(o, { level: -128 }));
    
    this._check();
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
        log.trace('[' + this.name + '] Got ' + Object.keys(json)[0] + ' from Focusrite server');
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
          log.debug('[' + this.name + '] No device found with serial ' + this.serial + '. Did find: ' + device['serial-number']);
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
   * @fires      Backend.Router#event:updated
   * @fires      Backend.Router#event:level
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
          if(this[w][i].name != newName)
          {
            this[w][i].name = newName;
            changed = true;
          }
          let newLevel = Math.round(1000000000 * Math.pow(10, variable.meter.value / 20)) / 1000000000;
          if(typeof newLevel == 'number' && this[w][i].level != newLevel)
          {
            this[w][i].level = newLevel;
            this.throttledEmit(40, 'level', w, i, newLevel);
          }
          if(w == 'inputs')
          {
            this[w][i].source_id = variable.id;
          }
          if(w == 'outputs')
          {
            let source_id = variable.source.value;
            let match = this.inputs.filter((i) => i.source_id === source_id);
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
    if(changed) this.emit('updated');
  }

  throttledEmit = (wait, event, w, i, ...args) =>
  {
    let key = event+w+i;
    if(this.throttles[key] != true)
    {
      this.throttles[key] = true;
      setTimeout(() => this.throttles[key] = false, wait)
      this.emit.apply(this, [event, w, i].concat(args));
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

    this.client.setTimeout(300);
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
    let hex = ('000000' + msg.length.toString(16)).substr(-6);
    this.client.write('Length=' + hex + ' ' + msg);
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
   */
  _check = () =>
  {
    this.client = new Socket();
    this.client.setTimeout(3000);
    this.client.on('close', this._closed);
    this.client.on('error', () => {});
    this.client.on('timeout', () => this.client.end() && this.client.destroy());
    this.client.connect(49935, this.hostname, this._connected);
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

export default Focusrite;