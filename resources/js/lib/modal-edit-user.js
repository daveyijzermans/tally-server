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
    this.socket = opts.socket;
    this.$btn = this.$modal.find('.btn-primary');
    this.$name = this.$modal.find('#user-name');
    this.$camNumber = this.$modal.find('#user-camnumber');
    this.$channelName = this.$modal.find('#user-channelname');

    this.$modal = opts.$modal
      .on('show.bs.modal', this._modalShow)
      .on('shown.bs.modal', this._modalShown)
      .on('hide.bs.modal', this._modalHide);

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
   * @param      {Object}   event   The event
   */
  _modalShown = event =>
  {
    this.$modal.find('#user-name').focus();
  }
  /**
   * Executed when the modal will be hidden.
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
   * @param      {Object}  event   The event
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
   * @param      {Object}  result  The result of the edit operation
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