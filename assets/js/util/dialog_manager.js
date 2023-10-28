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
          '<div class="dialog-body" data-bind="component: {name: component, params: data}"></div>'+
        '</div>'+
      '</div>'),
    foreach: manager.dialogs,
    afterAdd: function(element, index, data) {
      /* call callback after components are rendered */
      setTimeout(function() {
        if (typeof data.onDialogOpen == "function") {
          data.onDialogOpen(data, element);
        }
      }, 100);
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
    if (!dialogInfo.template && !dialogInfo.component) {
      throw "dialog.open: invalid daialogInfo";
    }
    if (dialogInfo.id) {
      var same = this.dialogs().find(function(info){return info.id==dialogInfo.id;});
      if (same) {
        console.warn("dialog id "+dialogInfo.id+" is open");
        return null;
      }
    }
    var handle = ko.utils.extend({}, dialogInfo);;
    if (!dialogInfo.component && dialogInfo.template) {
      handle.component = 'component-template-adapter';
      handle.data = {
        name: dialogInfo.template,
        data: dialogInfo.data,
      };
    }
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
