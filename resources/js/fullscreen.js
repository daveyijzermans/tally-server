/**
 * Toggle fullscreen mode
 * @param  {Object} node 
 */
export const toggleFullscreen = (node) =>
{
	node = node || document.documentElement;
	const isEnabled = document.fullscreenElement || 
	                  document.webkitIsFullScreen ||
	                  document.mozFullScreenEnabled ||
	                  document.msFullscreenEnabled ||
	                  document.fullscreen || false;

	if (isEnabled)
		return exitFullscreen(node);
	else
		return enterFullscreen(node);
}

/**
 * Enter fullscreen mode
 * @param  {Object} node 
 */
export const enterFullscreen = (node) =>
{
	node = node || document.documentElement;
	if (node.requestFullscreen)
	{
		return node.requestFullscreen();
	} else if (node.mozRequestFullScreen) {
		return node.mozRequestFullScreen();
	} else if (node.webkitRequestFullscreen) {
		return node.webkitRequestFullscreen();
	} else if (node.msRequestFullscreen) {
		return node.msRequestFullscreen();
	}
}

/**
 * Exit fullscreen mode
 */
export const exitFullscreen = () =>
{
	if (document.exitFullscreen)
	{
		return document.exitFullscreen();
	} else if (document.mozCancelFullScreen) { /* Firefox */
		return document.mozCancelFullScreen();
	} else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
		return document.webkitExitFullscreen();
	} else if (document.msExitFullscreen) { /* IE/Edge */
		return document.msExitFullscreen();
	}
}