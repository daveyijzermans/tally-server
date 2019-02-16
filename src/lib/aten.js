import Server from './server';
import { Socket } from 'net';
import readline from 'readline';

class Aten extends Server
{
  constructor(opts)
  {
    super(opts);
    this._check();
  }
  /**
   * Parse lines that come from the Aten matrix
   * @param  {string} line 
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
   * @param  {undefined|boolean} error
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