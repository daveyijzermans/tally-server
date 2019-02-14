import $ from 'jquery';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';

class AVSetup
{
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