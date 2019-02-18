import $ from 'jquery';
import 'bootstrap';
import Cookies from 'js-cookie';
import EventEmitter from 'events';

/**
 * Class for action modal.
 *
 * @extends    EventEmitter
 * @memberof   Frontend.UI
 */
class ActionModal extends EventEmitter
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    super();

    this.socket = opts.socket;

    this.$btn = this.$modal.find('.btn-danger');

    this.$text = this.$modal.find('.modal-body');

    this.$modal = opts.$modal
      .on('show.bs.modal', this._modalShow)
      .on('shown.bs.modal', this._modalShown)
      .on('hide.bs.modal', this._modalHide);
  }
  /**
   * Executed when the modal will be shown.
   *
   * @param      {Object}   event   The event
   * @return     {boolean|undefined}
   */
  _modalShow = event =>
  {
    let rel = $(event.relatedTarget);
    this._cmd = rel.data('command');
    this._param = rel.data('param');

    switch(this._cmd)
    {
      case 'restart':
        this.$text.text('Are you sure you want to restart the administration server?');
        break;
      case 'reboot':
        this.$text.text('Are you sure you want to reboot ' + this._param + '?');
        break;
      case 'shutdown':
        this.$text.text('Are you sure you want to shutdown ' + this._param + '? You will need to use Wake-On-LAN or power cycle to get it back online.');
        break;
      case 'wake':
        this.$text.text('Are you sure you want to wake-up ' + this._param + '?');
        break;
      case 'rebootUsers':
        this.$text.text('Are you sure you want to reboot all intercom users? Clients will disconnect and will take approximately 30 seconds to get back online.');
        break;
      case 'updateUsers':
        this.$text.text('Are you sure you want to update all intercom users? Clients will disconnect and will take approximately 1 minute to get back online.');
        break;
      case 'shutdownUsers':
        this.$text.text('Are you sure you want to shutdown the server? You will need to use Wake-On-LAN or power cycle the PoE switch to get them back online.');
        break;
      case 'shutdownAll':
        this.$text.text('Are you sure you want to shutdown everything? You will need to use Wake-On-LAN or power cycle to get everything back online.');
        break;
      case 'logout':
        this.$text.text('Are you sure you want to logout of the administration page?');
        break;
      default:
        console.error('Invalid command');
        return false;
    }

    this.$btn.focus().off('click').one('click', this._btnConfirmClick);
  }
  /**
   * Executes when the modal is shown.
   *
   * @param      {Object}  event   The event
   */
  _modalShown = event =>
  {
    this.$btn.focus();
  }
  /**
   * Executes when the modal will be hidden.
   *
   * @param      {Object}  event   The event
   */
  _modalHide = event =>
  {
    this.$btn.off('click');
  }
  /**
   * Handle the confirm-button click.
   *
   * @param      {Object}  event   The event
   * @fires      Frontend.UI.ActionModal#event:"command.*"
   */
  _btnConfirmClick = event =>
  {
    /**
     * Let listeners know we want to execute a server side command.
     *
     * @event      Frontend.UI.ActionModal#event:"command.*"
     * @param      {mixed}  param   Parameter to pass to the server
     */
    this.emit('command.' + this._cmd, this._param);
    this.socket.emit('admin.' + this._cmd, this._param);
    this.$modal.modal('hide');
  }
}

export default ActionModal;