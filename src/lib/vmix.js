import Server from './server';
import { Socket } from 'net';
import readline from 'readline';

/**
 * Class for connecting to vMix API via TCP.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Vmix extends Server
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super(opts);
    this.tallies = [];
    this._check();
  }
  /**
   * Parse lines that come from the Aten matrix
   *
   * @param      {string}  line    The line
   * @fires      Backend.Vmix#event:tallies
   */
  _line = line =>
  {
    if(line.indexOf('TALLY OK ') == 0)
    {
      this.tallies = line.substring(9).split('').map((a) => { return parseInt(a) });
      /**
       * Snowball event.
       *
       * @event      Backend.Vmix#event:tallies
       * @param      {Array.number}  tallies  Tally information
       */
      this.emit('tallies', this.tallies);
    }
  }
  /**
   * Executed when server is connected
   *
   * @fires      Backend.Vmix#event:connected
   * @fires      Backend.Vmix#event:connection
   */
  _connected = () =>
  {
    if(!this.connected)
    {
      this.connected = true;
      /**
       * Snowball event.
       *
       * @event      Backend.Vmix#event:connected
       */
      this.emit('connected');
    }
    /**
     * Snowball event.
     *
     * @event      Backend.Vmix#event:connection
     * @param      {boolean}  connected  Whether the server is connected
     */
    this.emit('connection', this.connected);

    this.client.setTimeout(0);
    this.readline = readline.createInterface({
      input: this.client
    });
    this.readline.on('line', this._line);

    this.client.write('SUBSCRIBE TALLY\r\n');
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
    this.client.connect(8099, this.hostname, this._connected);
  }
  /**
   * Executed when server connection is closed
   *
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Vmix#event:disconnected
   * @fires      Backend.Vmix#event:connection
   */
  _closed = (error) =>
  {
    if(this.connected)
    {
      this.connected = false;
      this.tallies = [];
      /**
       * Snowball event.
       *
       * @event      Backend.Vmix#event:disconnected
       */
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._check, 3000);
  }
}

export default Vmix;