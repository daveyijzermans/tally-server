import Server from './server';
import { Socket } from 'net';
import ping from 'net-ping';
import Logger from './logger';
const log = Logger.getLogger('Netgear');

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

    this.client = ping.createSession();

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
    this.emit('connection', this.connected);
    if(this.rebootPending)
    {
      log.info(' Rebooting...');
      let socket = new Socket();
      socket.on('connect', () =>
      {
        socket.write(this.username + '\r\n' + this.password + '\r\nenable\r\n\r\nreload\r\nyyyy');
      });
      socket.on('data', (data) => {console.log(data.toString())});
      socket.connect(60000, this.hostname);
      this.rebootPending = false;
    }
    this.timeout = setTimeout(this._check, 10000);
  }
  /**
   * Setup a new connection to the server and connect
   *
   * @method     Backend.Netgear#_check
   */
  _check = () =>
  {
    this.client.pingHost(this.hostname, (error, target) =>
    {
      if(error) this._closed(error)
      else this._connected();
    });
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