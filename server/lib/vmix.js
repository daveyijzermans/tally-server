import Mixer from './mixer';
import { Socket } from 'net';
import readline from 'readline';
import log from './logger';

const effects = {
  'FADE': 'FADE',
  'DIP': 'FADE',
  'ZOOM': 'ZOOM',
  'WIPE': 'WIPE',
  'SLIDE': 'SLIDE',
  'FLY': 'FLY',
  'CROSSZOOM': 'CROSSZOOM',
  'FLYROTATE': 'FLYROTATE',
  'CUBE': 'CUBE',
  'CUBEZOOM': 'CUBEZOOM',
  'VERTICALWIPE': 'VERTICALWIPE',
  'VERTICALSLIDE': 'VERTICALSLIDE',
  'MERGE': 'MERGE',
  'WIPEREVERSE': 'WIPEREVERSE',
  'SLIDEREVERSE': 'SLIDEREVERSE',
  'VERTICALWIPEREVERSE': 'VERTICALWIPEREVERSE',
  'VERTICALSLIDEREVERSE': 'VERTICALSLIDEREVERSE'
};
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
   * Parse lines that come from Vmix
   *
   * @method     Backend.Vmix#_line
   *
   * @param      {string}  line    The line
   * @fires      Backend.Vmix#event:tallies
   * @fires      Backend.Vmix#event:action
   */
  _line = line =>
  {
    log.debug('[' + this.name + '] Got line from TCP API:', line);
    if(line.indexOf('XMLTEXT OK ') == 0)
    {
      let p = parseInt(line.substring('XMLTEXT OK '.length));
      if(this._currentPreviewInput == 0)
      {
        this._currentPreviewInput = p;
        this.client.write('XMLTEXT vmix/active\r\n');
        return;
      }
      if(this._currentProgramInput == 0)
      {
        this._currentProgramInput = p;
      }
    }
    if(line.indexOf('TALLY OK ') == 0)
    {
      this.tallies = line.substring('TALLY OK '.length).split('').reduce((a, c, i) =>
      {
        let tally = parseInt(c);
        if(tally == 1 && i + 1 == this._currentPreviewInput) tally = 3;
        a.push(tally);
        return a;
      }, [null]);
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
      let input = parseInt(val[3]);
      if(val[4] == '0') return;
      this._currentProgramInput = input;
      this.emit('action', 'switchInput', [input, 1]);
      return;
    }
    if(line.indexOf('ACTS OK InputPreview ') == 0)
    {
      let val = line.split(' ');
      if(val[4] == '0') return;
      let input = parseInt(val[3]);
      this._currentPreviewInput = input;
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
    if(line.indexOf('ACTS OK InputVolumeChannelMixer') == 0)
    {
      let val = line.substring('ACTS OK InputVolumeChannelMixer'.length).split(' ');
      let ch = parseInt(val[0]);
      let input = parseInt(val[1]);
      let value = parseFloat(val[2]);
      this.emit('action', 'inputVolumeChannelMixer' + ch, [input, value]);
      return;
    }
    if(line.indexOf('ACTS OK ') == 0) 
    {
      let val = line.substring('ACTS OK '.length).split(' ');
      switch(val[0])
      {
        /* number + bool */
        case 'InputAudio':
        case 'InputSolo':
        case 'InputMasterAudio':
        case 'InputBusAAudio':
        case 'InputBusBAudio':
        {
          let input = parseInt(val[1]);
          let state = val[2] == '1';
          let method = val[0].charAt(0).toLowerCase() + val[0].substring(1);
          this.emit('action', method, [input, state]);
          break;
        }

        /* number + float */
        case 'InputVolume':
        case 'InputHeadphones':
        {
          let input = parseInt(val[1]);
          let value = parseFloat(val[2]);
          let method = val[0].charAt(0).toLowerCase() + val[0].substring(1);
          this.emit('action', method, [input, value]);
          break;
        }

        /* float */
        case 'MasterVolume':
        case 'MasterHeadphones':
        case 'BusAVolume':
        case 'BusBVolume':
        {
          let value = parseFloat(val[1]);
          let method = val[0].charAt(0).toLowerCase() + val[0].substring(1);
          this.emit('action', method, [value]);
          break;
        }

        /* booleans only */
        case 'FadeToBlack':
        case 'Recording':
        case 'Streaming':
        case 'External':
        case 'MultiCorder':
        case 'Fullscreen':
        case 'MasterAudio':
        case 'BusAAudio':
        case 'BusBAudio':
        {
          let state = val[1] == '1';
          let method = val[0].charAt(0).toLowerCase() + val[0].substring(1);
          this.emit('action', method, [state]);
          break;
        }
      }
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

    this.client.write('SUBSCRIBE TALLY\r\nSUBSCRIBE ACTS\r\nXMLTEXT vmix/preview\r\n');
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
    if(!this.connected) return false;
    input = parseInt(input);
    if(!this.connected || isNaN(input) || input < 1 || !(state === 1 || state === 2))
      return false;
    let fnc = state === 1 ? 'ActiveInput' : 'PreviewInput';
    this.client.write('FUNCTION ' + fnc + ' Input=' + input + '\r\n');
    log.debug('[' + this.name + '][switchInput] Set input', input, 'to state', state);
  }
  /**
   * Send cut command to vMix
   *
   * @method     Backend.Vmix#cut
   * 
   * @fires      Backend.Vmix#event:action
   */
  cut = () =>
  {
    if(!this.connected) return false;
    this.client.write('FUNCTION CUT\r\n');
    log.debug('[' + this.name + '][cut]');
    this.emit('action', 'cut');
  }
  /**
   * Send transition command to vMix
   *
   * @method     Backend.Vmix#transition
   *
   * @fires      Backend.Vmix#event:action
   *
   * @param      {number}   duration  The duration
   * @param      {string}   effect    The effect
   * @param      {boolean}  execute   Does this command need to be actually
   *                                  executed or is it handled by a different
   *                                  action?
   * @return     {boolean}  Whether the command was successful
   */
  transition = (duration = 2000, effect = 'FADE', execute = true) =>
  {
    if(!this.connected) return false;
    duration = parseInt(duration);
    if(isNaN(duration)) return false;
    if(typeof effects[effect] == 'undefined') return false;
    this.client.write('FUNCTION SetTransitionEffect1 VALUE=' + effects[effect] + '\r\n')
    if(execute) this.client.write('FUNCTION ' + effect + ' DURATION=' + duration + '\r\n');
    log.debug('[' + this.name + '][transition] Args:', duration, effect, execute);
    this.emit('action', 'transition', [duration, effect]);
    return true;
  }
  /**
   * Send fade bar position to vMix
   *
   * @method     Backend.Vmix#fade
   *
   * @fires      Backend.Vmix#event:action
   *
   * @param      {number}   n         Tbar position 0-255
   * @param      {string}   effect    The effect
   * @param      {boolean}  execute   Does this command need to be actually
   *                                  executed or is it handled by a different
   *                                  action?
   * @return     {boolean}  Whether the command was successful
   */
  fade = (n = 255, effect = 'FADE', execute = true) =>
  {
    if(!this.connected) return false;
    n = parseInt(n);
    if(isNaN(n)) return false;
    n = n > 0 ? (n < 255 ? n : 255) : 0;
    // this.client.write('FUNCTION SetTransitionEffect1 VALUE=' + effects[effect] + '\r\n'); //FIXME: this crashes vMix
    if(execute) this.client.write('FUNCTION SetFader Value=' + n + '\r\n');
    log.debug('[' + this.name + '][fade] Args:', n, effect, execute);
    this.emit('action', 'fade', [n]);
    return true;
  }
  /**
   * Send overlay show/hide command to vMix
   *
   * @method     Backend.Vmix#overlay
   * 
   * @fires      Backend.Vmix#event:action
   *
   * @param      {number}   overlayN  The overlay number
   * @param      {number}   input     The input number
   * @param      {boolean}  state     The state (on/off)
   * @return     {boolean}  Whether the command was successful
   */
  overlay = (overlayN, input, state = true) =>
  {
    if(!this.connected) return false;
    overlayN = parseInt(overlayN);
    input = parseInt(input);
    if(isNaN(overlayN) || isNaN(input)) return false;
    let stateCmd = state == true ? 'In' : 'Out';
    this.client.write('FUNCTION OverlayInput' + overlayN + stateCmd + ' INPUT=' + input + '\r\n');
    log.debug('[' + this.name + '][overlay] Args:', overlayN, input, state);
    if(!state) this.emit('action', 'overlay', [overlayN, input, false]);
  }
  /**
   * Sets the input label on the inputs of the mixer.
   *
   * @param      {number}  input   The input number
   * @param      {string}  label   The label
   */
  setInputLabel = (input, label) =>
  {
    input = parseInt(input);
    label = encodeURIComponent(label);
    this.client.write('FUNCTION SetInputName INPUT=' + input + '&VALUE=' + label + '\r\n');
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
   * @property   {boolean|Object}  result.linked     Link status
   * @property   {string|boolean}  result.wol        WOL address
   */
  get status()
  {
    return Object.assign(super.status, {
      wol: this.wol
    });
  }
  /**
   * Return which actions that are executed by a master can be mirrored on this
   * mixer
   *
   * @type       {string[]}
   */
  get actions()
  {
    return ['transition', 'switchInput', 'overlay', 'fade'];
  }
}

export default Vmix;