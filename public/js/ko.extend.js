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
    var ds = this.dialogs();
    return !(ds.length && event.which == 27 && this.close(ds[ds.length-1]));
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
