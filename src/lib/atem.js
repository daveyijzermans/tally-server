import Server from './server';
import API from 'atem';

/**
 * Class for connecting to Atem switchers.
 *
 * @class      Atem
 * @extends    Server
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
    this.tallies = [];

    this.client = new API(this.hostname);
    this.client.on('connectionStateChange', this._connected)
      .on('sourceTally', this._handleTally)
      .on('inputTally', this._handleTally) //TODO: check if this works
      .on('error', err => console.error);
  }
  /**
   * Executed when server is connected
   *
   * @param      {boolean}  state   The connection state
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
   * @param      {number}  n       Camera number
   * @param      {Object}  state   Object containing state information
   */
  _handleTally = (n, state) =>
  {
    if (n > 0 && n < 100)
    {
      let newState = state.program == true ? '1' : state.preview == true ? '2' : '0';
      this.tallies[n-1] = newState;
      this.emit('tallies', this.tallies);
    }
  }
}

export default Atem;