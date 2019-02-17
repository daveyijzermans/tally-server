import Server from './server';
import { Socket } from 'net';

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
   */
  constructor(opts)
  {
    super(opts);
    this._check();
  }
  /**
   * Executed when server is connected
   *
   * @fires      Backend.Netgear#event:connected
   * @fires      Backend.Netgear#event:connection
   */
  _connected = () =>
  {
    if(!this.connected)
    {
      this.connected = true;
      /**
       * Snowball event.
       *
       * @event      Backend.Netgear#event:connected
       */
      this.emit('connected');
    }
    if(this.rebootPending)
    {
      logger('Rebooting Netgear...');
      this.client.write('admin\r\npassword\r\nenable\r\n\r\nreload\r\nyy');
    }
    /**
     * Snowball event.
     *
     * @event      Backend.Netgear#event:connection
     * @param      {boolean}  connected  Whether the server is connected
     */
    this.emit('connection', this.connected);
    this.client.end() && this.client.destroy();
  }
  /**
   * Setup a new connection to the server and connect
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
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Netgear#event:disconnected
   * @fires      Backend.Netgear#event:connection
   */
  _closed = (error) =>
  {
    if(error && this.connected)
    {
      this.connected = false;
      /**
       * Snowball event.
       *
       * @event      Backend.Netgear#event:disconnected
       */
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._check, 10000);
  }
}

export default Netgear;