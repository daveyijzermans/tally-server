import $ from 'jquery';
import 'bootstrap';

let config = require('../../config.json');

class EditUserModal
{
  constructor(opts)
  {
    Object.assign(this, opts);
    this.$btn = this.$modal.find('.btn-primary');
    this.$name = this.$modal.find('#user-name');
    this.$camNumber = this.$modal.find('#user-camnumber');
    this.$channelName = this.$modal.find('#user-channelname');

    this.$modal
      .on('show.bs.modal', this._modalShow)
      .on('shown.bs.modal', this._modalShown)
      .on('hide.bs.modal', this._modalHide);

    config.cycleChannels.forEach(name =>
    {
      $('<option></option')
        .text(name)
        .appendTo(this.$channelName);
    });
  }
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
  _modalShown = event =>
  {
    this.$modal.find('#user-name').focus();
  }
  _modalHide = event =>
  {
    this.$camNumber.removeClass('is-invalid');
    this.$channelName.removeClass('is-invalid');
    this.$btn.off('click');
  }
  _btnEditClick = event =>
  {
    let newData = {username: this._user.username};
    newData.name = this.$name.val();
    newData.camNumber = this.$camNumber.val();
    newData.channelName = this.$channelName.val();

    this.socket.emit('admin.set.user', newData, this._userSetCallback);
  }
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