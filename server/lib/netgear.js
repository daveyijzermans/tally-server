import Server from './server';
import { Socket } from 'net';
import log from './logger';

/**
 * Class for connecting to Netgear switch.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Netgear extends Server
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
   */
  constructor(opts)
  {
    super(opts);
    /**
     * Username used to connect to this server
     * 
     * @type       {string}
     */
    this.username = opts.username;
    /**
     * Password used to connect to this server
     * 
     * @type       {string}
     */
    this.password = opts.password;
    this._check();
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Netgear#_connected
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
    if(this.rebootPending)
    {
      log.info('[' + this.name + '] Rebooting..,');
      this.client.write(this.username + '\r\n' + this.password + '\r\nenable\r\n\r\nreload\r\nyy');
    }
    this.emit('connection', this.connected);
    this.client.end() && this.client.destroy();
  }
  /**
   * Setup a new connection to the server and connect
   *
   * @method     Backend.Netgear#_check
   */
  _check = () =>
  {
    this.client = new Socket();
    this.client.setTimeout(1500);
    this.client.on('connect', this._connected);
    this.client.on('close', this._closed);
    this.client.on('error', () => {});
    this.client.on('timeout', () => this.client.end() && this.client.destroy());
    this.client.connect(60000, this.hostname);
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Netgear#_closed
   *
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _closed = (error) =>
  {
    if(error && this.connected)
    {
      this.connected = false;
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._check, 10000);
  }
}

export default Netgear;