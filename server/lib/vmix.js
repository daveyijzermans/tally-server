import Server from './server';
import { Socket } from 'net';
import readline from 'readline';

const effects = ['FADE', 'ZOOM', 'WIPE', 'SLIDE', 'FLY', 'CROSSZOOM', 'FLYROTATE', 'CUBE', 'CUBEZOOM', 'VERTICALWIPE', 'VERTICALSLIDE', 'MERGE', 'WIPEREVERSE', 'SLIDEREVERSE', 'VERTICALWIPEREVERSE', 'VERTICALSLIDEREVERSE'];

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
    /**
     * Tally information
     * 
     * @type       {number[]}
     */
    this.tallies = [];
    /**
     * Is this a video mixer that is switchable?
     *
     * @type       {boolean}
     */
    this.switchable = true;
    /**
     * Is this linked to another switcher?
     *
     * @type       {boolean|Backend.Server}
     */
    this.linked = opts.linked ? this.linkTo(opts.linked) : false;
    /**
     * Windows username and password for remote shutdown
     * 
     * @type       {string}
     */
    this.winUserPass = opts.winUserPass;
    this._check();
  }
  /**
   * Parse lines that come from the Aten matrix
   *
   * @method     Backend.Vmix#_line
   *
   * @param      {string}  line    The line
   * @fires      Backend.Server#event:tallies
   */
  _line = line =>
  {
    if(line.indexOf('TALLY OK ') == 0)
    {
      this.tallies = line.substring(9).split('').map((a) => { return parseInt(a) });
      this.emit('tallies', this.tallies);
      return;
    }
    if(line.indexOf('ACTS OK Input ') == 0)
    {
      let val = line.split(' ');
      if(val[4] == '0') return;
      let input = parseInt(val[3]);
      this.emit('action', 'switchInput', [input, 1]);
      return;
    }
    if(line.indexOf('ACTS OK InputPreview ') == 0)
    {
      let val = line.split(' ');
      if(val[4] == '0') return;
      let input = parseInt(val[3]);
      this.emit('action', 'switchInput', [input, 2]);
      return;
    }
    if(line.indexOf('ACTS OK Overlay') == 0)
    {
      let val = line.substring('ACTS OK Overlay'.length).split(' ');
      let overlayN = parseInt(val[0]);
      let input = parseInt(val[1]);
      let state = val[2] == '1';
      this.emit('action', 'overlay', [overlayN, input, state]);
      return;
    }
  };
  /**
   * Executed when server is connected
   *
   * @method     Backend.Vmix#_connected
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
    this.readline = readline.createInterface({
      input: this.client
    });
    this.readline.on('line', this._line);

    this.client.write('SUBSCRIBE TALLY\r\nSUBSCRIBE ACTS\r\n');
  }
  /**
   * Setup a new connection to the server and connect
   *
   * @method     Backend.Vmix#_check
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
   * @method     Backend.Vmix#_closed
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
      this.tallies = [];
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this.timeout = setTimeout(this._check, 3000);
  }
  /**
   * Set an input to preview or active state
   *
   * @method     Backend.Vmix#switchInput
   *
   * @param      {(number|string)}   input       The input number
   * @param      {number}            [state=1]   The state (1=program, 2=preview)
   * @return     {boolean}  Whether the command was successful.
   */
  switchInput = (input, state = 1) =>
  {
    input = parseInt(input);
    if(!this.connected || isNaN(input) || input < 1 || !(state === 1 || state === 2))
      return false;
    let fnc = state === 1 ? 'ActiveInput' : 'PreviewInput';
    this.client.write('FUNCTION ' + fnc + ' Input=' + input + '\r\n');
  }
  /**
   * Send cut command to vMix
   *
   * @method     Backend.Vmix#cut
   */
  cut = () =>
  {
    this.client.write('FUNCTION CUT\r\n');
    this.emit('action', 'cut');
  }
  /**
   * Send transition command to vMix
   *
   * @method     Backend.Vmix#transition
   */
  transition = (duration = 2000, effect = 'FADE') =>
  {
    duration = parseInt(duration);
    if(isNaN(duration)) return false;
    if(effects.indexOf(effect.toUpperCase()) == -1) return false;
    this.client.write('FUNCTION ' + effect + ' DURATION=' + duration + '\r\n');
    this.emit('action', 'transition', [duration, effect]);
  }

  overlay = (overlayN, input, state = true) =>
  {
    overlayN = parseInt(overlayN);
    input = parseInt(input);
    if(isNaN(overlayN) || isNaN(input)) return false;
    let stateCmd = state == true ? 'In' : 'Out';
    this.client.write('FUNCTION OverlayInput' + overlayN + stateCmd + ' INPUT=' + input + '\r\n');
    if(!state) this.emit('action', 'overlay', [overlayN, input, false]);
  }

  linkTo = (master) =>
  {
    let s = Server.getByName(master);
    if(!s) return false;
    if(master == this.name || s.linked.name == this.name)
      throw new Error('Are you trying to collapse the universe?');

    this.linked = s;
    this.linked.on('action', this._copyAction);
    return this.linked;
  }

  unlink = () =>
  {
    this.linked.off('action', this._copyAction);
    this.linked = false;
  }

  _copyAction = (method, args) =>
  {
    const methods = ['transition', 'switchInput', 'overlay'];
    if(methods.indexOf(method) == -1) return;
    return this[method].apply(this, args);
  }
  /**
   * Get vMix server properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The server type
   * @property   {string}          result.hostname   The server hostname
   * @property   {string}          result.name       The server display name
   * @property   {string|boolean}  result.wol        WOL address
   * @property   {boolean}         result.connected  Connection status
   * @property   {number[]}        result.tallies    Tally information
   * @property   {boolean}         result.switchable Whether this a video mixer that is switchable
   * @property   {boolean}         result.linked     Whether this mixer is linked to another mixer
   */
  get status()
  {
    return {
      type: this.type,
      hostname: this.hostname,
      name: this.name,
      wol: this.wol,
      connected: this.connected,
      tallies: this.tallies,
      switchable: this.switchable,
      linked: this.linked ? this.linked.status : false
    }
  }
}

export default Vmix;