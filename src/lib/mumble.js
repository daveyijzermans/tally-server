import Server from './server';
import API from 'mumble';
import fs from 'fs';

/**
 * Class for connecting to Mumble servers.
 *
 * @class      Mumble
 * @extends    Server
 */
class Mumble extends Server
{
  /**
   * Cycle a specific user to the next channel set in opts.cycleChannels
   *
   * @param      {string}   username  The username
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

    this.emit('user-channels', this._getChannelForAllUsers())
  }
  /**
   * Get channels that users are currently in
   *
   * @return     {Object}  Keys are usernames, values are channel name
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
   * Executed when user is disconnected
   *
   * @param      {Object}  u       User object from mumble API
   */
  _userDisconnect = (u) =>
  {
    this.emit('user-moved', u.name, '');
  }
  /**
   * Executed when user is moved
   *
   * @param      {Object}  u       User object from mumble API
   */
  _userMoved = (u) =>
  {
    this.emit('user-moved', u.name, u.channel.name);
  }
  /**
   * Executed when voice data is received. Indicates if a user is talking.
   *
   * @param      {Object}  data    User voice data
   */
  _onVoice = (data) =>
  {
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

export default Mumble;