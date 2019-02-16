/**
 * Toggle fullscreen mode
 *
 * @param      {Object}  node    The node
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
		exitFullscreen(node);
	else
		enterFullscreen(node);
}

/**
 * Enter fullscreen mode
 *
 * @param      {Object}  node    The node
 */
export const enterFullscreen = (node) =>
{
	node = node || document.documentElement;
	if (node.requestFullscreen)
	{
		node.requestFullscreen();
	} else if (node.mozRequestFullScreen) {
		node.mozRequestFullScreen();
	} else if (node.webkitRequestFullscreen) {
		node.webkitRequestFullscreen();
	} else if (node.msRequestFullscreen) {
		node.msRequestFullscreen();
	}
}

/**
 * Exit fullscreen mode
 */
export const exitFullscreen = () =>
{
	if (document.exitFullscreen)
	{
		document.exitFullscreen();
	} else if (document.mozCancelFullScreen) { /* Firefox */
		document.mozCancelFullScreen();
	} else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
		document.webkitExitFullscreen();
	} else if (document.msExitFullscreen) { /* IE/Edge */
		document.msExitFullscreen();
	}
}