import $ from 'jquery';
import 'bootstrap';
import md5 from 'js-md5';
import EventEmitter from 'events';

/**
 * Class for login modal.
 *
 * @extends    EventEmitter
 * @memberof   Frontend.UI
 */
class LoginModal extends EventEmitter
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super();
    /**
     * Password field
     * 
     * @type       {jQuery}
     */
    this.$txtPassword = this.$modal.find('#txtPassword');
    /**
     * Login form
     * 
     * @type       {jQuery}
     */
    this.$frmLogin = this.$modal.find('form');
    /**
     * Login button
     * 
     * @type       {jQuery}
     */
    this.$btnLogin = this.$modal.find('#btnLogin');
    /**
     * jQuery object of the modal container
     * 
     * @type       {jQuery}
     */
    this.$modal = opts.$modal
      .on('show.bs.modal', this._modalShow)
      .on('shown.bs.modal', this._modalShown);
    /**
     * Reference to Socket.IO client
     * 
     * @type       {Object}
     */
    this.socket = opts.socket
      .on('authenticated', this._socketAuthenticated)
      .on('disconnect', this._socketDisconnect);
  }
  /**
   * Connect to the socket
   *
   * @method     Frontend.UI.LoginModal#connect
   *
   * @param      {string}  p       MD5 hashed password
   */
  connect = p =>
  {
    this.password = p;
    this.socket.io.opts.query = {
      password: this.password
    };
    this.socket.connect();
  }
  /**
   * Button event handlers
   *
   * @method     Frontend.UI.LoginModal#_loginHandler
   *
   * @param      {Object}  event   The event
   */
  _loginHandler = event =>
  {
    this.$frmLogin.off('submit');
    this.$btnLogin.off('click');
    this.connect(md5(this.$txtPassword.val()));
    event.preventDefault();
  }
  /**
   * Executed when the modal will be shown.
   *
   * @method     Frontend.UI.LoginModal#_modalShow
   *
   * @param      {Object}   event   The event
   */
  _modalShow = event =>
  {
    this.$txtPassword.removeClass('is-invalid');
  }
  /**
   * Executed when the modal is shown.
   *
   * @method     Frontend.UI.LoginModal#_modalShown
   *
   * @param      {Object}   event   The event
   */
  _modalShown = event =>
  {
    this.$txtPassword.focus().select();
    this.$frmLogin.one('submit', this._loginHandler);
    this.$btnLogin.one('click', this._loginHandler);
  }
  /**
   * Executed when the socket is authenticated. Emits an event and hides the
   * modal.
   *
   * @method     Frontend.UI.LoginModal#_socketAuthenticated
   *
   * @fires      Frontend.UI.LoginModal#event:authenticated
   */
  _socketAuthenticated = () =>
  {
    /**
     * Let listeners know we succesfully authenticated with the server.
     *
     * @event      Frontend.UI.LoginModal#event:authenticated
     * @param      {string}  password  Hashed password that was authenticated
     *                                 with
     */
    this.emit('authenticated', this.password);
    this.$modal.modal('hide');
  }
  /**
   * Executed when the socket is disconnected. Emits an error event and reopens
   * the login modal.
   *
   * @method     Frontend.UI.LoginModal#_socketDisconnected
   *
   * @fires      Frontend.UI.LoginModal#event:error
   */
  _socketDisconnect = () =>
  {
    /**
     * Let listeners know there was an error with connecting or authenticating
     * with the server.
     *
     * @event      Frontend.UI.LoginModal#event:error
     * @param      {Error}  error   Error object
     */
    this.emit('error', new Error('Could not connect to socket'));

    this.$txtPassword.addClass('is-invalid');
    if(this.$modal.hasClass('show'))
    {
      this.$modal.trigger('shown.bs.modal');
    }
    else
    {
      this.$modal.modal('show');
    }
  }
  /**
   * Whether the remember checkbox is checked.
   *
   * @type     {boolean}
   */
  get remember() { return this.$modal.find('#chkRemember').is(':checked'); }
}

export default LoginModal;