import $ from 'jquery';
import Cookies from 'js-cookie';

import Log from './log';
import Servers from './servers';
import Modems from './modems';
import Ups from './ups';
import Users from './users';
import Tallies from './tallies';
import Plugs from './plugs';
import LoginModal from './modal-login';
import ActionModal from './modal-action';
import AVSetup from './avsetup';
import poof from './jquery-poof';
$.fn.poof = poof;
import { toggleFullscreen } from './fullscreen';
import moment from 'moment'

/**
 * Admin interface bootstrap
 *
 * @memberof      Frontend
 */
class Admin
{
  /**
   * Executed every time the socket authenticates correctly
   *
   * @method     Frontend.Admin#_authenticated
   * 
   * @param      {string}  password  MD5 hashed password
   * @listens    Frontend.UI.LoginModal#event:authenticated
   * @fires      Socket#event:"admin.update"
   */
  _authenticated = (password) =>
  {
    this.socket.emit('admin.update');
    
    if(this.loginModal.remember)
      Cookies.set('adminPass', password, { expires: 7 });

    $('#serverStatus').html('<i class="fas fa-check-circle"></i> Connected');
  }
  /**
   * Executed every time the socket disconnects or authentication is incorrect
   *
   * @method     Frontend.Admin#_loginError
   * 
   * @listens    Frontend.UI.LoginModal#event:error
   */
  _loginError = () =>
  {
    $('#serverStatus').html('<i class="fas fa-times-circle faa-beat"></i> Disconnected');
  }
  /**
   * Constructs the object.
   */
  constructor()
  {
    if(Admin._instance) return Admin._instance;
    Admin._instance = this;

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
     * Modems class instance
     *
     * @type       {Frontend.UI.Modems}
     */
    this.modems = new Modems({
      $list: $('#modems'),
      $tpl: $('#tplModem'),
      socket: this.socket
    });
    /**
     * Ups class instance
     *
     * @type       {Frontend.UI.Ups}
     */
    this.ups = new Ups({
      $list: $('#ups'),
      $tpl: $('#tplUps'),
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
      $box: $('#boxAV'),
      $sources: $('#boxAV').find('.avSource'),
      $targets: $('#boxAV').find('.avTarget'),
      isExpanded: Cookies.get('avExpanded') === 'true'
    }).on('toggle', (s) => Cookies.set('avExpanded', s));

    this.loginModal.on('authenticated', this._authenticated)
                   .on('error', this._loginError);
    this.actionModal.on('command.logout', () => Cookies.remove('adminPass'));

    /*
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

    /* Fullscreen button handler */
    $('#btnFullscreen').click(event =>
    {
      toggleFullscreen();
      event.preventDefault();
    });

    let $uptime = $('#uptime');
    this.socket.on('uptime', (uptime) =>
    {
      let formatted = moment.utc(uptime*1000).format('HH:mm:ss');
      $uptime.text(formatted);
    });
  }
}
/**
 * Static instance of this class.
 *
 * @type     {Frontend.Admin}
 */
Admin._instance;

export default Admin;