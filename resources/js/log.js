import $ from 'jquery';

class Log
{
  constructor(opts)
  {
    Object.assign(this, opts);

    this.socket.on('admin.log', msg =>
    {
      let $dropdown = this.$list.find('.dropdown-menu')
        .prepend($('<p class="text-sm"></p>').text(msg));
      this.$list.find('a').dropdown('update');
      let $badge = this.$list.find('.badge');
      if($dropdown.is(':hidden'))
        $badge.text((parseInt($badge.text(), 10)||0)+1);
      this.$list.find('.dropdown-menu p:gt(99)').remove();
      this.$list.find('.dropdown-menu p:gt(29).read').remove();
    });

    this.$list.on('show.bs.dropdown', event =>
    {
      $(event.relatedTarget).dropdown('update');
      let $badge = this.$list.find('.badge').text('');
      this.$list.find('.dropdown-menu p:gt(29).read').remove();
    });
    this.$list.on('shown.bs.dropdown', event =>
    {
      $(event.relatedTarget).dropdown('update');
    });
    this.$list.on('hide.bs.dropdown', () =>
    {
      this.$list.find('.dropdown-menu p:gt(29).read').remove();
      this.$list.find('.dropdown-menu p').addClass('read');
    });
  }
}

export default Log;