import Mixer from './mixer';
import API from 'atem';

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
    
    this.client = new API(this.hostname)
      .on('connectionStateChange', this._connected)
      .on('sourceTally', this._handleTally)
      .on('inputTally', this._handleTally) //TODO: check if this works
      .on('error', err => console.error);
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Atem#_connected
   *
   * @param      {boolean}  state   The connection state
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _connected = (state) =>
  {
    /**
     * Toggle the connected property only if it wasn't previously connected or disconnected
     */
    if(!this.connected && state.description == 'connected')
    {
      this.connected = true;
      this.emit('connected');
    }
    if(this.connected && state.description != 'connected')
    {
      this.connected = false;
      this.tallies = [];
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
  }
  /**
   * Tally callback handler
   *
   * @method     Backend.Atem#_handleTally
   *
   * @param      {number}  n       Camera number
   * @param      {Object}  state   Object containing state information
   * @param      {boolean}  state.program  Indicates whether the source is in program
   *                                       or not
   * @param      {boolean}  state.preview  Indicates whether the source is in preview
   *                                       or not
   * @fires      Backend.Atem#event:tallies
   */
  _handleTally = (n, state) =>
  {
    if (n > 0 && n < 100)
    {
      let newState = state.program == true ? 1 : state.preview == true ? 2 : 0;
      this.tallies[n-1] = newState;
      /**
       * Let listeners know that tally information was updated.
       *
       * @event      Backend.Atem#event:tallies
       * @param      {number[]}  tallies  Tally information
       */
      this.emit('tallies', this.tallies);
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
    input = parseInt(input);
    if(!this.connected || isNaN(input) || input < 1 || !(state === 1 || state === 2))
      return false;
    let fnc = state === 1 ? 'setProgram' : 'setPreview';
    this.client[fnc](input-1);
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
    return ['transition', 'switchInput', 'overlay'];
  }
}

export default Atem;