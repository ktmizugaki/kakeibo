function ListDialog(dialogManager, dataStore) {
  this.template = "template-list-form";
  this.id = "list-dialog";
  this.title = ko.pureComputed(this.title.bind(this));
  this.data = {
    dataStore: dataStore,
    value: ko.observable(null),
    onSave: this.close.bind(this),
    onDel: this.close.bind(this),
  };
  this.handle = null;
  this.dialogManager = dialogManager;
  this.onDialogOpen = this.onDialogOpen.bind(this);
  this.onDialogClose = this.onDialogClose.bind(this);
}
ListDialog.prototype.title = function() {
  var value = this.data.value();
  return value? value.id()? "仕訳の詳細": "仕訳の作成": null;
};
ListDialog.prototype.open = function(list) {
  var handle = this.dialogManager.open(this);
  if (!handle) {
    return false;
  }
  this.handle = handle;
  this.data.value(list);
  return true;
};
ListDialog.prototype.close = function() {
  if (this.handle) {
    this.dialogManager.close(this.handle);
  }
};
ListDialog.prototype.onDialogOpen = function(handle, element) {
  element.querySelector("select, input").focus();
};
ListDialog.prototype.onDialogClose = function(handle) {
  if (this.handle != handle) {
    return;
  }
  this.data.value(null);
  this.handle = null;
};

function ListToTmplDialog(dialogManager, dataStore) {
  this.template = "template-list2tmpl-form";
  this.id = "to-tmpl-dialog";
  this.title = ko.observable("ひな型として保存");
  this.data = {
    dataStore: dataStore,
    value: ko.observable(null),
    list: null,
    onSave: this.close.bind(this),
  };
  this.handle = null;
  this.dialogManager = dialogManager;
  this.onDialogOpen = this.onDialogOpen.bind(this);
  this.onDialogClose = this.onDialogClose.bind(this);
}
ListToTmplDialog.prototype.open = function(list) {
  var handle = this.dialogManager.open(this);
  if (!handle) {
    return false;
  }
  this.handle = handle;
  this.data.value(new Template());
  this.data.list = list.toParams();
  return true;
};
ListToTmplDialog.prototype.close = function() {
  if (this.handle) {
    this.dialogManager.close(this.handle);
  }
};
ListToTmplDialog.prototype.onDialogOpen = function(handle, element) {
  element.querySelector("select, input").focus();
};
ListToTmplDialog.prototype.onDialogClose = function(handle) {
  if (this.handle != handle) {
    return;
  }
  this.data.value(null);
  this.data.list = null;
  this.handle = null;
};

function ListsPage(tabbar, dialogManager, dataStore, date) {
  var self = this;
  self.tabInfo = {label:"月仕訳一覧",template:"template-lists-page",data:self};
  self.tabInfo.onChange = function(tab, selected, name) {
    if (selected) {
      self.loadAll();
    }
  };
  self.lists = ko.observableArray();
  self.date = date.extend({delay:300});
  self.dateNotfy = self.date.subscribe(function(newValue) {
    if (tabbar.selected() != 'lists') return;
    if (is_date_str(newValue) || is_month_str(newValue)) {
      self.loadAll();
    }
  });

  var dialog = new ListDialog(dialogManager, dataStore);
  var toTmplDialog = new ListToTmplDialog(dialogManager, dataStore);
  var onDialogClose = dialog.onDialogClose;
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    onDialogClose(handle);
    toTmplDialog.close();
  };
  var onSave = dialog.data.onSave;
  dialog.data.onSave = function(list) {
    var prev = Model.arrayFind(self.lists(), list);
    if (prev) {
      self.lists.remove(prev);
    }
    self.lists.push(list);
    self.lists.sort(compareListByDate);
    onSave(list);
  };
  var onDel = dialog.data.onDel;
  dialog.data.onDel = function(list) {
    var prev = Model.arrayFind(self.lists(), list);
    if (prev) {
      self.lists.remove(prev);
    }
    onDel(list);
  };

  function compareListByDate(a,b) {
    if (a.date() < b.date()) return -1;
    if (a.date() > b.date()) return 1;
    if (a.is_initial() && !b.is_initial()) return -1;
    if (!a.is_initial() && b.is_initial()) return 1;
    return a.id() - b.id();
  }
  self.prevDate = function() {
    var date = self.date();
    if (is_date_str(date)) {
      self.date(prev_date(date));
    } else if (is_month_str(date)) {
      self.date(prev_month(date));
    }
  };
  self.nextDate = function() {
    var date = self.date();
    if (is_date_str(date)) {
      self.date(next_date(date));
    } else if (is_month_str(date)) {
      self.date(next_month(date));
    }
  };
  self.loadAll = function() {
    self.lists([]);
    return Promise.all([List.search({date:self.date()})]).then(function(res){
      var lists = res[0]();
      lists.forEach(function(list) {
        list.items().forEach(function(item) {
          item.kamoku = dataStore.computedKamoku(item.kamoku_id);
        });
      });
      self.lists(lists);
      self.lists.sort(compareListByDate);
      page.setTitleInfo(self.date());
    });
  };

  self.addList = function() {
    return dialog.open(new List({date:self.date()}));
  };
  self.editList = function() {
    List.get(this.id()).then(function(list) {
      dialog.open(list);
    });
    return true;
  };
  dialog.data.onToTmpl = function(list) {
    return toTmplDialog.open(list);
  };
}

ko.components.register("lists-page", {
  template: { fetch: "html/lists-page.html" }
});
