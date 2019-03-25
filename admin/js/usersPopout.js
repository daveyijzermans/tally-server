import $ from 'jquery';
import Cookies from 'js-cookie';

import Users from './lib/users';
import LoginModal from './lib/modal-login';
import ActionModal from './lib/modal-action';
import poof from './lib/jquery-poof';
$.fn.poof = poof;

/**
 * User popout interface bootstrap
 *
 * @memberof      Frontend
 */
class UsersPopout
{
  /**
   * Executed every time the socket authenticates correctly
   *
   * @method     Frontend.UsersPopout#_authenticated
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
    if(UsersPopout._instance) return UsersPopout._instance;
    UsersPopout._instance = this;

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
     * Users class instance
     *
     * @type       {Frontend.UI.Users}
     */
    this.users = new Users({
      $list: $('#users'),
      $tpl: $('#tplUser'),
      $modal: $('#editUserModal'),
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
 * Users popout bootstrap instance
 *
 * @type       {Frontend.UsersPopout}
 */
new UsersPopout();