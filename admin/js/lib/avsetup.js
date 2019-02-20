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
    /**
     * jQuery container of all draggable objects
     * 
     * @type       {jQuery}
     */
    this.$sources = opts.$sources.draggable({
      cursor: 'move',
      revert: true
    });
    /**
     * jQuery container of all droppable objects (targets)
     * 
     * @type       {jQuery}
     */
    this.$targets = opts.$targets.droppable({
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