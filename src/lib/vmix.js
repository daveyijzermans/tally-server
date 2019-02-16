import Server from './server';
import { Socket } from 'net';
import readline from 'readline';

class Vmix extends Server
{
  constructor(opts)
  {
    super(opts);
    this.tallies = [];
    this._check();
  }
  /**
   * Parse lines that come from the Aten matrix
   * @param  {string} line 
   */
  _line = line =>
  {
    if(line.indexOf('TALLY OK ') == 0)
    {
      this.tallies = line.substring(9).split('').map((a) => { return parseInt(a) });
      this.emit('tallies', this.tallies);
    }
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
   * @param  {undefined|boolean} error
   */
  _closed = (error) =>
  {
    if(this.connected)
    {
      this.connected = false;
      this.tallies = [];
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._check, 3000);
  }
}

export default Vmix;