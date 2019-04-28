import Mixer from './mixer';
import { Socket } from 'net';
import readline from 'readline';
import log from './logger';
import XMLParser from 'fast-xml-parser';

const regexMac = /^((([0-9A-F]{2}:){5})|(([0-9A-F]{2}-){5})|([0-9A-F]{10}))([0-9A-F]{2})$/i; 

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
    /**
     * vMix version
     * 
     * @type       {string}
     */
    this.version = 0;
    /**
     * Recording status
     * 
     * @type       {boolean}
     */
    this.recording = false;
    /**
     * Streaming status
     * 
     * @type       {boolean}
     */
    this.streaming = false;
    /**
     * Fullscreen status
     * 
     * @type       {boolean}
     */
    this.fullscreen = false;
    /**
     * External output status
     * 
     * @type       {boolean}
     */
    this.external = false;
    /**
     * Multicorder status
     * 
     * @type       {boolean}
     */
    this.multiCorder = false;
    /**
     * Fade to black status
     * 
     * @type       {boolean}
     */
    this.fadeToBlack = false;
    /**
     * XML retrieving timeout
     * 
     * @type       {number}
     */
    this.xmlTimeout = 0;

    this.on('action', this._assignSelfAction);
    this._check();
  }
  /**
   * Parse lines that come from Vmix
   *
   * @method     Backend.Vmix#_line
   *
   * @param      {string}  line    The line
   * @fires      Backend.Mixer#event:tallies
   * @fires      Backend.Mixer#event:action
   */
  _line = line =>
  {
    log.trace('[' + this.name + '][_line]', line);
    if(line.indexOf('VERSION OK ') == 0) 
    {
      this.version = line.substring('VERSION OK '.length);
      return;
    }
    if(line.indexOf('TALLY OK ') == 0)
    {
      let tallies = line.substring('TALLY OK '.length).split('');
      for (var i = 0; i < tallies.length; i++)
      {
        let state = parseInt(tallies[i]);
        if(state == 1 && i + 1 == this._currentPreviewInput) state = 3;
        if(!this.inputs[i + 1]) this.inputs[i + 1] = {};
        this.inputs[i + 1].status = state;
      }
      
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
          this[method] = state;
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

    this.client.write('SUBSCRIBE TALLY\r\nSUBSCRIBE ACTS\r\n');
    this._getXmlParams(this._assignFirstXml);
  }
  /**
   * Request and parse XML parameters for retrieving info not available through activators.
   *
   * @method     Backend.Vmix#_getXmlParams
   * 
   * @param      {Function} callback Callback to call with the result
   */
  _getXmlParams = (callback = null) =>
  {
    let capture = false;
    let xml = [];
    let timeout = 0;
    let setCaptureTimeout = () =>
    {
      if(timeout) clearTimeout(timeout);
      timeout = setTimeout(() =>
      {
        capture = false;
        xml = '';
        this.readline.off('line', parseParam);
        callback(new Error('XML retrieve timeout'));
      }, 5000);
    }
    let parseParam = (line) =>
    {
      if(line.indexOf('XML ') == 0)
      {
        capture = parseInt(line.substring(4)) - 1;
        setCaptureTimeout();
        return;
      }
      if(typeof capture == 'number')
      {
        clearTimeout(timeout);
        xml.push(line);
        let join = xml.join('\r\n');
        if(join.length == capture)
        {
          this.readline.off('line', parseParam);

          let json = XMLParser.parse(join, {
            attributeNamePrefix: '',
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            parseAttributeValue: true,
            parseTrueNumberOnly: true
          });
          callback(json.vmix);
          capture = false;
          xml = '';
          return;
        }
        setCaptureTimeout();
      }
    }
    this.readline.on('line', parseParam);
    this.client.write('XML\r\n');
  }
  /**
   * Parse first time info, then start the timeout for getting input audio control data
   * 
   * @method     Backend.Vmix#_assignFirstXml
   *
   * @param      {Object}   result  Result XML data as object
   */
  _assignFirstXml = (result) =>
  {
    if(result instanceof Error)
    {
      log.error(result);
    } else {
      this._currentPreviewInput = result.preview;
      this._currentProgramInput = result.active;
      this.recording = result.recording == 'True';
      this.streaming = result.streaming == 'True';
      this.fullscreen = result.fullscreen == 'True';
      this.external = result.external == 'True';
      this.multiCorder = result.multiCorder == 'True';
      this.fadeToBlack = result.fadeToBlack == 'True';
      this._currentTransition = result.transitions.transition[0].effect;
      this._autoDuration = result.transitions.transition[0].duration;
      var inputs = result.inputs.input;
      for (var i = 0; i < inputs.length; i++)
      {
        let data = inputs[i];
        if(!this.inputs[data.number]) this.inputs[data.number] = {};
        this.inputs[data.number].name = data.title;
        this.inputs[data.number].active = data.muted == 'False';
        this.inputs[data.number].solo = data.solo == 'True';
        this.inputs[data.number].level = [data.meterF1, data.meterF2];
        this.inputs[data.number].balance = data.balance;
        this.inputs[data.number].volume = data.volume;
      }
      this.outputs[1] = {
        name: 'Master',
        level: [result.audio.master.meterF1, result.audio.master.meterF2],
        active: result.audio.master.muted == 'False',
        volume: result.audio.master.volume
      };
      this.outputs[2] = {
        name: 'Bus A',
        level: [result.audio.busA.meterF1, result.audio.busA.meterF2],
        active: result.audio.busA.muted == 'False',
        volume: result.audio.busA.volume
      };
      this.outputs[3] = {
        name: 'Bus B',
        level: [result.audio.busB.meterF1, result.audio.busB.meterF2],
        active: result.audio.busB.muted == 'False',
        volume: result.audio.busB.volume
      }
    }
    this.xmlTimeout = setTimeout(this._getControlDataXml, 100);
  }
  /**
   * Gets the audio control data xml.
   * 
   * @method     Backend.Vmix#_getControlDataXml
   */
  _getControlDataXml = () =>
  {
    this._getXmlParams(this._assignInputXml);
  }
  /**
   * Parse input data XML result
   *
   * @method     Backend.Vmix#_assignInputXml
   *
   * @param      {Object}   result  Result XML data as object
   */
  _assignInputXml = (result) =>
  {
    if(result instanceof Error)
    {
      log.error(result);
    } else {
      let changed = false;
      /* Set output level meters */
      this.outputs[1].level = [result.audio.master.meterF1, result.audio.master.meterF2];
      this.outputs[2].level = [result.audio.busA.meterF1, result.audio.busA.meterF2];
      this.outputs[3].level = [result.audio.busB.meterF1, result.audio.busB.meterF2];
      [1, 2, 3].forEach(i => this.emit('controlChange', { w: 'outputs', i: i, level: this.outputs[i].level }));

      /* Set input level meters */
      let inputs = result.inputs.input;
      for (let i = 0; i < inputs.length; i++)
      {
        let input = inputs[i];
        if(!this.inputs[input.number])
        {
          this.inputs[input.number] = {};
        }

        let newName = input.title;
        if(this.inputs[input.number].name != newName)
        {
          this.inputs[input.number].name = newName;
          changed = true;
        }
        
        let newLevel = [input.meterF1, input.meterF2];
        if(!this.inputs[input.number].level ||
           this.inputs[input.number].level[0] != newLevel[0] ||
           this.inputs[input.number].level[1] != newLevel[1])
        {
          this.inputs[input.number].level = newLevel;
          this.emit('controlChange', { w: 'inputs', i: input.number, level: newLevel });
        }
        
        let newBalance = input.balance;
        if(this.inputs[input.number].balance != newBalance)
        {
          this.inputs[input.number].balance = newBalance;
          this.emit('controlChange', { w: 'inputs', i: input.number, balance: newBalance });
        }
      }
      let newLength = inputs.length + 1;
      if(this.inputs.length != newLength)
      {
        changed = true;
        this.inputs = this.inputs.slice(0, newLength);
      }
      if(changed) this.emit('updated');
    }
    this.xmlTimeout = setTimeout(this._getControlDataXml, 100);
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
    clearTimeout(this.xmlTimeout);
    if(this.connected)
    {
      this.connected = false;
      // this.tallies = [];
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
   * @fires      Backend.Mixer#event:action
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
   * @fires      Backend.Mixer#event:action
   *
   * @param      {number}   duration  The duration
   * @param      {string}   effect    The effect
   * @param      {boolean}  execute   Does this command need to be actually
   *                                  executed or is it handled by a different
   *                                  action?
   * @return     {boolean}  Whether the command was successful
   */
  transition = (duration = 2000, effect = 'Fade', execute = true) =>
  {
    if(!this.connected) return false;
    duration = parseInt(duration);
    if(isNaN(duration)) return false;
    if(typeof this.effects[effect] == 'undefined') return false;
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
   * @fires      Backend.Mixer#event:action
   *
   * @param      {number}   n         Tbar position 0-255
   * @param      {string}   effect    The effect
   * @param      {boolean}  execute   Does this command need to be actually
   *                                  executed or is it handled by a different
   *                                  action?
   * @return     {boolean}  Whether the command was successful
   */
  fade = (n = 255, effect = 'Fade', execute = true) =>
  {
    if(!this.connected) return false;
    n = parseInt(n);
    if(isNaN(n)) return false;
    n = n > 0 ? (n < 255 ? n : 255) : 0;
    if(this.effects[effect] && this._currentTransition !== effect)
    {
      this.client.write('FUNCTION SetTransitionEffect1 VALUE=' + this.effects[effect] + '\r\n');
      this._currentTransition = effect;
    }
    if(execute) this.client.write('FUNCTION SetFader Value=' + n + '\r\n');
    log.debug('[' + this.name + '][fade] Args:', n, effect, execute);
    this.emit('action', 'fade', [n, effect]);
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
   * @method     Backend.Vmix#setInputLabel
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
   * Set transition effect
   *
   * @method     Backend.Vmix#setTransition
   *
   * @param      {string}          effect  The effect
   * @param      {number}          n       Transition number
   */
  setTransition = (effect = 'Fade', n = 1) =>
  {
    n = parseInt(n);
    if(this.effects[effect] && this._currentTransition !== effect)
    {
      this.client.write('FUNCTION SetTransitionEffect' + n + ' VALUE=' + this.effects[effect] + '\r\n');
      this._currentTransition = effect;
      this.emit('action', 'setTransition', [effect, n]);
    }
  }
  /**
   * Set transition effect duration
   *
   * @method     Backend.Vmix#setDuration
   *
   * @param      {number}          n         Transition number
   * @param      {number}          duration  Transition length in ms
   */
  setDuration = (n = 1, duration = 2000) =>
  {
    n = parseInt(n);
    duration = parseInt(duration);
    this.client.write('FUNCTION SetTransitionDuration' + n + ' VALUE=' + duration + '\r\n');
    if(n == 1)
      this._autoDuration = duration;
    this.emit('action', 'setDuration', [n, duration]);
  }
  /**
   * Listen to own actions and set input/output parameters
   * 
   * @method     Backend.Vmix#_assignSelfAction
   *
   * @param      {string}        param  The parameter name
   * @param      {mixed[]}          args    The arguments
   * 
   * @listens    Backend.Mixer#event:action
   * @fires      Backend.Mixer#event:controlChange
   */
  _assignSelfAction = (param, args) =>
  {
    switch(param)
    {
      case 'inputVolume':
        let number = args[0];
        let newVolume = args[1];
        if(this.inputs[number].volume != newVolume)
        {
          this.inputs[number].volume = newVolume;
          this.emit('controlChange', { w: 'inputs', i: number, volume: newVolume })
        }
        break;
      case 'inputAudio':
        this.inputs[args[0]].active = args[1];
        this.emit('controlChange', { w: 'inputs', i: args[0], active: args[1] });
        break;
      case 'inputSolo':
        this.inputs[args[0]].solo = args[1];
        this.emit('controlChange', { w: 'inputs', i: args[0], solo: args[1] });
        break;
    }
  }
  /**
   * Get vMix server properties
   *
   * @type       {Object}
   * @property   {string}          result.type         The mixer type
   * @property   {string}          result.hostname     The mixer hostname
   * @property   {string}          result.name         The mixer display name
   * @property   {boolean}         result.connected    Connection status
   * @property   {number[]}        result.tallies      Tally information
   * @property   {boolean|Object}  result.linked       Link status
   * @property   {string|boolean}  result.wol          WOL address
   * @property   {boolean}         result.recording    Recording status
   * @property   {boolean}         result.streaming    Streaming status
   * @property   {boolean}         result.fullscreen   Fullscreen status
   * @property   {boolean}         result.external     External status
   * @property   {boolean}         result.multiCorder  Multicorder status
   * @property   {boolean}         result.fadeToBlack  Fade to black status
   */
  get status()
  {
    return Object.assign(super.status, {
      wol: this.wol,
      version: this.version,
      recording: this.recording,
      streaming: this.streaming,
      fullscreen: this.fullscreen,
      external: this.external,
      multiCorder: this.multiCorder,
      fadeToBlack: this.fadeToBlack
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
    return ['transition', 'switchInput', 'overlay', 'fade', 'setTransition', 'setDuration'];
  }

  get effects()
  {
    return {
      'Fade': 'Fade',
      'Dip': 'Fade',
      'Zoom': 'Zoom',
      'Wipe': 'Wipe',
      'Slide': 'Slide',
      'Fly': 'Fly',
      'CrossZoom': 'CrossZoom',
      'FlyRotate': 'FlyRotate',
      'Cube': 'Cube',
      'CubeZoom': 'CubeZoom',
      'VerticalWipe': 'VerticalWipe',
      'VerticalSlide': 'VerticalSlide',
      'Merge': 'Merge',
      'WipeReverse': 'WipeReverse',
      'SlideReverse': 'SlideReverse',
      'VerticalWipeReverse': 'VerticalWipeReverse',
      'VerticalSlideReverse': 'VerticalSlideReverse'
    }
  }
}

export default Vmix;