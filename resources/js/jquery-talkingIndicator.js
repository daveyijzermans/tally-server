import $ from 'jquery';

/**
 * Animate a growing ring around an element
 */
export default function()
{          
  this.each(function()
  {
    let $circle = $('<div class="talking-indicator"></div>')
      .appendTo(this);
      
    setTimeout(() => $circle.addClass('zoom'), 10);
    setTimeout(() => $circle.remove(), 2010);
  });
};