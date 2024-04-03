export function getAceEditorOffset() {
  const outerIframe = $('iframe[name="ace_outer"]');
  const outerIframeOffset = outerIframe.offset();
  const innerIframe = outerIframe.contents().find('iframe[name="ace_inner"]');
  const innerIframeOffset = innerIframe.offset();
  if (!outerIframeOffset || !innerIframeOffset) {
    return null;
  }
  const absoluteTop = outerIframeOffset.top + innerIframeOffset.top;
  const absoluteLeft = outerIframeOffset.left + innerIframeOffset.left;
  const innerHeight = innerIframe.innerHeight();
  const innerWidth = innerIframe.innerWidth();
  const height = innerIframe.height();
  const width = innerIframe.width();
  if (!innerHeight || !innerWidth || !height || !width) {
    return null;
  }
  const paddingWidth = (innerWidth - width) / 2;
  const paddingHeight = (innerHeight - height) / 2;
  const scrollX = outerIframe.contents().scrollLeft() || 0;
  const scrollY = outerIframe.contents().scrollTop() || 0;
  return {
    top: absoluteTop + paddingHeight - scrollY,
    left: absoluteLeft + paddingWidth - scrollX,
  };
}
