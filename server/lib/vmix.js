import Mixer from './mixer';
import { Socket } from 'net';
import readline from 'readline';

const effects = ['FADE', 'ZOOM', 'WIPE', 'SLIDE', 'FLY', 'CROSSZOOM', 'FLYROTATE', 'CUBE', 'CUBEZOOM', 'VERTICALWIPE', 'VERTICALSLIDE', 'MERGE', 'WIPEREVERSE', 'SLIDEREVERSE', 'VERTICALWIPEREVERSE', 'VERTICALSLIDEREVERSE'];
const regexMac = /^((([0-9A-F]{2}:){5})|(([0-9A-F]{2}-){5})|([0-9A-F]{10}))([0-9A-F]{2})$/i

/**
 * Class for connecting to vMix API via TCP.
 *
 * @extends    Backend.Mixer
 * @memberof   Backend
 */
class Vmix extends Mixer
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
     * MAC address to send WOL packets to. If WOL is not supported it is set
     * to false
     *
     * @type       {string|boolean}
     */
    this.wol = regexMac.test(opts.wol) ? opts.wol : false;
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
   * @fires      Backend.Vmix#event:tallies
   * @fires      Backend.Mixer#event:action
   */
  _line = line =>
  {
    if(line.indexOf('TALLY OK ') == 0)
    {
      this.tallies = line.substring(9).split('').map((a) => { return parseInt(a) });
      /**
       * Let listeners know that tally information was updated.
       *
       * @event      Backend.Vmix#event:tallies
       * @param      {number[]}  tallies  Tally information
       */
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
   * 
   * @fires      Backend.Mixer#event:action
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
   * 
   * @fires      Backend.Mixer#event:action
   *
   * @param      {number}   duration  The duration
   * @param      {string}   effect    The effect
   * @return     {boolean}  Whether the command was successful
   */
  transition = (duration = 2000, effect = 'FADE') =>
  {
    duration = parseInt(duration);
    if(isNaN(duration)) return false;
    if(effects.indexOf(effect.toUpperCase()) == -1) return false;
    this.client.write('FUNCTION ' + effect + ' DURATION=' + duration + '\r\n');
    this.emit('action', 'transition', [duration, effect]);
    return true;
  }
  /**
   * Send overlay show/hide command to vMix
   *
   * @method     Backend.Vmix#overlay
   * 
   * @fires      Backend.Mixer#event:action
   *
   * @param      {number}   overlayN  The overlay number
   * @param      {number}   input     The input number
   * @param      {boolean}  state     The state (on/off)
   * @return     {boolean}  Whether the command was successful
   */
  overlay = (overlayN, input, state = true) =>
  {
    overlayN = parseInt(overlayN);
    input = parseInt(input);
    if(isNaN(overlayN) || isNaN(input)) return false;
    let stateCmd = state == true ? 'In' : 'Out';
    this.client.write('FUNCTION OverlayInput' + overlayN + stateCmd + ' INPUT=' + input + '\r\n');
    if(!state) this.emit('action', 'overlay', [overlayN, input, false]);
  }
  /**
   * Get vMix server properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The mixer type
   * @property   {string}          result.hostname   The mixer hostname
   * @property   {string}          result.name       The mixer display name
   * @property   {boolean}         result.connected  Connection status
   * @property   {number[]}        result.tallies    Tally information
   * @property   {boolean|object}  result.linked     Link status
   * @property   {string|boolean}  result.wol        WOL address
   */
  get status()
  {
    return Object.assign(super.status, {
      wol: this.wol
    });
  }
}

export default Vmix;