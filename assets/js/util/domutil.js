var DOMUtil = {
  findAncesstor: function(element, id, className) {
    className = " "+className+" ";
    while (element && element != document.body) {
      if (id != null && element.id === id) {
        return element;
      } else if (id == null && (" "+element.className+" ").indexOf(className) > -1) {
        return element;
      }
      element = element.parentNode;
    }
  },
  remove: function(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },
  toLocalPos: function(pos, element) {
    var rect = element.getBoundingClientRect();
    return {x: pos.x-rect.left, y: pos.y-rect.top};
  },
};
