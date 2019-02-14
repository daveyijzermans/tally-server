import $ from 'jquery';
import md5 from 'js-md5';
import Cookies from 'js-cookie';
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
    this.$modal.on('show.bs.modal', () =>
    {
      this.$txtPassword.removeClass('is-invalid');
    });
    this.$modal.on('shown.bs.modal', () =>
    {
      this.$txtPassword.focus().select();
      this.$frmLogin.one('submit', (event) => this.loginHandler(event));
      this.$btnLogin.one('click', (event) => this.loginHandler(event));
    });

    this.socket.on('authenticated', () =>
    {
      this.emit('authenticated', this.password);
    });

    this.socket.on('disconnect', () =>
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
    });
  }
  connect(p)
  {
    this.password = p;
    this.socket.io.opts.query = {
      password: this.password
    };
    this.socket.connect();
  }
  // Button event handlers
  loginHandler(event)
  {
    this.$frmLogin.off('submit');
    this.$btnLogin.off('click');
    this.connect(md5(this.$txtPassword.val()));
    event.preventDefault();
  }
}

export default LoginModal;