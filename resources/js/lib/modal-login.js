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
    Object.assign(this, opts);
    this.$txtPassword = this.$modal.find('#txtPassword');
    this.$frmLogin = this.$modal.find('form');
    this.$btnLogin = this.$modal.find('#btnLogin');

    // Bind handlers to buttons and events
    this.$modal.on('show.bs.modal', this._modalShow);
    this.$modal.on('shown.bs.modal', this._modalShown);

    this.socket.on('authenticated', this._socketAuthenticated);
    this.socket.on('disconnect', this._socketDisconnect);
  }
  /**
   * Connect to the socket
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
   * @param      {Object}   event   The event
   */
  _modalShow = event =>
  {
    this.$txtPassword.removeClass('is-invalid');
  }
  /**
   * Executed when the modal is shown.
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
   * @fires      Frontend.UI.LoginModal#event:authenticated
   */
  _socketAuthenticated = () =>
  {
    /**
     * Snowball event.
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
   * @fires      Frontend.UI.LoginModal#event:error
   */
  _socketDisconnect = () =>
  {
    /**
     * Snowball event.
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