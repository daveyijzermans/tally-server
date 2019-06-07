import Router from './router';
import { Socket } from 'net';
import readline from 'readline';
import Logger from './logger';
const log = Logger.getLogger('Aten');

/**
 * Class for connecting to Aten matrix.
 *
 * @extends    Backend.Router
 * @memberof   Backend
 */
class Aten extends Router
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
     * @type       {string}
     */
    this.username = opts.username;
    /**
     * Password used to connect to this server
     * 
     * @type       {string}
     */
    this.password = opts.password;
    this._timeout = setTimeout(this._check, 100);
  }
  /**
   * Parse lines that come from the Aten matrix
   *
   * @method     Backend.Aten#_line
   *
   * @param      {string}  line    The line
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
   */
  _line = line =>
  {
    log.trace('[_line]:', line);
    if(line.indexOf('Connection to VM0808HA is established') == 0)
    {
      this.connected = true;
      this.emit('connected');
      this.emit('connection', this.connected);
      this._refresh();
      return;
    }
    if(line.indexOf('Input Port ') == 0)
    {
      let split = line.split(' ');
      let input = parseInt(split[2]);
      let output = parseInt(split[split.length - 2]);
      
      this.outputs[output].input = input;
      this.emit('updated', this.status);
      return;
    }
    if(line.indexOf('Switch input ') == 0)
    {
      let split = line.split(' ');
      let input = parseInt(split[2]);
      let output = parseInt(split[split.length - 1]);
      
      this.outputs[output].input = input;
      this.emit('updated', this.status);
      return;
    }
    if(line.indexOf('No port is connected to Output Port ') == 0)
    {
      let split = line.split(' ');
      let output = parseInt(split[split.length - 2]);
      
      this.outputs[output].input = 0;
      this.emit('updated', this.status);
      return;
    }
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Aten#_connected
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
   *
   * @method     Backend.Aten#_check
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
   * Refresh Aten status
   *
   * @method     Backend.Aten#_refresh
   */
  _refresh = () =>
  {
    for (let i = 1; i < this.outputs.length; i++)
      this.client.write('RO ' + i + '\r\n');
    this._timeout = setTimeout(this._refresh, 5000);
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Aten#_closed
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
    clearTimeout(this._timeout);
    this._timeout = setTimeout(this._check, 10000);
  }
  /**
   * Set a route on the Aten
   *
   * @method     Backend.Aten#route
   *
   * @param      {number|string}  input   The input number
   * @param      {number|string}  output  The output number
   * @return     {boolean}        Result
   */
  route = (input, output) =>
  {
    if(!this.connected) return false;
    input = parseInt(input);
    output = parseInt(output);
    if(isNaN(input) || isNaN(output)) return false;

    this.client.write('SS ' + input + ',' + output + '\r\n');
    log.debug('[route] Routed input ' + input + ' to output ' + output);
    return true;
  }
}

export default Aten;