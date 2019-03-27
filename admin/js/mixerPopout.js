import $ from 'jquery';
import Cookies from 'js-cookie';

import LoginModal from './lib/modal-login';
import Mixers from './lib/mixers';
import ActionModal from './lib/modal-action';
import poof from './lib/jquery-poof';
$.fn.poof = poof;
import { toggleFullscreen } from './lib/fullscreen';

/**
 * Mixer popout interface bootstrap
 *
 * @memberof      Frontend
 */
class MixerPopout
{
  /**
   * Executed every time the socket authenticates correctly
   *
   * @method     Frontend.MixerPopout#_authenticated
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
    if(MixerPopout._instance) return MixerPopout._instance;
    MixerPopout._instance = this;

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
     * Mixers class instance
     *
     * @type       {Frontend.UI.Mixers}
     */
    this.mixers = new Mixers({
      $list: $('#mixers'),
      $tpl: $('#tplMixer'),
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
 * Mixer popout bootstrap instance
 *
 * @type       {Frontend.MixerPopout}
 */
new MixerPopout();