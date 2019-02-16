import $ from 'jquery';

/**
 * Animate a puff of smoke effect on an element and optionally remove the
 * element afterwards.
 *
 * @param      {boolean}  removeEl  Whether to remove the element
 */
export default function(removeEl)
{
  this.each(function()
  {
    let $this = $(this),
        bgTop = 0,
        frame = 0,
        frames = 6,
        frameSize = 32,
        frameRate = 80,
        pos = $this.offset(),
        left = pos.left + $this.outerWidth() / 2 - frameSize / 2,
        top = pos.top + $this.outerHeight() / 2 - frameSize / 2,
        $puff = $('<div class="puff"></div>').css({
          left: left,
          top: top
        }).appendTo('body');
      if(removeEl) $this.remove();

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