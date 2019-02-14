import $ from 'jquery';

let servers = null;

class Servers
{
  constructor(opts)
  {
    Object.assign(this, opts);

    this.socket.on('admin.status.servers', data =>
    {
      if(JSON.stringify(data) === JSON.stringify(servers))
        return false;
      servers = data;
      this.$list.find('.noresults').toggle(servers.length == 0);

      $.each(servers, (id, server) =>
      {
        let $tr = this.$list.find('[data-name="' + server.name + '"]');
        if($tr.length == 0)
        {
          $tr = this.$tpl.clone().attr('id', '').attr('data-name', server.name).show().appendTo(this.$list);

          let wol = typeof server.wol == 'string';
          let $actions = $tr.find('.actions');
          let $dropdown = $actions.find('.dropdown-menu');
          if(wol || server.type == 'netgear')
          {
            $actions.append('<a href="#" class="icon text-black-25" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fas fa-cog"></i></a>');
          }
          if(wol)
          {
            $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="wake">Wake</a>')
              .attr('data-param', server.name)
              .appendTo($dropdown);
          }
          if(wol || server.type == 'netgear')
          {
            $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="reboot">Reboot</a>')
              .attr('data-param', server.name)
              .appendTo($dropdown);
          }
          if(wol)
          {
            $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="shutdown">Shutdown</a>')
              .attr('data-param', server.name)
              .appendTo($dropdown);
          }
        }
        let sClass = server.connected ? 'bg-success' : 'bg-danger';
        let $name = $tr.find('.name').text(server.name);
        let $type = $tr.find('.type').text(server.type);
        let $hostname = $tr.find('.hostname').text(server.hostname);
        $tr.find('.status-icon')
          .toggleClass('bg-success', server.connected == true)
          .toggleClass('bg-danger', server.connected == false);
        $tr.find('.status-text')
          .text(server.connected ? 'Connected' : 'Disconnected');
      });
    });
  }
}

export default Servers;