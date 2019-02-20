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
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super(opts);
    /**
     * Username used to connect to this server
     * 
     * @type       {string}
     */
    this.username = opts.username;
    /**
     * Password used to connect to this server
     * 
     * @type       {string}
     */
    this.password = opts.password;
    /**
     * Path to key file
     * 
     * @type       {string}
     */
    this.key = opts.key;
    /**
     * Path to certificate file
     * 
     * @type       {string}
     */
    this.cert = opts.cert;
    /**
     * Array of channels users are allowed to enter.
     * 
     * @type       {string[]}
     */
    this.cycleChannels = opts.cycleChannels;
    this._check();
  }
  /**
   * Executed when server is connected
   *
   * @method     Backend.Mumble#_connected
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
   * @method     Backend.Mumble#_initialized
   * 
   * @fires      Backend.Server#event:connected
   * @fires      Backend.Server#event:connection
   * @fires      Backend.Server#event:user-channels
   */
  _initialized = () =>
  {
    if(!this.connected)
    {
      this.connected = true;
      this.emit('connected');
    }
    this.emit('connection', this.connected);

    this.client.on('user-connect', this._userMoved);
    this.client.on('user-disconnect', this._userDisconnect);
    this.client.on('user-move', this._userMoved);
    this.client.on('voice-start', this._onVoice);
    this.client.on('voice-end', this._onVoice);
    this.client.on('disconnected', this._closed);

    /**
     * Let listeners know of the channels on the Mumble server. Will be fired on
     * server connection.
     *
     * @event      Backend.Mumble#event:user-channels
     * @param      {Object<string, string>}  channels  Keys are usernames,
     *                                                 values are channel names
     */
    this.emit('user-channels', this._getChannelForAllUsers())
  }
  /**
   * Get channels that users are currently in
   *
   * @method     Backend.Mumble#_getChannelForAllUsers
   *
   * @return     {Object<string, string>}  channels  Keys are usernames, values
   *                                       are channel names
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
   * @method     Backend.Mumble#_userMoved
   *
   * @param      {Object}  u       User object from mumble API
   * @fires      Backend.Mumble#event:user-move
   */
  _userMoved = (u) =>
  {
    /**
     * Let listers know that a user was moved to a different channel in this
     * server.
     *
     * @event      Backend.Mumble#event:user-move
     * @param      {string}  username     The username of the user that was
     *                                    moved
     * @param      {string}  channelName  The channel that the user was moved to
     */
    this.emit('user-move', u.name, u.channel.name);
  }
  /**
   * Executed when user is disconnected
   *
   * @method     Backend.Mumble#_userDisconnect
   *
   * @param      {Object}  u       User object from mumble API
   * @fires      Backend.Mumble#event:user-move
   */
  _userDisconnect = (u) =>
  {
    this.emit('user-move', u.name, '');
  }
  /**
   * Executed when voice data is received. Indicates if a user is talking.
   *
   * @method     Backend.Mumble#_onVoice
   *
   * @param      {Object}  data    User voice data
   * @fires      Backend.Mumble#event:user-talk
   */
  _onVoice = (data) =>
  {
    /**
     * Let listeners know a users talk state has changed.
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
   *
   * @method     Backend.Mumble#_check
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
   * @method     Backend.Mumble#_closed
   *
   * @param      {undefined|boolean}  error   The error
   * @fires      Backend.Server#event:disconnected
   * @fires      Backend.Server#event:connection
   */
  _closed = (error) =>
  {
    if(this.connected)
    {
      this.client = null;
      this.connected = false;
      this.emit('disconnected');
    }
    this.emit('connection', this.connected);
    this._timeout = setTimeout(this._check, 3000);
  }
}

/**
 * Cycle a specific user to the next channel set in opts.cycleChannels
 *
 * @param      {string}   username  The username
 * @fires      Backend.Server#event:log
 * @return     {boolean}  Whether the move was executed
 */
Mumble.cycleUser = (username) =>
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
      this.emit('log', 'Found ' + username + ' in channel ' + curChannel + '. Moving to channel ' + newChannel.name + '.');
      user.moveToChannel(newChannel);
    } else
      this.emit('log', 'Found ' + username + ' in channel ' + curChannel + '. Channel not in cycle list.');
  });
}

export default Mumble;