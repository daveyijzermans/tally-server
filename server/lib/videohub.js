import Router from './router';
import { Socket } from 'net';
import log from './logger';

/**
 * Class for connecting to Blackmagic Videohub.
 *
 * @extends    Backend.Router
 * @memberof   Backend
 */
class Videohub extends Router
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
    this.client.on('data', this._parseData);
  }
  /**
   * Parse data coming from the video hub
   *
   * @method     Backend.Videohub#_parseData
   *
   * @param      {Object}  obj     data object
   */
  _parseData = (obj) =>
  {
    let split = obj.toString().split('\n');

    switch(split[0])
    {
      case 'INPUT LABELS:':
      case 'OUTPUT LABELS:':
        let arr = split[0] == 'INPUT LABELS:' ? this.inputs : this.outputs
        for (var i = 1; i < split.length; i++)
        {
          let s = split[i].split(' ');
          let index = s[0];
          let int = parseInt(index);
          if(isNaN(int)) break;
          let label = split[i].substring(index.length + 1);
          arr[int + 1].name = label
        }
        break;
      case 'VIDEO OUTPUT LOCKS:':
        for (var i = 1; i < split.length; i++)
        {
          let s = split[i].split(' ');
          let index = s[0];
          let int = parseInt(index);
          if(isNaN(int)) break;
          this.inputs[int + 1].locked = s[1] != 'U';
        }
        break;
      case 'VIDEO OUTPUT ROUTING:':
        for (var i = 1; i < split.length; i++)
        {
          let s = split[i].split(' ');
          let index = s[0];
          let int = parseInt(index);
          if(isNaN(int)) break;
          let input = parseInt(s[1]);
          this.outputs[int + 1].input = input + 1;
        }
        break;
    }
    /**
     * Videohub status was updated
     *
     * @event      Backend.Videohub#event:updated
     */
    this.emit('updated', this.status);
    log.trace('[' + this.name + '] Parsed received data:', obj);
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
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._check, 3000);
  }
  /**
   * Set a route on the videohub
   *
   * @method     Backend.Videohub#route
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

    let str = ['VIDEO OUTPUT ROUTING:', (output - 1) + ' ' + (input - 1)].join('\n');
    str += '\n\n';
    this.client.write(str);
    log.debug('[' + this.name + '][route] Routed input ' + input + ' to output ' + output);
    return true;
  }
  /**
   * Set an output label
   *
   * @method     Backend.Videohub#setOutputLabel
   *
   * @param      {number}   output  The output
   * @param      {string}   label   The label
   * @return     {boolean}  Result
   */
  setOutputLabel = (output, label) =>
  {
    if(!this.connected) return false;

    let str = ['OUTPUT LABELS:', output + ' ' + label].join('\n');
    str += '\n\n';
    this.client.write(str);
    log.debug('[' + this.name + '] Set output ' + output + ' label:', label);
    return true;
  };
  /**
   * Set an input label
   *
   * @method     Backend.Videohub#setInputLabel
   *
   * @param      {number}   input   The input
   * @param      {string}   label   The label
   * @return     {boolean}  Result
   */
  setInputLabel = (input, label) =>
  {
    if(!this.connected) return false;

    var str = ['INPUT LABELS:', input + ' ' + label].join('\n');
    str += '\n\n';
    this.client.write(str);
    log.debug('[' + this.name + '] Set input ' + input + ' label:', label);
    return true;
  };
}

export default Videohub;