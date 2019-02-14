import $ from 'jquery';
import 'bootstrap';
import md5 from 'js-md5';
import EventEmitter from 'events';

class LoginModal extends EventEmitter
{
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
    this.socket.on('authenticated', this._modalHide);

    this.socket.on('disconnect', this._socketDisconnect);
  }
  connect = p =>
  {
    this.password = p;
    this.socket.io.opts.query = {
      password: this.password
    };
    this.socket.connect();
  }
  // Button event handlers
  _loginHandler = event =>
  {
    this.$frmLogin.off('submit');
    this.$btnLogin.off('click');
    this.connect(md5(this.$txtPassword.val()));
    event.preventDefault();
  }
  _modalShow = event =>
  {
    this.$txtPassword.removeClass('is-invalid');
  }
  _modalShown = event =>
  {
    this.$txtPassword.focus().select();
    this.$frmLogin.one('submit', this._loginHandler);
    this.$btnLogin.one('click', this._loginHandler);
  }
  _modalHide = event =>
  {
    this.emit('authenticated', this.password);
  }
  _socketDisconnect = () =>
  {
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
}

export default LoginModal;