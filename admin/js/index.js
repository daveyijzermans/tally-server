import $ from 'jquery';
import Cookies from 'js-cookie';
import 'slidereveal';

import Log from './lib/log';
import Servers from './lib/servers';
import Routers from './lib/routers';
import Modems from './lib/modems';
import Ups from './lib/ups';
import Users from './lib/users';
import Tallies from './lib/tallies';
import Plugs from './lib/plugs';
import LoginModal from './lib/modal-login';
import ActionModal from './lib/modal-action';
import { toggleFullscreen } from './lib/fullscreen';
import moment from 'moment';

/**
 * All code concerning the frontend administrator interface logic
 *
 * @namespace        Frontend
 */

/**
 * All code concerning the frontend administrator interface UI handling
 *
 * @namespace        UI
 * @memberof         Frontend
 */

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
      $btnPopout: $('.mixerPopout'),
      socket: this.socket
    });
    /**
     * Users class instance
     *
     * @type       {Frontend.UI.Users}
     */
    this.users = new Users({
      $list: $('#users'),
      $btnPopout: $('.usersPopout'),
      $tpl: $('#tplUser'),
      $modal: $('#editUserModal'),
      $chkUpdateInput: $('#chkUpdateInput'),
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
     * Routers class instance
     *
     * @type       {Frontend.UI.Routers}
     */
    this.routers = new Routers({
      $list: $('#routers'),
      $tpl: $('#tplRouter'),
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
    }).toggle(!window.navigator.standalone);

    let $uptime = $('#uptime');
    this.socket.on('uptime', (uptime) =>
    {
      let formatted = moment.utc(uptime*1000).format('HH:mm:ss');
      $uptime.text(formatted);
    });
    this.socket.on('admin.config', (config) =>
    {
      $('#serverTitle, title').text(config.serverName);
      $('#serverHost').text(config.serverHost);
    });

    /* Router slideout */
    let $sldTrigger = $('#routerTrigger').tooltip();
    let $slideout = $('#routerSlideout').slideReveal({
      trigger: $sldTrigger,
      width: '370px',
      push: false,
      show: (panel) =>
      {
        $sldTrigger.find('i')
          .toggleClass('fa-chevron-right', false)
          .toggleClass('fa-chevron-left', true);
      },
      hide: (panel) => 
      {
        $sldTrigger.find('i')
          .toggleClass('fa-chevron-right', true)
          .toggleClass('fa-chevron-left', false);
      }
    });
  }
}

/**
 * Frontend admin instance
 *
 * @type       {Frontend.Admin}
 */
new Admin();