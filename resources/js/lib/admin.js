import $ from 'jquery';
import Cookies from 'js-cookie';

import Log from './log';
import Servers from './servers';
import Users from './users';
import Tallies from './tallies';
import Plugs from './plugs';
import LoginModal from './modal-login';
import ActionModal from './modal-action';
import AVSetup from './avsetup';
import poof from './jquery-poof';
$.fn.poof = poof;
import { toggleFullscreen } from './fullscreen';

/**
 * Admin interface bootstrap
 *
 * @memberof      Frontend
 */
class Admin
{
  /**
   * Static instance of this class.
   *
   * @type     Frontend.Admin
   */
  static _instance;
  /**
   * Executed every time the socket authenticates correctly
   *
   * @param      {string}  password  MD5 hashed password
   */
  _authenticated = (password) =>
  {
    this.socket.emit('admin.update');
    
    if(this.remember)
      Cookies.set('adminPass', password, { expires: 7 });

    $('#serverStatus').html('<i class="fas fa-check-circle"></i> Connected');
  }
  /**
   * Executed every time the socket disconnects or authentication is incorrect
   */
  _loginError = () =>
  {
    $('#serverStatus').html('<i class="fas fa-times-circle faa-beat"></i> Disconnected');
  }
  /**
   * Executed when tally info is updated
   *
   * @param      {Object}  tallies  Tally information
   */
  _talliesUpdated = (tallies) => 
  {
    this.users.emit('tallies', this.tallies._combined);
  }
  /**
   * Executed when user info is updated
   */
  _usersUpdated = () => 
  {
    this.users.emit('tallies', this.tallies.combined);
  }
  /**
   * Constructs the object.
   */
  constructor()
  {
    if(Administrator._instance) return Administrator._instance;

    /**
     * Socket.io client. This will be resused indefinitely
     *
     * @type       {Object}
     */
    this.socket = io({
      autoConnect: false
    });
    /**
     * Login modal instance
     *
     * @type       {Frontend.UI.LoginModal}
     */
    this.loginModal = new LoginModal({
      $modal: $('#loginModal'),
      socket: this.socket
    });
    /**
     * Tallies class instance
     *
     * @type       {Frontend.UI.Tallies}
     */
    this.tallies = new Tallies({
      $list: $('#tallies'),
      $tpl: $('#tplTally'),
      socket: this.socket
    });
    /**
     * Users class instance
     *
     * @type       {Frontend.UI.Users}
     */
    this.users = new Users({
      $list: $('#users'),
      $btnPopout: $('#usersPopout'),
      $tpl: $('#tplUser'),
      $modal: $('#editUserModal'),
      socket: this.socket
    });
    /**
     * Servers class instance
     *
     * @type       {Frontend.UI.Servers}
     */
    this.servers = new Servers({
      $list: $('#servers'),
      $tpl: $('#tplServer'),
      socket: this.socket
    });
    /**
     * Smartplugs class instance
     *
     * @type       {Frontend.UI.Plugs}
     */
    this.plugs = new Plugs({
      $list: $('#plugs'),
      $tpl: $('#tplPlug'),
      socket: this.socket
    });
    /**
     * Logging class instance
     *
     * @type       {Frontend.UI.Log}
     */
    this.log = new Log({
      $list: $('#log'),
      $tpl: $('#tplLog'),
      socket: this.socket
    });
    /**
     * Action modal instance
     *
     * @type       {Frontend.UI.ActionModal}
     */
    this.actionModal = new ActionModal({
      $modal: $('#actionModal'),
      socket: this.socket
    });
    /**
     * AV setup instance
     *
     * @type       {Frontend.UI.AVSetup}
     */
    this.avSetup = new AVSetup({
      $sources: $('.avSource'),
      $targets: $('.avTarget')
    });

    this.tallies.on('updated', this._talliesUpdated);
    this.loginModal.on('authenticated', this._authenticated)
              .on('error', this._loginError);
    this.users.on('updated', this._usersUpdated);
    this.actionModal.on('command.logout', () => Cookies.remove('adminPass'));

    /**
     * Get stored password from cookie and attempt a login if it exists. Else show
     * the login modal
     */
    let storedPassword = Cookies.get('adminPass');
    if(storedPassword)
    {
      this.loginModal.connect(storedPassword);
    } else {
      this.loginModal.$modal.modal();
    }

    /**
     * Fullscreen button handler
     */
    $('#btnFullscreen').click(event =>
    {
      toggleFullscreen();
      event.preventDefault();
    });
  }
}

export default Admin;