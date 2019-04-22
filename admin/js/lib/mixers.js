import $ from 'jquery';
import 'jquery-ui/ui/effect';
import 'jquery-ui/ui/widgets/slider';
import 'jquery-ui-touch-punch';

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
      if(!mixer.connected) return $tr.remove();

      let isLinked = () => typeof this._mixers[id].linked == 'object';
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').addClass('mixer-entry')
          .attr('data-name', mixer.name).show().appendTo(this.$list);

        let $dropdown = $tr.find('.dropdown-menu');
        $dropdown.find('.dropdown-item.unlink').attr('data-param', mixer.name);
        if(mixer.type == 'vmix')
        {
          $tr.find('.buttons-vmix').show();
          $tr.find('.btn-fullscreen')
            .toggleClass('btn-primary', mixer.fullscreen)
            .toggleClass('btn-secondary', !mixer.fullscreen);
          $tr.find('.btn-external')
            .toggleClass('btn-primary', mixer.external)
            .toggleClass('btn-secondary', !mixer.external);
          $tr.find('.btn-record')
            .toggleClass('btn-primary', mixer.recording)
            .toggleClass('btn-secondary', !mixer.recording);
          $tr.find('.btn-stream')
            .toggleClass('btn-primary', mixer.streaming)
            .toggleClass('btn-secondary', !mixer.streaming);
        }
        let $transitions = $tr.find('.transition-select');
        let $duration = $tr.find('.transition-duration');
        let $btnCut = $tr.find('.btnCut');
        let $btnAuto = $tr.find('.btnAuto');
        let $spanPrg = $btnAuto.find('span.progress');
        let $tbar = $tr.find('.tbar');
        let $handle = $tbar.find('.tbar-handle');
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
          let duration = parseInt($duration.val());
          this.socket.emit('admin.mixer.command', mixer.name, 'transition', [duration, $transitions.val()]);
          $spanPrg.stop(true, true)
            .animate({
              width: '100%',
              backgroundColor: '#ff0000'
            }, duration, 'linear', () =>
              {
                $spanPrg.css({
                  width: '0%',
                  backgroundColor: ''
                });
                $tbar.slider('value', 0);
              });
          event.preventDefault();
        });
        /*
         * Bind tbar
         */
        $tbar.slider({
          min: 0,
          max: 254,
          create: () =>
          {
            $handle.text($tbar.slider('value'));
          },
          change: (event, ui) =>
          {
            $handle.text(ui.value);
            let hue = ((1-ui.value/254)*120).toString(10);
            let bg = ui.value == 0 ? '' : 'hsl(' + hue + ', 100%, 50%)';
            
            $handle.css({background: bg});
            $spanPrg.stop(true, true)
              .css({
                width: Math.ceil(ui.value / 254 * 100) + '%',
                background: bg
              })
          },
          slide: (event, ui) =>
          {
            this.socket.emit('admin.mixer.command', mixer.name, 'fade', [ui.value, $transitions.val()]);

            let hue = ((1-ui.value/254)*120).toString(10);
            let bg = 'hsl(' + hue + ', 100%, 50%)';

            $handle.text(ui.value)
              .css({background: bg});
            $spanPrg.stop(true, true)
              .css({
                width: Math.ceil(ui.value / 254 * 100) + '%',
                background: bg
              })
          },
          stop: (event, ui) =>
          {
            if(ui.value >= 254)
            {
              this.socket.emit('admin.mixer.command', mixer.name, 'fade', [255, $transitions.val()]);
              $tbar.slider('value', 0);
            }
          }
        });

        $.each(mixer.effects, (name, effect) =>
        {
          $transitions.append($('<option></option>', {
            value: name,
            text: name
          }));
        });
        $transitions.on('change', (event) =>
        {
          this.socket.emit('admin.mixer.command', mixer.name, 'setTransition', [$transitions.val()]);
        });
        $duration.on('change', (event) =>
        {
          this.socket.emit('admin.mixer.command', mixer.name, 'setDuration', [1, $duration.val()]);
        });
      }

      let $transitions = $tr.find('.transition-select')
      $transitions
        .prop('disabled', isLinked())
        .val(mixer.transition);
      let $duration = $tr.find('.transition-duration');
      $duration
        .prop('disabled', isLinked())
        .val(mixer.autoDuration);
      let $dropdown = $tr.find('.dropdown-menu');
      let $linkedItem = $dropdown.find('.dropdown-item.linked');
      let $noresultsItem = $dropdown.find('.dropdown-item.noresults');
      $dropdown.find('.dropdown-item.other').remove();
      if(isLinked())
      {
        $noresultsItem.addClass('d-none');
        $linkedItem.find('span').text(mixer.linked.name);
      } else {
        $.each(this._mixers, (i, other) =>
        {
          if(other.name == mixer.name) return; /* Don't link to self */
          if(!other.connected) return; /* Exclude if the other mixer isn't connected */

          /* Don't allow link if other is linked is to self */
          if(typeof other.linked == 'object' && other.linked.name == mixer.name) return;

          $('<a></a>', {
            text: 'Link with ' + other.name,
            class: 'dropdown-item other',
            href: '#',
            'data-toggle': 'modal',
            'data-target': '#actionModal',
            'data-command': 'mixer.link',
            'data-name': other.name
          }).data('param', {
              master: other.name,
              slave: mixer.name
            }).appendTo($dropdown);
        });
        $noresultsItem.toggleClass('d-none', $dropdown.find('.dropdown-item.other').length > 0);
      }
      $linkedItem.toggleClass('d-none', !isLinked());
      $tr
        .toggleClass('mixer-linked', isLinked())
        .find('.linkToggle .fas')
          .toggleClass('fa-link', isLinked())
          .toggleClass('fa-unlink', !isLinked());
      let $tbar = $tr.find('.tbar');
      $tbar.slider('option', 'disabled', isLinked());
      
      let $name = $tr.find('.name').text(mixer.name);
      $tr.find('.previewBus, .programBus').find('.btn').remove();
      let $prv = $tr.find('.previewBus');
      let $pgm = $tr.find('.programBus');

      for (let i = 1; i < mixer.tallies.length; i++)
      {
        /*
         * Populate the preview bus row
         */
        let prvClass = i == mixer.preview ? states[2] : states[0];
        let $prvBtn = $('<button class="btn btn-lg m-1"></button>')
          .text(i)
          .addClass(prvClass)
          .appendTo($prv)
          .one('click', (event) =>
          {
            if(isLinked()) return;
            this.socket.emit('admin.mixer.command', mixer.name, 'switchInput', [i, 2]);
            event.preventDefault();
          });

        /*
         * Populate the program bus row
         */
        let pgmClass = i == mixer.program ? states[1] : states[0];
        let $pgmBtn = $('<button class="btn btn-lg m-1"></button>')
          .text(i)
          .addClass(pgmClass)
          .appendTo($pgm)
          .one('click', (event) =>
          {
            if(isLinked()) return;
            this.socket.emit('admin.mixer.command', mixer.name, 'switchInput', [i, 1]);
            event.preventDefault();
          });
      }
    });
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.mixer-entry') }
}

export default Mixers;