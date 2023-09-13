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

function CalendarView(params) {
  var self = this;
  var i, j, pos, row;
  var date = ko.unwrap(params.date);
  var mode = ko.unwrap(params.mode);
  self.mode = ko.observable();
  if (is_month_str(date)) {
    self.mode('month');
  } else if (is_date_str(date)) {
    self.mode('date');
  } else {
    self.mode('date');
    date = date2str(new Date());
  }
  if ((mode == 'month' || mode == 'date') && mode != self.mode()) {
    self.mode(mode);
  }
  if (ko.isObservable(params.date)) {
    self.date = params.date;
  } else {
    self.date = ko.observable(date);
  }
  self.header = ko.computed(function() {
    if (self.mode() == 'month') {
      return null;
    } else {
      return ['日', '月', '火', '水', '木', '金', '土'];
    }
  });
  self.rows = ko.computed(function() {
    if (!self.date()) {
      return;
    }
    var date = new Date(self.date());
    var rows = [];
    if (self.mode() == 'month') {
      var year = date.getFullYear();
      pos = 1;
      for (i = 0; i < 3; i++) {
        row = [];
        for (j = 0; j < 4; j++) {
          row.push({text: pos, value: year+"-"+(pos<10?"0":"")+pos});
          pos++;
        }
        rows.push(row);
      }
    } else {
      var month = month2str(date),
          end = new Date(date.getFullYear(), date.getMonth()+1, 0).getDate();
      pos = new Date(date.getFullYear(), date.getMonth(), 1),
      pos = 1-pos.getDay();
      for (i = 0; i < 6; i++) {
        row = [];
        for (j = 0; j < 7; j++) {
          if (pos <= 0 || pos > end) {
            row.push({text: "", value: ""});
          } else {
            row.push({text: pos, value: month+"-"+(pos<10?"0":"")+pos});
          }
          pos++;
        }
        rows.push(row);
      }
    }
    return rows;
  });
  self.selected = function(date) {
    if (date) {
      self.date(date.value);
    }
  }
}
CalendarView.prototype.prev = function() {
  if (this.mode() == 'month') {
    var date = new Date(this.date());
    date.setFullYear(date.getFullYear()-1);
    this.date(month2str(date));
  } else {
    this.date(prev_month(this.date()));
  }
};
CalendarView.prototype.next = function() {
  if (this.mode() == 'month') {
    var date = new Date(this.date());
    date.setFullYear(date.getFullYear()+1);
    this.date(month2str(date));
  } else {
    this.date(next_month(this.date()));
  }
};
CalendarView.prototype.now = function() {
  if (this.mode() == 'month') {
    this.date(month2str(new Date()));
  } else {
    this.date(date2str(new Date()));
  }
};
ko.components.register("calendar", {
  viewModel: CalendarView,
  template: { fetch: "html/calendar.html" }
});

