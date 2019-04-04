import $ from 'jquery';
import 'jquery-ui/ui/effect';
import 'jquery-ui/ui/widgets/slider';
import 'jquery-ui-touch-punch';

/**
 * Class for Routers UI.
 *
 * @memberof   Frontend.UI
 */
class Routers
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
      .on('admin.status.routers', this._list);
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
     * Cached array of routers objects sent by server
     *
     * @type       {Object[]}
     */
    this._routers = null;
  }
  /**
   * Executed when the server emits a list. Loop over them and add or update the
   * list elements to match
   *
   * @method     Frontend.UI.Routers#_list
   *
   * @param      {Object[]}  data    Array of routers
   * @param      {string}          data.type       The router type
   * @param      {string}          data.hostname   The router hostname
   * @param      {string}          data.name       The router display name
   * @param      {string|boolean}  data.wol        WOL address
   * @param      {boolean}         data.connected  Connection status
   * @listens    Socket#event:"admin.status.routers"
   * @fires      Socket#event:"admin.router.command"
   */
  _list = data =>
  {
    if(JSON.stringify(data) === JSON.stringify(this._routers))
      return false;
    this._routers = data;
    let connected = data.filter((s) => s.connected);
    this.$list.find('.noresults').toggle(connected.length == 0);

    $.each(this._routers, (id, router) =>
    {
      let $tr = this.$list.find('.router-entry[data-name="' + router.name + '"]');
      if(!router.connected) return $tr.remove();

      let isLinked = () => typeof this._routers[id].linked == 'object';
      if($tr.length == 0)
      {
        $tr = this.$tpl.clone().attr('id', '').addClass('router-entry')
          .attr('data-name', router.name).show().appendTo(this.$list);

        $tr.find('.name').text(router.name);
        let $outputTpl = $tr.find('.output-row');
        let $outputs = $tr.find('.outputs');
        for (let i = 1; i < router.outputs.length; i++)
        {
          if(router.outputs[i].nc) continue;
          let $out = $outputTpl.clone().appendTo($outputs)
          $out.find('.output-label').tooltip({
            container: this.$list,
            title: () => this._routers[id].outputs[i].name
          });
          $out.find('.output-number').text(i);

          let $inputTpl = $out.find('.input-button');
          for (let y = 1; y < router.inputs.length; y++)
          {
            if(router.inputs[y].nc) continue;
            let $in = $inputTpl.clone().appendTo($out)
              .text(y)
              .attr('data-output', i)
              .attr('data-input', y)
              .attr('data-name', router.name)
              .click(this._btnRouteClick)
              .tooltip({
                container: this.$list,
                title: () => this._routers[id].inputs[y].name
              });
          }
          $inputTpl.remove();
        }
        $outputTpl.remove()
      }

      let $buttons = $tr.find('.output-row .btn')
        .removeClass('btn-danger');
      for (let i = 1; i < router.outputs.length; i++)
      {
        let output = router.outputs[i];
        $buttons.filter('[data-output="' + i + '"][data-input="' + output.input + '"]').addClass('btn-danger');
      }

      let $dropdown = $tr.find('.dropdown-menu');
      let $linkedItem = $dropdown.find('.dropdown-item.linked');
      let $noresultsItem = $dropdown.find('.dropdown-item.noresults');
      $dropdown.find('.dropdown-item.other').remove();
      if(isLinked())
      {
        $noresultsItem.addClass('d-none');
        $linkedItem.find('span').text(router.linked.name);
      } else {
        $.each(this._routers, (i, other) =>
        {
          if(other.name == router.name) return; /* Don't link to self */
          if(!other.connected) return; /* Exclude if the other router isn't connected */

          /* Don't allow link if other is linked is to self */
          if(typeof other.linked == 'object' && other.linked.name == router.name) return;

          $('<a></a>', {
            text: 'Link with ' + other.name,
            class: 'dropdown-item other',
            href: '#',
            'data-toggle': 'modal',
            'data-target': '#actionModal',
            'data-command': 'router.link',
            'data-name': other.name
          }).data('param', {
              master: other.name,
              slave: router.name
            }).appendTo($dropdown);
        });
        $noresultsItem.toggleClass('d-none', $dropdown.find('.dropdown-item.other').length > 0);
      }
      $linkedItem.toggleClass('d-none', !isLinked());
      $tr
        .toggleClass('router-linked', isLinked())
        .find('.linkToggle .fas')
          .toggleClass('fa-link', isLinked())
          .toggleClass('fa-unlink', !isLinked());
      
    });
  }
  _btnRouteClick = (event) =>
  {
    let $target = $(event.currentTarget);
    let name = $target.data('name');
    let input = parseInt($target.data('input'));
    let output = parseInt($target.data('output'));
    console.log(name, input, output)
    this.socket.emit('admin.router.route', name, input, output);
    event.preventDefault();
  }
  /**
   * All items in the list
   *
   * @type     {jQuery}
   */
  get $items() { return this.$list.find('.router-entry') }
}

export default Routers;