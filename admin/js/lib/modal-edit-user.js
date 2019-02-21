import $ from 'jquery';
import 'bootstrap';

/**
 * Class for the edit user modal.
 *
 * @memberof   Frontend.UI
 */
class EditUserModal
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
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
    this.$btn = this.$modal.find('.btn-primary');
    /**
     * User name text field
     * 
     * @type       {jQuery}
     */
    this.$name = this.$modal.find('#user-name');
    /**
     * Camera number text field
     * 
     * @type       {jQuery}
     */
    this.$camNumber = this.$modal.find('#user-camnumber');
    /**
     * Channel name text field
     * 
     * @type       {jQuery}
     */
    this.$channelName = this.$modal.find('#user-channelname');

    //TODO let channels = Config.cycleableChannels;
    let channels = ['Cameras','program1','program2','both'];
    channels.forEach(name =>
    {
      $('<option></option')
        .text(name)
        .appendTo(this.$channelName);
    });
  }
  /**
   * Executed when the modal will be shown.
   *
   * @method     Frontend.UI.EditUserModal#_modalShow
   *
   * @param      {Object}   event   The event
   */
  _modalShow = event =>
  {
    let rel = $(event.relatedTarget);
    this._user = rel.data('user');
    this.$name.focus().val(this._user.name);
    this.$camNumber.val(this._user.camNumber);
    this.$channelName.val(this._user.channelName);

    this.$btn.off('click');
    this.$btn.on('click', this._btnEditClick);
  }
  /**
   * Executed when the modal is shown.
   *
   * @method     Frontend.UI.EditUserModal#_modalShown
   *
   * @param      {Object}   event   The event
   */
  _modalShown = event =>
  {
    this.$modal.find('#user-name').focus();
  }
  /**
   * Executed when the modal will be hidden.
   *
   * @method     Frontend.UI.EditUserModal#_modalHide
   *
   * @param      {Object}   event   The event
   */
  _modalHide = event =>
  {
    this.$camNumber.removeClass('is-invalid');
    this.$channelName.removeClass('is-invalid');
    this.$btn.off('click');
  }
  /**
   * Handle the edit-button click.
   *
   * @method     Frontend.UI.EditUserModal#_btnEditClick
   *
   * @param      {Object}  event   The event
   * @param      {Object}         newData              New user data
   * @param      {string}         newData.username     Current username
   * @param      {string}         newData.name         New display name
   * @param      {string|number}  newData.camNumber    New camera number
   * @param      {string}         newData.channelName  New channel name
   * @fires      Socket#event:"admin.set.user"
   */
  _btnEditClick = event =>
  {
    let newData = {username: this._user.username};
    newData.name = this.$name.val();
    newData.camNumber = this.$camNumber.val();
    newData.channelName = this.$channelName.val();

    this.socket.emit('admin.set.user', newData, this._userSetCallback);
  }
  /**
   * Callback function for editing user
   *
   * @method     Frontend.UI.EditUserModal#_userSetCallback
   *
   * @param      {Object}  result  The result of the edit operation
   * @param      {boolean}  result.errors       Whether there were any errors
   * @param      {boolean}  result.camNumber    Whether there was an error with the
   *                                            camera number
   * @param      {boolean}  result.channelName  Whether there was an error with the
   *                                            channel name
   */
  _userSetCallback = result =>
  {
    if (result.errors == true)
    {
      this.$camNumber.toggleClass('is-invalid', result.camNumber);
      this.$channelName.toggleClass('is-invalid', result.channelName);
      return;
    }
    this.$modal.modal('hide');
  }
}

export default EditUserModal;