function koTabbar(options) {
  var m = koTabbar.methods;
  var tab = {
    realSelected: ko.observable(),
    tabs: ko.observableArray(),
    map: Object.create(null),
  };
  options = options || {};

  tab.name = options.name || "koTabbar" + ++koTabbar.tabId;
  tab.addTab = m.addTab.bind(tab);
  tab.setSelected = m.setSelected.bind(tab);
  tab.selected = ko.computed({
    read: tab.realSelected,
    write: m.setSelected,
    owner: tab
  });
  tab.current = ko.pureComputed(m.current, tab);

  tab.empty = {
    name: options.templateEmpty || null,
    data: options.dataEmpy,
  };
  tab.tabbar = {
    name: options.templateTabbar,
    nodes: ko.utils.parseHtmlFragment('<div class="tab-bar" data-bind="foreach: tabs">'+
        '<label data-bind="css: { selected: $parent.selected() == name }">'+
          '<input type="radio" data-bind="attr:{name:$parent.name}, value: name, checked: $parent.selected">'+
          '<span data-bind="text: label"></span>'+
                                      '</label>&nbsp;'+
      '</div>'),
    data: tab,
  };
  tab.content = {
    name: ko.pureComputed(m.contentTemplateName, tab),
    nodes: ko.utils.parseHtmlFragment(""),
    data: ko.pureComputed(m.contentTemplateData, tab),
  };
  if (options.tabs) {
    options.tabs.forEach(function(tabInfo) {tab.addTab(tabInfo)});
  }
  return tab;
}
koTabbar.tabId = 0;
koTabbar.methods = {
  addTab: function(newTabInfo) {
    if (!newTabInfo.name || !newTabInfo.label || !newTabInfo.template) {
      throw "addTab: invalid tabInfo";
    }
    if (newTabInfo.name in this.map) {
      throw "Tab name "+newTabInfo.name+" exists";
    }
    this.tabs.push(newTabInfo);
    this.map[newTabInfo.name] = newTabInfo;
  },
  setSelected: function(tab) {
    if (tab !== null && !(tab in this.map)) {
      console.warn("unknown tab: "+tab);
      return false;
    }
    var selected = this.selected();
    var current = this.current();
    if (selected == tab) {
      return true;
    }
    if (current && current.onChange) {
      current.onChange(selected, false, this.name);
    }
    this.realSelected(tab);
    current = this.current();
    if (current && current.onChange) {
      current.onChange(tab, true, this.name);
    }
    return true;
  },
  current: function() {
    var selected = this.selected();
    if (selected === null || !(selected in this.map)) {
      return null;
    }
    return this.map[selected] || null;
  },
  contentTemplateName: function() {
    var current = this.current();
    return current? current.template: "template-empty";
  },
  contentTemplateData: function() {
    var current = this.current();
    return current? ko.unwrap(current.data): this.empty.data;
  },
};
function koDialogManager(options) {
  var m = koDialogManager.methods;
  var manager = {
    nodes: ko.utils.parseHtmlFragment('<!-- ko template: template --><!-- /ko -->'),
    dialogs: ko.observableArray(),
    map: {}
  };
  options = options || {};

  manager.data = manager;
  manager.template = {
    nodes: ko.utils.parseHtmlFragment(
      '<div class="dialog-overlay" data-bind="click: $parent.onClickOverlay">'+
        '<div class="dialog" data-bind="attr: {id: $data.id}">'+
          '<div class="dialog-title" data-bind="visible: title">'+
            '<span data-bind="text: title"></span>'+
            '<button class="icon dialog-close" data-bind="click: function(){$parent.close($data)}">×</button>'+
          '</div>'+
          '<div class="dialog-body" data-bind="template: {name:template,data:data}"></div>'+
        '</div>'+
      '</div>'),
    foreach: manager.dialogs,
    afterAdd: function(element, index, data) {
      if (typeof data.onDialogOpen == "function") {
        data.onDialogOpen(data, element);
      }
    },
  };
  document.addEventListener("keydown", m.onKeyDown.bind(manager), false);
  manager.onClickOverlay = m.onClickOverlay.bind(manager);
  manager.is_open = ko.pureComputed(m.is_open, manager);
  manager.open = m.open.bind(manager);
  manager.close = m.close.bind(manager);
  return manager;
}
koDialogManager.tabId = 0;
koDialogManager.methods = {
  onKeyDown: function(event) {
    /* close dialog by escape key */
    var ds = this.dialogs();
    if (ds.length && event.which == 27) {
      /* to allow closing dropdown by escape key, pass through first escape key.
       * but focus is removed from the dropdown, second escape key triggers
       * dialog to be closed*/
      if (event.target.tagName === "SELECT") {
        event.target.blur();
        return true;
      }
      if (this.close(ds[ds.length-1])) {
        /* absorb escape key only if dialog was closed */
        return false;
      }
    }
    return true;
  },
  onClickOverlay: function(data, event) {
    var targetClass = " "+event.target.className+" ";
    if (targetClass.indexOf("dialog-overlay") > 0) {
      this.close(data);
      return false;
    }
    return true;
  },
  is_open: function() {
    return this.dialogs().length > 0;
  },
  open: function(dialogInfo) {
    if (!dialogInfo.template) {
      throw "dialog.open: invalid daialogInfo";
    }
    if (dialogInfo.id) {
      var same = this.dialogs().find(function(info){return info.id==dialogInfo.id;});
      if (same) {
        console.warn("dialog id "+dialogInfo.id+" is open");
        return null;
      }
    }
    var handle = ko.utils.extend({}, dialogInfo);
    this.dialogs.push(handle);
    return handle;
  },
  close: function(handle) {
    if (handle.onDialogCanClose && handle.onDialogCanClose(handle) === false) {
      return false;
    }
    this.dialogs.remove(handle);
    setTimeout(function() {
      if (typeof handle.onDialogClose == "function") {
        handle.onDialogClose(handle);
      }
    }, 0);
    return true;
  }
};
