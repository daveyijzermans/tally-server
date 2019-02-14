import $ from 'jquery';

export const animatePuff = ($el, removeEl) =>
{
  let bgTop = 0,
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
};

export const talkingIndicator = (el) =>
{          
  let $circle = $('<div class="talking-indicator"></div>')
    .appendTo(el);
    
  setTimeout(() => $circle.addClass('zoom'), 10);
  setTimeout(() => $circle.remove(), 2010);
};