import Server from './server';
import { Socket } from 'net';
import parser from 'io-videohub/lib/parser';

/**
 * Class for connecting to Blackmagic Videohub.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Videohub extends Server
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
     * Routing information
     * 
     * @type       {Object}
     */
    this._statusObj = [];
    this._check();
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Videohub#_connected
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

    this.client.setTimeout(0);
    this.client.on('data', (data) => this._updateStatus(data));
  }

  _updateStatus = (obj) =>
  {
    obj = parser(obj.toString());
    if (!this._statusObj[obj.title]) {
      if (obj.array) {
        this._statusObj[obj.title] = [];
      } else {
        this._statusObj[obj.title] = {};
      };
    };
    
    for (var key in obj.data) {
      if (obj.array) {
        this._statusObj[obj.title][parseInt(key, 10)] = obj.data[key];
      } else {
        this._statusObj[obj.title][key] = obj.data[key];
      };
    };

    this.emit('update', this._statusObj);
  };
  /**
   * Setup a new connection to the server and connect
   *
   * @method     Backend.Videohub#_check
   */
  _check = () =>
  {
    this.client = new Socket();
    this.client.setTimeout(500);
    this.client.on('close', this._closed);
    this.client.on('error', () => {});
    this.client.on('timeout', () => this.client.end() && this.client.destroy());
    this.client.connect(9990, this.hostname, this._connected);
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Videohub#_closed
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
      this._statusObj = [];
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._check, 3000);
  }

  route = (output, input) =>
  {
    if (!this.connected) return false;

    let str = ['VIDEO OUTPUT ROUTING:', output + ' ' + input].join('\n');
    str += '\n\n';
    this.client.write(str);
    return true;
  }
  /**
   * Get Videohub server properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The server type
   * @property   {string}          result.hostname   The server hostname
   * @property   {string}          result.name       The server display name
   * @property   {boolean}         result.connected  Connection status
   */
  get status()
  {
    return {
      type: this.type,
      hostname: this.hostname,
      name: this.name,
      connected: this.connected
    }
  }
}

export default Videohub;