import Server from './server';
import { Socket } from 'net';

/**
 * Class for connecting to Netgear switch.
 *
 * @class      Netgear
 * @extends    Server
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
      logger('Rebooting Netgear...');
      this.client.write('admin\r\npassword\r\nenable\r\n\r\nreload\r\nyy');
    }
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