import Mixer from './mixer';
import API from 'applest-atem';

const effects = {
  'FADE': 0x00,
  'DIP': 0x01,
  'ZOOM': 0x00,
  'WIPE': 0x02,
  'SLIDE': 0x02,
  'FLY': 0x02,
  'CROSSZOOM': 0x02,
  'FLYROTATE': 0x02,
  'CUBE': 0x02,
  'CUBEZOOM': 0x02,
  'VERTICALWIPE': 0x02,
  'VERTICALSLIDE': 0x02,
  'MERGE': 0x00,
  'WIPEREVERSE': 0x02,
  'SLIDEREVERSE': 0x02,
  'VERTICALWIPEREVERSE': 0x02,
  'VERTICALSLIDEREVERSE': 0x02
};

/**
 * Class for connecting to Atem switchers.
 *
 * @extends    Backend.Mixer
 * @memberof   Backend
 */
class Atem extends Mixer
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
     * Frame rate. Used to calculate transition length
     * 
     * @type       {float}
     */
    this.fps = parseFloat(opts.fps) || 25;
    /**
     * Mix/effects bus number
     * 
     * @type       {number}
     */
    this.ME = parseInt(opts.ME) || 0;
    
    this.client = new API();
    this.client.connect(this.hostname);
    this.client.on('connect', this._connected)
      .on('disconnect', this._closed)
      .on('stateChanged', this._updated)
      .on('error', console.error);
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Atem#_connected
   *
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _connected = () =>
  {
    /*
     * Toggle the connected property only if it wasn't previously connected
     */
    if(!this.connected)
    {
      this.connected = true;
      this.emit('connected');
    }
    this.emit('connection', this.connected);
  }
  /**
   * Executed when server connection is closed
   *
   * @method     Backend.Atem#_closed
   *
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _closed = () =>
  {
    /*
     * Toggle the connected property only if it wasn't previously disconnected
     */
    if(this.connected)
    {
      this.connected = false;
      this.tallies = [];
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
  }
  /**
   * State change callback handler
   *
   * @method     Backend.Atem#_updated
   *
   * @param      {number}  n       Camera number
   * @param      {Object}  state   Object containing state information
   * @fires      Backend.Atem#event:tallies
   * @fires      Backend.Atem#event:action
   */
  _updated = (err, state) => //TODO: document
  {
    let pos = state.video.ME[this.ME].transitionPosition;
    let tbar = Math.ceil(state.video.ME[this.ME].transitionPosition * 255);
    if(pos >= 0.9945) return this.client.changeTransitionPosition(10000); //FIXME
    this.emit('action', 'fade', [tbar]);

    this._currentProgramInput = [state.video.ME[this.ME].programInput];
    this._currentPreviewInput = state.video.ME[this.ME].previewInput;
    this.emit('action', 'switchInput', [state.video.ME[this.ME].programInput, 1]);
    this.emit('action', 'switchInput', [state.video.ME[this.ME].previewInput, 2]);

    let newTallies = state.tallys.reduce((a, c, i) =>
    {
      a.push(c);
      return a;
    }, [null]);
    if (JSON.stringify(this.tallies) != newTallies)
    {
      /**
       * Let listeners know that tally information was updated.
       *
       * @event      Backend.Atem#event:tallies
       * @param      {number[]}  tallies  Tally information
       */
      this.emit('tallies', this.tallies = newTallies);
    }
  }
  /**
   * Set an input to preview or active state
   *
   * @method     Backend.Atem#switchInput
   *
   * @param      {(number|string)}   input       The input number
   * @param      {number}            [state=1]   The state (1=program, 2=preview)
   * @return     {boolean}  Whether the command was successful.
   */
  switchInput = (input, state = 1) =>
  {
    /*
     * Ugly hack to make sure the input doesn't switch after a transition. This
     * happens if a master's transition finished earlier than the ATEM. Then the
     * input status is updated and pushed to the slave and the ATEM will swap
     * the current mix inputs/outputs.
     */
    if(this.client.state.video.ME[this.ME].transitionPosition > 0.9) return false;
    input = parseInt(input);
    if(!this.connected || isNaN(input) || input < 1 || !(state === 1 || state === 2))
      return false;
    let fnc = state === 1 ? 'changeProgramInput' : 'changePreviewInput';
    this.client[fnc](input, this.ME);
    return true;
  }
  /**
   * Send cut command to ATEM
   *
   * @method     Backend.Atem#cut
   * 
   * @fires      Backend.Atem#event:action
   */
  cut = () =>
  {
    if(!this.connected) return false;
    this.client.cutTransition(this.ME);
    this.emit('action', 'cut');
  }
  /**
   * Send transition command to ATEM
   *
   * @method     Backend.Atem#transition
   * 
   * @fires      Backend.Atem#event:action
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
    duration = parseInt(duration);
    if(isNaN(duration)) return false;
    if(typeof effects[effect] == 'undefined') return false;
    this.client.changeTransitionType(effects[effect]);
    this.client.changeTransitionMix(duration / (1000 / this.fps), this.ME);
    if(execute) this.client.changeTransitionPosition(0);
    if(execute) this.client.autoTransition(this.ME);
    this.emit('action', 'transition', [duration, effect, false]);
    return true;
  }
  /**
   * Send fade bar position to ATEM
   *
   * @method     Backend.Atem#fade
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
    n = parseInt(n);
    if(isNaN(n)) return false;
    n = n > 0 ? (n < 255 ? n : 255) : 0;
    // this.client.changeTransitionType(effects[effect]); //FIXME: see other fixme, cache this value in mixer obj
    if(execute) this.client.changeTransitionPosition(n * Math.floor(10000/255), this.ME);
    return true;
  }
  /**
   * Return which actions that are executed by a master can be mirrored on this
   * mixer
   *
   * @type       {string[]}
   */
  get actions()
  {
    return ['fade', 'transition', 'switchInput', 'overlay'];
  }
  /**
   * Get ATEM server properties
   *
   * @type       {Object}
   * @property   {string}          result.type       The mixer type
   * @property   {string}          result.hostname   The mixer hostname
   * @property   {string}          result.name       The mixer display name
   * @property   {boolean}         result.connected  Connection status
   * @property   {number[]}        result.tallies    Tally information
   * @property   {boolean|Object}  result.linked     Link status
   * @property   {number}          result.fps        FPS setting
   */
  get status()
  {
    return Object.assign(super.status, {
      fps: this.fps
    });
  }
}

export default Atem;