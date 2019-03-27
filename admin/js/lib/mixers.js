import $ from 'jquery';

/**
 * Class for Mixers UI.
 *
 * @memberof   Frontend.UI
 */
class Mixers
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
    this.socket = opts.socket
      .on('admin.status.mixers', this._list);
    /**
     * Main container for this UI element
     * 
     * @type       {jQuery}
     */
    this.$list = opts.$list;
    /**
     * Template for an entry for this UI element. Will be cloned to make a new
     * entry and appended to $list
     *
     * @type       {jQuery}
     */
    this.$tpl = opts.$tpl;
    /**
     * Cached array of mixers objects sent by server
     *
     * @type       {Object[]}
     */
    this._mixers = null;
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Mixers#_list
   *
   * @param      {Object[]}  data    Array of mixers
   * @param      {string}          data.type       The mixer type
   * @param      {string}          data.hostname   The mixer hostname
   * @param      {string}          data.name       The mixer display name
   * @param      {string|boolean}  data.wol        WOL address
   * @param      {boolean}         data.connected  Connection status
   * @listens    Socket#event:"admin.status.mixers"
   * @fires      Socket#event:"admin.mixer.command"
   */
  _list = data =>
  {
    if(JSON.stringify(data) === JSON.stringify(this._mixers))
      return false;
    this._mixers = data;
    let connected = data.filter((s) => s.connected);
    this.$list.find('.content-header .noresults').toggle(connected.length == 0);

    const states = ['btn-secondary', 'btn-danger', 'btn-success'];
    $.each(this._mixers, (id, mixer) =>
    {
      let $tr = this.$list.find('.mixer-entry[data-name="' + mixer.name + '"]');
      if(!mixer.connected)
        return $tr.remove();
      let isLinked = () => typeof this._mixers[id].linked == 'object';
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').addClass('mixer-entry')
          .attr('data-name', mixer.name).show().appendTo(this.$list);

        let $dropdown = $tr.find('.dropdown-menu');
        $dropdown.find('.dropdown-item.unlink').attr('data-param', mixer.name);
        let $btnCut = $tr.find('.btnCut');
        let $btnAuto = $tr.find('.btnAuto');
        let $spanPrg = $btnAuto.find('span.progress');
        /*
         * Bind cut button
         */
        $btnCut.click((event) =>
        {
          if(isLinked()) return;
          this.socket.emit('admin.mixer.command', mixer.name, 'cut');
          $spanPrg.stop(true, true);
          event.preventDefault();
        });
        /*
         * Bind auto button
         */
        $btnAuto.click((event) =>
        {
          if(isLinked()) return;
          let duration = 2000;
          this.socket.emit('admin.mixer.command', mixer.name, 'transition', [duration]);
          $spanPrg.stop(true, true)
            .animate({width: '100%'}, duration, 'linear', () =>
              {
                $spanPrg.css({width: '0%'});
              });
          event.preventDefault();
        });
      }

      let $dropdown = $tr.find('.dropdown-menu');
      let $linkedItem = $dropdown.find('.dropdown-item.linked');
      if(isLinked())
      {
        $dropdown.find('.dropdown-item.other').remove();
        $dropdown.find('.dropdown-item.noresults').hide();
        $linkedItem.find('span').text(mixer.linked.name);
      } else {
        $.each(this._mixers, (i, other) =>
        {
          if(other.name == mixer.name) return;
          if(!other.connected) return $dropdown.find('.dropdown-item[data-name="' + other.name +'"]').remove();
          if(typeof other.linked == 'object') return;

          let $item = $dropdown.find('.dropdown-item[data-name="' + other.name +'"]');
          if($item.length == 0)
          {
            $item = $('<a class="dropdown-item other" href="#" data-toggle="modal" data-target="#actionModal" data-command="mixer.link"></a>')
              .text('Link with ' + other.name)
              .attr('data-name', other.name)
              .data('param', {
                master: other.name,
                slave: mixer.name
              })
              .appendTo($dropdown);
          }
        });
        $dropdown.find('.dropdown-item.noresults').toggle($dropdown.find('.dropdown-item.other').length == 0);
      }
      $linkedItem.toggle(isLinked());
      $tr.find('.linkToggle .fas')
        .toggleClass('fa-link', isLinked())
        .toggleClass('fa-unlink', !isLinked());
      $tr.toggleClass('mixer-linked', isLinked());
      
      let $name = $tr.find('.name').text(mixer.name);
      $tr.find('.previewBus, .programBus').find('.btn').remove();
      let $prv = $tr.find('.previewBus');
      let $pgm = $tr.find('.programBus');

      /*
       * If there are not inputs on preview, then the input that's on program is
       * also on preview. Find that input and make it's preview bus button
       * green.
       */
      let forcePrv = false;
      if(mixer.tallies.indexOf(2) == -1)
        forcePrv = mixer.tallies.indexOf(1);

      for (let i = 0; i < mixer.tallies.length; i++)
      {
        /*
         * Populate the preview bus row
         */
        let prvClass = mixer.tallies[i] == 2 || forcePrv === i ? states[2] : states[0];
        let $prvBtn = $('<button class="btn btn-lg m-1"></button>')
          .text(i + 1)
          .addClass(prvClass)
          .appendTo($prv)
          .one('click', (event) =>
          {
            if(isLinked()) return;
            this.socket.emit('admin.mixer.command', mixer.name, 'switchInput', [i + 1, 2]);
            event.preventDefault();
          });

        /*
         * Populate the program bus row
         */
        let pgmClass = mixer.tallies[i] == 1 ? states[1] : states[0];
        let $pgmBtn = $('<button class="btn btn-lg m-1"></button>')
          .text(i + 1)
          .addClass(pgmClass)
          .appendTo($pgm)
          .one('click', (event) =>
          {
            if(isLinked()) return;
            this.socket.emit('admin.mixer.command', mixer.name, 'switchInput', [i + 1, 1]);
            event.preventDefault();
          });
      }
    });
  }
  /**
   * All items in the list
   *
   * @return     {jQuery}
   */
  get $items() { return this.$list.find('.mixer-entry') }
}

export default Mixers;