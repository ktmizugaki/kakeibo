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
    name: options.emptyComponent || 'empty',
    data: options.emptyData,
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
  tab.content = ko.pureComputed(m.content, tab);
  if (options.tabs) {
    options.tabs.forEach(function(tabInfo) {tab.addTab(tabInfo)});
  }
  return tab;
}
koTabbar.tabId = 0;
koTabbar.methods = {
  addTab: function(newTabInfo) {
    if (!newTabInfo.name || !newTabInfo.label || (!newTabInfo.template&&!newTabInfo.component)) {
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
  content: function() {
    var current = this.current();
    if (current) {
      if (current.component) {
        return {name: current.component, params: current.data};
      }
      var data = {name: current.template, data: current.data};
      return {name: 'component-template-adapter', params: data};
    } else {
      return {name: this.empty.name, params: this.empty.data};
    }
  },
};
