$(function()
{
  var socket = null,
      servers = null,
      $servers = $('#servers'),
      tallies = null,
      $tallies = $('#tallies'),
      $users = $('#users');

  var animatePuff = function(el, removeEl)
  {
    var $el = $(el);
    var bgTop = 0,
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

    var a = function()
    {
      if(frame < frames)
      {
        $puff.css({
          backgroundPosition: "0 "+bgTop+"px"
        });
        bgTop = bgTop - frameSize;
        frame++;
        setTimeout(a, frameRate);
      }
    };
    a();
    // setTimeout(function() { $puff.remove() }, frames * frameRate);
  }

  var connect = function(p, cb) {
    socket = io({
      query: {
        password: p
      }
    });
    socket.on('authenticated', function()
    {
      cb(null);

      $('#serverStatus').html('<i class="fas fa-check-circle"></i> Connected');
      socket.emit('admin.update');
    });
    socket.on('admin.status.servers', function(data)
    {
      if(JSON.stringify(data) === JSON.stringify(servers))
        return false;
      servers = data;
      $servers.find('.noresults').toggle(servers.length == 0);

      var $tpl = $('#tplServer');
      $.each(servers, function(id, server)
      {
        var $tr = $servers.find('[data-name="' + server.name + '"]')
        if($tr.length == 0)
        {
          $tr = $tpl.clone().attr('id', '').attr('data-name', server.name).show().appendTo($servers);

          var wol = typeof server.wol == 'string';
          if(wol || server.type == 'netgear')
          {
            var $actions = $tr.find('.actions').append('<a href="#" class="icon text-black-25" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><i class="fas fa-cog"></i></a>');
            var $dropdown = $actions.find('.dropdown-menu');
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
        var sClass = server.connected ? 'bg-success' : 'bg-danger';
        var $name = $tr.find('.name').text(server.name);
        var $type = $tr.find('.type').text(server.type);
        var $hostname = $tr.find('.hostname').text(server.hostname);
        $tr.find('.status-icon')
          .toggleClass('bg-success', server.connected == true)
          .toggleClass('bg-danger', server.connected == false);
        $tr.find('.status-text')
          .text(server.connected ? 'Connected' : 'Disconnected');
      });
    });
    socket.on('admin.status.tallies', function(data)
    {
      if(JSON.stringify(data) === JSON.stringify(tallies))
        return false;
      tallies = data;
      var max = tallies['_combined'].length;
      var states = ['badge-secondary', 'badge-danger', 'badge-success'];

      var $tpl = $('#tplTally');
      $.each(tallies, function(host, result)
      {
        var $t = $tallies.find('[data-host="' + host + '"]');
        if($t.length == 0)
        {
          $t = $tpl.clone().attr('id', '').attr('data-host', host).show().appendTo($tallies);
        }
        var name = host == '_combined' ? 'Combined result' : host;
        var $a = $t.find('b').text(name);

        $indicators = $t.find('.tally-indicators').empty();
        for (var i = 0; i < max; i++)
        {
          var state = typeof result == 'string' ? states[result[i]] : states[0];
          var $s = $('<span class="badge badge-pill"></span>')
            .text(i + 1)
            .addClass(state)
            .appendTo($indicators);
        }
      });
      updateUserTallies(tallies._combined);
    });
    socket.on('admin.user.disconnect', function(username)
    {
      var $user = $users.find('[data-username="' + username + '"]');
      animatePuff($user, true);
      $users.find('.noresults').toggle($users.find('.user-panel').length == 0);
    });
    socket.on('admin.users.list', function(users)
    {
      $users.find('.noresults').toggle(users.length == 0);

      var $tpl = $('#tplUser');
      $.each(users, function(id, user)
      {
        var $u = $users.find('[data-username="' + user.username + '"]')
        if($u.length == 0)
        {
          $u = $tpl.clone().attr('id', '').attr('data-username', user.username).show().appendTo($users);
          var $dropdown = $u.find('.dropdown-menu').attr('aria-labelledby', user.username);
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#editUserModal">Edit</a>')
              .data('user', user)
              .appendTo($dropdown);
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="reboot">Reboot</a>')
              .attr('data-param', user.username)
              .appendTo($dropdown);
          $('<a class="dropdown-item" href="#" data-toggle="modal" data-target="#actionModal" data-command="shutdown">Shutdown</a>')
              .attr('data-param', user.username)
              .appendTo($dropdown);
        }

        $u.attr('data-camnumber', user.camNumber);
        $u.find('.name').text(user.name);
        $u.find('.username').text(user.username);
        $u.find('.camNumber').text(user.camNumber);
      });
      updateUserTallies(tallies._combined);
    });
    var $plugs = $('#plugs');
    socket.on('admin.status.plugs', function(plug)
    {
      var $tpl = $('#tplPlug');
      var $p = $plugs.find('[data-host="' + plug.host + '"]');
      if($p.length == 0)
      {
        $p = $tpl.clone().attr('id', '').attr('data-host', plug.host).show().appendTo($plugs);
      }

      $p.find('.name').text(plug.name);
      $p.find('.description').text(plug.description);
      $p.find('.fas').toggleClass('text-success', plug.on == true);
      $p.find('.fas').toggleClass('text-danger', plug.on == false);
    });
    socket.on('disconnect', function()
    {
      $('#serverStatus').html('<i class="fas fa-times-circle fa-beat"></i> Disconnected');
      cb(new Error('Could not connect to socket'));
    });
  }

  updateUserTallies = function(t)
  {
    var t = t.split('');
    for (var i = 0; i < t.length; i++) {
      var val = t[i];
      $users.find('[data-camnumber="' + (i + 1) + '"] .avatar')
        .toggleClass('avatar-danger', val == '1')
        .toggleClass('avatar-success', val == '2')
        .toggleClass('avatar-secondary', val == '0');
    }
  }

  var loginCallback = function(err)
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
    $loginModal.modal('hide');
  }

  // Button event handlers
  var loginHandler = function(event)
  {
    $frmLogin.off('submit', loginHandler);
    $btnLogin.off('click', loginHandler);
    var p = $.md5($txtPassword.val());
    connect(p, loginCallback);
    event.preventDefault();
  };

  // Bind handlers to buttons and events
  var $loginModal = $('#loginModal').on('shown.bs.modal', function ()
  {
    $txtPassword.focus().select();
    $frmLogin.one('submit', loginHandler);
    $btnLogin.one('click', loginHandler);
  }).on('hidden.bs.modal', function ()
  {
    $loginModal.modal('dispose');
  });
  var $txtPassword = $loginModal.find('#txtPassword');
  var $frmLogin = $loginModal.find('form');
  var $btnLogin = $loginModal.find('#btnLogin');

  var urlHash = location.hash.match(new RegExp('password=([^&]*)'));
  if(urlHash)
  {
    var p = $.md5(urlHash[1]);
    connect(p, loginCallback);
  }
  else
    $loginModal.modal();
  var $actionModal = $('#actionModal').on('show.bs.modal', function(event)
  {
    var rel = $(event.relatedTarget);
    var cmd = rel.data('command');
    var param = rel.data('param');
    var $t = $actionModal.find('.modal-body');
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
      default:
        console.error('Invalid command');
        return false;
    }

    var $btn = $(this).find('.btn-danger').focus().off('click').one('click', function()
    {
      socket.emit('admin.' + cmd, param);
      $actionModal.modal('hide');
    });
  }).on('shown.bs.modal', function()
  {
    $(this).find('.btn-danger').focus()
  }).on('hide.bs.modal', function()
  {
    $(this).find('.btn-danger').off('click');
  });
  var $editUserModal = $('#editUserModal').on('show.bs.modal', function(event)
  {
    var rel = $(event.relatedTarget);
    var user = rel.data('user');
    var $name = $editUserModal.find('#user-name').focus().val(user.name);
    var $camNumber = $editUserModal.find('#user-camnumber').val(user.camNumber);

    var $btn = $(this).find('.btn-primary').off('click');
    $btn.on('click', function()
    {
      socket.emit('admin.set.user', {
        username: user.username,
        name: $name.val(),
        camNumber: $camNumber.val()
      }, (err) =>
        {
          if (err)
          {
            $camNumber.addClass('is-invalid');
            return err;
          }
          $editUserModal.modal('hide');
        });
    });
  }).on('shown.bs.modal', function()
  {
    $editUserModal.find('#user-name').focus()
  }).on('hide.bs.modal', function()
  {
    $(this).find('#user-camnumber').removeClass('is-invalid');
    $(this).find('.btn-primary').off('click');
  });
});