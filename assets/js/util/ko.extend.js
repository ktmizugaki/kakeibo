ko.components.loaders.unshift({
  loadTemplate: function(name, templateConfig, callback) {
    if ("object" === typeof templateConfig && "fetch" in templateConfig) {
      fetch(templateConfig.fetch).then(function(res) {
        return res.text();
      }).then(function(text) {
        callback(ko.utils.parseHtmlFragment(text));
      }, function() {
        throw Error("Cannot load template "+templateConfig.fetch+" for "+name);
      });
    } else {
      callback(null);
    }
  }
});

ko.extenders.numeric = function(target, precision) {
  var result = ko.pureComputed({
    read: target,  //always return the original observables value
    write: function(newValue) {
      var current = target(),
          roundingMultiplier = Math.pow(10, precision),
          newValueAsNum = isNaN(newValue) ? 0 : +newValue,
          valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

      //only write if it changed
      if (valueToWrite !== current) {
        target(valueToWrite);
      } else {
        //if the rounded value is the same, but a different value was written, force a notification for the current field
        if (newValue !== current) {
          target.notifySubscribers(valueToWrite);
        }
      }
    }
  }).extend({ notify: 'always' });

  result(target());
  return result;
};

ko.extenders.date = function(target) {
  return ko.pureComputed({
    read: function() {
      var value = target();
      if (!value) return "";
      if (!(value instanceof Date)) {
        value = new Date(value);
        if (isNaN(date.getTime())) {
          value = new Date();
        }
      }
      return value.toISOString().substring(0,10);
    },
    write: function(newValue) {
      var current = target(),
          date = null;
      if (newValue != "") {
        if (!newValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return;
        }
        date = new Date(newValue);
        if (isNaN(date.getTime())) {
          date = current;
        }
      }
      if ((date&&date.getTime()) != (current&&current.getTime())) {
        target(date);
      }
    }
  }).extend({ notify: 'always' });
};

ko.extenders.delay = function(target, timeout) {
  return target.extend({rateLimit:{timeout:timeout, method:"notifyWhenChangesStop"}})
};

ko.bindingHandlers.draggable = (function koDraggable(){
  var KO_DRAGGABLE_KEY = 'draggable-data-key';
  var KO_DIR_VERTICAL = 'vertical';
  var KO_DIR_HORIZONTAL = 'horizontal';
  function createOverlay(value) {
    var overlay = document.createElement('div');
    overlay.style.zIndex = '9998';
    overlay.style.position = 'fixed';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.left = '0';
    overlay.style.cursor = value.type === 'copy'? 'copy': 'move';
    return overlay;
  }
  function handleMouseDown(element, value, $data, event) {
    if (event.button != 0) {
      return;
    }
    /* prevent text selection */
    event.preventDefault();

    var overlay = createOverlay(value);
    document.body.appendChild(overlay);
    var dragging = {
      element: element,
      root: DOMUtil.findAncesstor(element, null, 'dragroot'),
      offset: DOMUtil.toLocalPos({x: event.clientX, y: event.clientY}, element),
      overlay: overlay,
    };
    if (dragging.root) {
        var limit = {left: 0, right: 0, top: 0, bottom: 0};
        var targetSize = element.getBoundingClientRect();
        var rootSize = dragging.root.getBoundingClientRect();
        var right = rootSize.width - targetSize.width;
        var bottom = rootSize.height - targetSize.height;
        if (right < 0) {
            limit.right = limit.left = right/2;
        } else {
            limit.right = right;
        }
        if (bottom < 0) {
            limit.bottom = limit.top = bottom/2;
        } else {
            limit.bottom = bottom;
        }
        dragging.limit = limit;
    }
    ko.utils.domData.set(element, KO_DRAGGABLE_KEY, dragging);
    overlay.addEventListener('mousemove', function(event) {
      handleMouseMove(element, value, $data, event);
    });
    overlay.addEventListener('mouseup', function(event) {
      handleMouseUp(element, value, $data, event);
    });
    overlay.addEventListener('mouseleave', function(event) {
      handleMouseUp(element, value, $data, event);
    });
    dragging._escape_hook = function(event) {
      if (event.which == 27) {
        handleMouseUp(element, value, $data, event);
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', dragging._escape_hook, true);
  }
  function handleMouseMove(element, value, $data, event) {
    var dragging = ko.utils.domData.get(element, KO_DRAGGABLE_KEY);
    if (!dragging) {
      DOMUtil.remove(event.currentTarget);
      return;
    }
    var element = dragging.element;
    var offset = dragging.offset;
    var limit = dragging.limit;
    var pos = DOMUtil.toLocalPos({x: event.clientX, y: event.clientY}, dragging.root);
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none';
    if (value.direction !== KO_DIR_VERTICAL) {
      var x = pos.x-offset.x;
      if (limit) x = Math.max(limit.left, Math.min(x, limit.right));
      element.style.left = x+'px';
    }
    if (value.direction !== KO_DIR_HORIZONTAL) {
      var y = pos.y-offset.y;
      if (limit) y = Math.max(limit.top, Math.min(y, limit.bottom));
      element.style.top = y+'px';
    }
  }
  function handleMouseUp(element, value, $data, event) {
    var dragging = ko.utils.domData.get(element, KO_DRAGGABLE_KEY);
    if (!dragging) {
      DOMUtil.remove(event.currentTarget);
      return;
    }
    ko.utils.domData.set(element, KO_DRAGGABLE_KEY, undefined);
    DOMUtil.remove(dragging.overlay);
    if (dragging._escape_hook) {
      window.removeEventListener('keydown', dragging._escape_hook, true);
    }

    var target;
    if (event.type === 'mouseup') {
      target = document.elementFromPoint(event.clientX, event.clientY);
    }

    element.style.position = '';
    element.style.pointerEvents = '';
    element.style.right = '';
    element.style.top = '';

    if (event.type === 'mouseup') {
      var event = new CustomEvent('kodrop', {detail: {element: element, data: $data}, bubbles: true});
      target.dispatchEvent(event);
    }
  }
  return {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext){
      var value = valueAccessor();
      var handles = element.getElementsByClassName('drag-handle');
      ko.utils.arrayForEach(handles, function(handle) {
        handle.addEventListener('mousedown', function(event) {
          handleMouseDown(element, value, viewModel, event);
        });
      });
    },
  };
})();
ko.virtualElements.allowedBindings['draggable'] = true;

ko.components.register('component-template-adapter', {
  template: ko.utils.parseHtmlFragment('<!-- ko template: $data --><!-- /ko -->'),
});
