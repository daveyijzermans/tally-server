import Server from './server';
import API from 'atem';

/**
 * Class for connecting to Atem switchers.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Atem extends Server
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
     * Client API used for communicating to this server
     */
    this.client = new API(this.hostname)
      .on('connectionStateChange', this._connected)
      .on('sourceTally', this._handleTally)
      .on('inputTally', this._handleTally) //TODO: check if this works
      .on('error', err => console.error);
    /**
     * Tally information
     * 
     * @type       {number[]}
     */
    this.tallies = [];
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
   * @fires      Backend.Server#event:tallies
   */
  _handleTally = (n, state) =>
  {
    if (n > 0 && n < 100)
    {
      let newState = state.program == true ? 1 : state.preview == true ? 2 : 0;
      this.tallies[n-1] = newState;
      this.emit('tallies', this.tallies);
    }
  }
}

export default Atem;