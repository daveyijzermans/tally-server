import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';

/**
 * Class for modeling the AV setup box
 *
 * @memberof   Frontend.UI
 */
class AVSetup
{
  /**
   * Constructs the object.
   *
   * @param      {Object}  opts    The options
   */
  constructor(opts)
  {
    Object.assign(this, opts);
    this.$sources.draggable({
      cursor: 'move',
      revert: true
    });
    this.$targets.droppable({
      drop: (event, ui) =>
      {
        let $target = $(event.target);
        let $source = ui.draggable;
        console.log($source, $target);
      }
    });
  }
}

export default AVSetup;