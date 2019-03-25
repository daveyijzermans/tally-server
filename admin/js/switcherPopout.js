import $ from 'jquery';
import Cookies from 'js-cookie';

import LoginModal from './lib/modal-login';
import Switchers from './lib/switchers';
import ActionModal from './lib/modal-action';
import poof from './lib/jquery-poof';
$.fn.poof = poof;
import { toggleFullscreen } from './lib/fullscreen';

/**
 * Switcher popout interface bootstrap
 *
 * @memberof      Frontend
 */
class SwitcherPopout
{
  /**
   * Executed every time the socket authenticates correctly
   *
   * @method     Frontend.SwitcherPopout#_authenticated
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
  }
  /**
   * Constructs the object.
   */
  constructor()
  {
    if(SwitcherPopout._instance) return SwitcherPopout._instance;
    SwitcherPopout._instance = this;

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
     * Switchers class instance
     *
     * @type       {Frontend.UI.Switchers}
     */
    this.switchers = new Switchers({
      $list: $('#switchers'),
      $tpl: $('#tplSwitcher'),
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
                   .on('error', () => {});
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
  }
}

/**
 * Switcher popout bootstrap instance
 *
 * @type       {Frontend.SwitcherPopout}
 */
new SwitcherPopout();