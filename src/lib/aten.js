import Server from './server';
import { Socket } from 'net';
import readline from 'readline';

/**
 * Class for connecting to Aten matrix.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Aten extends Server
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
     * Username used to connect to this server
     * 
     * @type       {String}
     */
    this.username = opts.username;
    /**
     * Password used to connect to this server
     * 
     * @type       {String}
     */
    this.password = opts.password;
    this._check();
  }
  /**
   * Parse lines that come from the Aten matrix
   *
   * @param      {string}  line    The line
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
   */
  _line = line =>
  {
    if(line.indexOf('Connection to VM0808HA is established') == 0)
    {
      this.connected = true;
      this.emit('connected');
      this.emit('connection', this.connected);
    }
  }
  /**
   * Executed when server is connected
   */
  _connected = () =>
  {
    this.client.setTimeout(0);
    this.readline = readline.createInterface({
      input: this.client
    });
    this.readline.on('line', this._line);

    this.client.write(this.username + '\r\n' + this.password + '\r\n');
  }
  /**
   * Setup a new connection to the server and connect
   */
  _check = () =>
  {
    this.client = new Socket();
    this.client.setTimeout(500);
    this.client.on('close', this._closed);
    this.client.on('error', () => {});
    this.client.on('timeout', () => this.client.end() && this.client.destroy());
    this.client.connect(23, this.hostname, this._connected);
  }
  /**
   * Executed when server connection is closed
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
    this.timeout = setTimeout(this._check, 10000);
  }
}

export default Aten;