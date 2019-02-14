import $ from 'jquery';
import 'bootstrap';

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
  }
  _modalShow = event =>
  {
    let rel = $(event.relatedTarget);
    let user = rel.data('user');
    this.$name.focus().val(user.name);
    this.$camNumber.val(user.camNumber);
    this.$channelName.val(user.channelName);

    this.$btn.off('click');
    this.$btn.on('click', () =>
    {
      let newData = {username: user.username};
      newData.name = this.$name.val();
      newData.camNumber = this.$camNumber.val();
      newData.channelName = this.$channelName.val();


      this.socket.emit('admin.set.user', newData, (result) =>
        {
          if (result.errors == true)
          {
            console.log(result.camNumber);
            this.$camNumber.toggleClass('is-invalid', result.camNumber);
            this.$channelName.toggleClass('is-invalid', result.channelName);
            return;
          }
          this.$modal.modal('hide');
        });
    });
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
}

export default EditUserModal;