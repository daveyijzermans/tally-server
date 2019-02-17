import Server from './server';
import API from 'mumble';
import fs from 'fs';

/**
 * Class for connecting to Mumble servers.
 *
 * @extends    Backend.Server
 * @memberof   Backend
 */
class Mumble extends Server
{
  /**
   * Cycle a specific user to the next channel set in opts.cycleChannels
   *
   * @param      {string}   username  The username
   * @fires      Backend.Mumble#event:log
   * @return     {boolean}  Whether the move was executed
   */
  static cycleUser = (username) =>
  {
    Server.getByType('mumble').forEach((mumble) =>
    {
      if(!mumble.client || !mumble.connected) return false;
      let user = mumble.client.userByName(username);
      if(!user) return false;

      let curChannel = user.channel.name;
      let index = mumble.cycleChannels.indexOf(curChannel);
      if(index != -1)
      {
        // Figure out the next channel, or reset to the 0th one.
        index = index + 1 >= mumble.cycleChannels.length ? 0 : index + 1;
        let newChannel = mumble.client.channelByName(mumble.cycleChannels[index]);
        /**
         * Snowball event.
         *
         * @event      Backend.Mumble#event:log
         * @param      {string}  msg     Log message
         */
        this.emit('log', 'Found ' + username + ' in channel ' + curChannel + '. Moving to channel ' + newChannel.name + '.');
        user.moveToChannel(newChannel);
      } else
        this.emit('log', 'Found ' + username + ' in channel ' + curChannel + '. Channel not in cycle list.');
    });
  }
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
   */
  _connected = (err, client) =>
  {
    if(err) return this._closed(err);
    this.client = client;
    this.client.authenticate(this.username);
    this.client.on('initialized', this._initialized);
  }
  /**
   * Executed when mumble is authenticated
   * 
   * @fires      Backend.Mumble#event:connected
   * @fires      Backend.Mumble#event:connection
   * @fires      Backend.Mumble#event:user-channels
   */
  _initialized = () =>
  {
    if(!this.connected)
    {
      this.connected = true;
      /**
       * Snowball event.
       *
       * @event      Backend.Mumble#event:connected
       */
      this.emit('connected');
    }
    /**
     * Snowball event.
     *
     * @event      Backend.Mumble#event:connection
     * @param      {boolean}  connected  Whether the server is connected
     */
    this.emit('connection', this.connected);

    this.client.on('user-connect', this._userMoved);
    this.client.on('user-disconnect', this._userDisconnect);
    this.client.on('user-move', this._userMoved);
    this.client.on('voice-start', this._onVoice);
    this.client.on('voice-end', this._onVoice);
    this.client.on('disconnected', this._closed);

    /**
     * Snowball event.
     *
     * @event      Backend.Mumble#event:user-channels
     * @param      {Object}  channels  Keys are usernames, values are channel
     *                                 names
     */
    this.emit('user-channels', this._getChannelForAllUsers())
  }
  /**
   * Get channels that users are currently in
   *
   * @return     {Object}  Keys are usernames, values are channel names
   */
  _getChannelForAllUsers = () =>
  {
    let r = {};
    this.client.users().map((u) =>
    {
      r[u.name] = u.channel.name;
    });
    return r;
  }
  /**
   * Executed when user is moved
   *
   * @param      {Object}  u       User object from mumble API
   * @fires      Backend.Mumble#event:user-move
   */
  _userMoved = (u) =>
  {
    /**
     * Snowball event.
     *
     * @event      Backend.Mumble#event:user-moved
     * @param      {string}  username     The username of the user that was
     *                                    moved
     * @param      {string}  channelName  The channel that the user was moved to
     */
    this.emit('user-moved', u.name, u.channel.name);
  }
  /**
   * Executed when user is disconnected
   *
   * @param      {Object}  u       User object from mumble API
   * @fires      Backend.Mumble#event:user-move
   */
  _userDisconnect = (u) =>
  {
    this.emit('user-moved', u.name, '');
  }
  /**
   * Executed when voice data is received. Indicates if a user is talking.
   *
   * @param      {Object}  data    User voice data
   * @fires      Backend.Mumble#event:user-talk
   */
  _onVoice = (data) =>
  {
    /**
     * Snowball event.
     *
     * @event      Backend.Mumble#event:user-talk
     * @param      {string}   username  The username of the user that is now
     *                                  (not) talking
     * @param      {boolean}  talking   Whether the user is now talking
     */
    this.emit('user-talk', data.name, data.talking);
  }
  /**
   * Setup a new connection to the server and connect
   */
  _check = () =>
  {
    this.client = null;
    let opts = {
      key: fs.readFileSync(this.key),
      cert: fs.readFileSync(this.cert)
    };
    API.connect('mumble://' + this.hostname, opts, this._connected);
  }
  /**
   * Executed when server connection is closed
   *
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Mumble#event:disconnected
   * @fires      Backend.Mumble#event:connection
   */
  _closed = (error) =>
  {
    if(this.connected)
    {
      this.client = null;
      this.connected = false;
      /**
       * Snowball event.
       *
       * @event      Backend.Mumble#event:disconnected
       */
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this._timeout = setTimeout(this._check, 3000);
  }
}

export default Mumble;