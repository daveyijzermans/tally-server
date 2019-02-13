import jQuery from 'jquery';
import md5 from 'js-md5';
import Cookies from 'js-cookie';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import 'bootstrap';

jQuery($ =>
{
  let socket = null,
      servers = null,
      tallies = null;
  const $servers = $('#servers'),
        $tplServer = $('#tplServer'),
        $tallies = $('#tallies'),
        $tplTally = $('#tplTally'),
        $users = $('#users'),
        $btnUsersPopout = $('#usersPopout'),
        $tplUser = $('#tplUser'),
        $plugs = $('#plugs'),
        $tplPlug = $('#tplPlug'),
        $log = $('#log'),
        $avSources = $('.avSource'),
        $avTargets = $('.avTarget'),
        $loginModal = $('#loginModal'),
        $txtPassword = $loginModal.find('#txtPassword'),
        $frmLogin = $loginModal.find('form'),
        $btnLogin = $loginModal.find('#btnLogin'),
        $actionModal = $('#actionModal'),
        $btnActionModal = $actionModal.find('.btn-danger'),
        $editUserModal = $('#editUserModal');

  const animatePuff = (els, removeEl) =>
  {
    $(els).each(i =>
    {
      let $el = $(this),
          bgTop = 0,
          frame = 0,
          frames = 6,
          frameSize = 32,
          frameRate = 80,
          pos = $el.offset(),
          left = pos.left + $el.outerWidth() / 2 - frameSize / 2,
          top = pos.top + $el.outerHeight() / 2 - frameSize / 2,
          $puff = $('<div class="puff"></div>').css({
            left: left,
            top: top
          }).appendTo('body');
      if(removeEl) $el.remove();

      let a = () =>
      {
        if(frame < frames)
        {
          $puff.css({
            backgroundPosition: '0 ' + bgTop + 'px'
          });
          bgTop = bgTop - frameSize;
          frame++;
          setTimeout(a, frameRate);
        }
      };
      a();
      setTimeout(() => { $puff.remove(); }, frames * frameRate);
    });
  };

  const talkingIndicator = (el) =>
  {          
    let $circle = $('<div class="talking-indicator"></div>')
      .appendTo(el);
      
    setTimeout(() => $circle.addClass('zoom'), 10);
    setTimeout(() => $circle.remove(), 2010);
  };

  let connect = (p, cb) =>
  {
    socket = io({
      query: {
        password: p
      }
    });
    socket.on('authenticated', () =>
    {
      cb(null, p);

      $('#serverStatus').html('<i class="fas fa-check-circle"></i> Connected');
      socket.emit('admin.update');
    });
    
    socket.on('admin.status.servers', data =>
    {
      if(JSON.stringify(data) === JSON.stringify(servers))
        return false;
      servers = data;
      $servers.find('.noresults').toggle(servers.length == 0);

      $.each(servers, (id, server) =>
      {
        let $tr = $servers.find('[data-name="' + server.name + '"]');
        if($tr.length == 0)
        {
          $tr = $tplServer.clone().attr('id', '').attr('data-name', server.name).show().appendTo($servers);

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
    socket.on('admin.status.tallies', data =>
    {
      if(JSON.stringify(data) === JSON.stringify(tallies))
        return false;
      tallies = data;
      let max = tallies._combined.length;
      let states = ['badge-secondary', 'badge-danger', 'badge-success'];

      $tallies.empty();
      $.each(tallies, (host, result) =>
      {
        let $t = $tplTally.clone().attr('id', '').attr('data-host', host).show().appendTo($tallies);
        let name = host == '_combined' ? 'Combined result' : host;
        let $a = $t.find('b').text(name);

        let $indicators = $t.find('.tally-indicators');
        for (let i = 0; i < max; i++)
        {
          let state = typeof result == 'string' ? states[result[i]] : states[0];
          let $s = $('<span class="badge badge-pill"></span>')
            .text(i + 1)
            .addClass(state)
            .appendTo($indicators);
        }
      });

      let hostsOnline = $tallies.find('.tally-entry').length > 1;
      $tallies.siblings('.noresults').toggle(!hostsOnline);
      $tallies.find('.tally-entry').toggle(hostsOnline);
      updateUserTallies(tallies._combined);
    });
    socket.on('admin.user.disconnect', username =>
    {
      let $user = $users.find('[data-username="' + username + '"]');
      animatePuff($user, true);
      $users.find('.noresults').toggle($users.find('.user-entry').length == 0);
    });
    socket.on('admin.users.list', users =>
    {
      $users.find('.noresults').toggle(users.length == 0);

      $.each(users, (id, user) =>
      {
        let $u = $users.find('[data-username="' + user.username + '"]');
        let $dropdown = $u.find('.dropdown-menu');
        if($u.length == 0)
        {
          $u = $tplUser.clone().attr('id', '').attr('data-username', user.username).show().appendTo($users);
          $dropdown = $u.find('.dropdown-menu');
          $dropdown.attr('aria-labelledby', user.username);
          $('<a class="dropdown-item edit-user-modal" href="#" data-toggle="modal" data-target="#editUserModal">Edit</a>')
              .appendTo($dropdown);
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="reboot">Reboot</a>')
              .attr('data-param', user.username)
              .appendTo($dropdown);
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="shutdown">Shutdown</a>')
              .attr('data-param', user.username)
              .appendTo($dropdown);
        }

        if(user.talking)
        {
          if(!$u.data('talkingTimer'))
          {
            let to = () =>
            {
              talkingIndicator($u);
              $u.data('talkingTimer', setTimeout(to, 500));
            };
            to();
          }
        } else {
          clearTimeout($u.data('talkingTimer'));
          $u.data('talkingTimer', null);
        }

        $u.toggleClass('user-talking', user.talking);
        $u.attr('data-camnumber', user.camNumber);
        $u.find('.name').text(user.name);
        $u.find('.username').text(user.username);
        $u.find('.camNumber').text(user.camNumber);
        $dropdown.find('.edit-user-modal').data('user', user);
      });
      updateUserTallies(tallies._combined);
    });
    $btnUsersPopout.click(event =>
    {
      window.open('/users_popout.html', 'users_popout', 'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=350,height=500');
      event.preventDefault();
    });
    socket.on('admin.plugs.list', plugs =>
    {
      $plugs.find('.noresults').toggle(plugs.length == 0);

      $.each(plugs, (id, plug) =>
      {
        let $p = $plugs.find('[data-hostname="' + plug.hostname + '"]');
        if($p.length == 0)
        {
          $p = $tplPlug.clone().attr('id', '').attr('data-hostname', plug.hostname).show().appendTo($plugs);
          $p.find('a.toggle').click(event =>
          {
            $(this).find('.fas')
              .removeClass('text-success text-danger fa-power-off')
              .addClass('fa-circle-notch fa-spin');
            socket.emit('admin.plug.toggle', plug.hostname);
            event.preventDefault();
          });
        }

        $p.find('.name').text(plug.name);
        $p.find('.description').text(plug.description);
        $p.find('.actions .fas')
          .removeClass('fa-circle-notch fa-spin')
          .addClass('fa-power-off')
          .toggleClass('text-success', plug.on == true)
          .toggleClass('text-danger', plug.on == false);
      });
    });
    socket.on('admin.plugs.disconnect', hostname =>
    {
      let $plug = $plugs.find('[data-hostname="' + hostname + '"]');
      animatePuff($plug, true);
      $plugs.find('.noresults').toggle($plugs.find('.plug-entry').length == 0);
    });
    socket.on('admin.log', msg =>
    {
      let $dropdown = $log.find('.dropdown-menu')
        .prepend($('<p class="text-sm"></p>').text(msg));
      $log.find('a').dropdown('update');
      let $badge = $log.find('.badge');
      if($dropdown.is(':hidden'))
        $badge.text((parseInt($badge.text(), 10)||0)+1);
      $log.find('.dropdown-menu p:gt(99)').remove();
      $log.find('.dropdown-menu p:gt(29).read').remove();
    });
    $log.on('show.bs.dropdown', event =>
    {
      $(event.relatedTarget).dropdown('update');
      let $badge = $log.find('.badge').text('');
      $log.find('.dropdown-menu p:gt(29).read').remove();
    });
    $log.on('shown.bs.dropdown', event =>
    {
      $(event.relatedTarget).dropdown('update');
    });
    $log.on('hide.bs.dropdown', () =>
    {
      $log.find('.dropdown-menu p:gt(29).read').remove();
      $log.find('.dropdown-menu p').addClass('read');
    });
    socket.on('disconnect', () =>
    {
      animatePuff($plugs.find('.plug-entry'), true);
      $plugs.find('.noresults').toggle(true);

      $('#serverStatus').html('<i class="fas fa-times-circle fa-beat"></i> Disconnected');
      cb(new Error('Could not connect to socket'));
    });
  };

  const updateUserTallies = tallies =>
  {
    let t = tallies.split('');
    $users.find('.user-entry').each(i =>
    {
      let $this = $(this);
      let n = $this.attr('data-camnumber');
      let val = t[n - 1];
      $this.find('.avatar')
        .toggleClass('avatar-danger', val == '1')
        .toggleClass('avatar-success', val == '2')
        .toggleClass('avatar-secondary', val == '0');
    });
  };

  $avSources.draggable({
    cursor: 'move',
    revert: true
  });
  $avTargets.droppable({
    drop: function(event, ui)
    {
      let $target = $(this);
      let $source = ui.draggable;
      console.log($source, $target);
    }
  });

  const loginCallback = (err, p) =>
  {
    if(err)
    {
      $txtPassword.addClass('is-invalid');
      if($loginModal.hasClass('show'))
      {
        $loginModal.trigger('shown.bs.modal');
      }
      else
      {
        $loginModal.modal('show');
      }
      return false;
    }
    if($('#chkRemember').is(':checked'))
      Cookies.set('adminPass', p, { expires: 7 });
    $loginModal.modal('hide');
  };

  // Button event handlers
  const loginHandler = event =>
  {
    $frmLogin.off('submit', loginHandler);
    $btnLogin.off('click', loginHandler);
    let p = md5($txtPassword.val());
    connect(p, loginCallback);
    event.preventDefault();
  };

  // Bind handlers to buttons and events
  $loginModal.on('shown.bs.modal', () =>
  {
    $txtPassword.focus().select();
    $frmLogin.one('submit', loginHandler);
    $btnLogin.one('click', loginHandler);
  }).on('hidden.bs.modal', () =>
  {
    $loginModal.modal('dispose');
  });

  let storedPassword = Cookies.get('adminPass');
  if(storedPassword)
  {
    connect(storedPassword, loginCallback);
  } else {
    $loginModal.modal();
  }

  $actionModal.on('show.bs.modal', (event) =>
  {
    let rel = $(event.relatedTarget);
    let cmd = rel.data('command');
    let param = rel.data('param');
    let $t = $actionModal.find('.modal-body');

    switch(cmd)
    {
      case 'restart':
        $t.text('Are you sure you want to restart the administration server?');
        break;
      case 'reboot':
        $t.text('Are you sure you want to reboot ' + param + '?');
        break;
      case 'shutdown':
        $t.text('Are you sure you want to shutdown ' + param + '? You will need to use Wake-On-LAN or power cycle to get it back online.');
        break;
      case 'wake':
        $t.text('Are you sure you want to wake-up ' + param + '?');
        break;
      case 'rebootUsers':
        $t.text('Are you sure you want to reboot all intercom users? Clients will disconnect and will take approximately 30 seconds to get back online.');
        break;
      case 'updateUsers':
        $t.text('Are you sure you want to update all intercom users? Clients will disconnect and will take approximately 1 minute to get back online.');
        break;
      case 'shutdownUsers':
        $t.text('Are you sure you want to shutdown the server? You will need to use Wake-On-LAN or power cycle the PoE switch to get them back online.');
        break;
      case 'shutdownAll':
        $t.text('Are you sure you want to shutdown everything? You will need to use Wake-On-LAN or power cycle to get everything back online.');
        break;
      case 'logout':
        $t.text('Are you sure you want to logout of the administration page?');
        break;
      default:
        console.error('Invalid command');
        return false;
    }

    $btnActionModal.focus().off('click').one('click', () =>
    {
      if(cmd == 'logout')
      {
        Cookies.remove('adminPass');
      }
      socket.emit('admin.' + cmd, param);
      $actionModal.modal('hide');
    });
  }).on('shown.bs.modal', () =>
  {
    $btnActionModal.focus();
  }).on('hide.bs.modal', () =>
  {
    $btnActionModal.off('click');
  });
  $editUserModal.on('show.bs.modal', event =>
  {
    let rel = $(event.relatedTarget);
    let user = rel.data('user');
    let $name = $editUserModal.find('#user-name').focus().val(user.name);
    let $camNumber = $editUserModal.find('#user-camnumber').val(user.camNumber);

    let $btn = $editUserModal.find('.btn-primary').off('click');
    $btn.on('click', () =>
    {
      let newData = {username: user.username};
      newData.name = $name.val();
      newData.camNumber = $camNumber.val();

      socket.emit('admin.set.user', newData, (err) =>
        {
          if (err)
          {
            $camNumber.addClass('is-invalid');
            return err;
          }
          $editUserModal.modal('hide');
        });
    });
  }).on('shown.bs.modal', () =>
  {
    $editUserModal.find('#user-name').focus();
  }).on('hide.bs.modal', () =>
  {
    $(this).find('#user-camnumber').removeClass('is-invalid');
    $(this).find('.btn-primary').off('click');
  });
});