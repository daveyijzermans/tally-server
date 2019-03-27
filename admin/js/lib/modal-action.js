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
    /**
     * Reference to Socket.IO client
     * 
     * @type       {Object}
     */
    this.socket = opts.socket;
    /**
     * jQuery object of the modal container
     * 
     * @type       {jQuery}
     */
    this.$modal = opts.$modal
      .on('show.bs.modal', this._modalShow)
      .on('shown.bs.modal', this._modalShown)
      .on('hide.bs.modal', this._modalHide);
    /**
     * Main action button element of this modal
     * 
     * @type       {jQuery}
     */
    this.$btn = this.$modal.find('.btn-danger');
    /**
     * Description text element of this modal
     * 
     * @type       {jQuery}
     */
    this.$text = this.$modal.find('.modal-body');
  }
  /**
   * Executed when the modal will be shown.
   *
   * @method     Frontend.UI.ActionModal#_modalShow
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
        this.$text.text('Are you sure you want to shutdown all intercom users? You will need to use Wake-On-LAN or power cycle the PoE switch to get them back online.');
        break;
      case 'shutdownAll':
        this.$text.text('Are you sure you want to shutdown everything? You will need to use Wake-On-LAN or power cycle to get everything back online.');
        break;
      case 'logout':
        this.$text.text('Are you sure you want to logout of the administration page?');
        break;
      case 'mixer.link':
        this.$text.html('Are you sure you want to link ' + this._param.slave + ' to ' + this._param.master + '? All actions <strong>performed on</strong> ' + this._param.master + ' will be <strong>mirrored on to</strong> ' + this._param.slave + ' until you unlink.');
        break;
      case 'mixer.unlink':
        this.$text.html('Are you sure you want to unlink ' + this._param + '?');
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
   * @method     Frontend.UI.ActionModal#_modalShown
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
   * @method     Frontend.UI.ActionModal#_modalHide
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
   * @method     Frontend.UI.ActionModal#_btnConfirmClick
   *
   * @param      {Object}  event   The event
   * @fires      Frontend.UI.ActionModal#event:"command.*"
   * @fires      Socket#event:"admin.*"
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
    this.socket.once('admin.error', (msg) => alert(msg));
    this.$modal.modal('hide');
  }
}

export default ActionModal;