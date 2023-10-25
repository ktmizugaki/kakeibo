function TmplDialog(dialogManager, dataStore) {
  this.template = "template-tmpl-form";
  this.id = "tmpl-dialog";
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
TmplDialog.prototype.title = function() {
  var value = this.data.value();
  return value? value.id()? "ひな型の更新": "ひな型の追加": null;
};
TmplDialog.prototype.open = function(tmpl) {
  var handle = this.dialogManager.open(this);
  if (!handle) {
    return false;
  }
  this.handle = handle;
  var value = new Template(tmpl&&tmpl.toObject());
  value.date = ko.observable(value.json().date);
  this.data.value(value);
  return true;
};
TmplDialog.prototype.close = function() {
  if (this.handle) {
    this.dialogManager.close(this.handle);
  }
};
TmplDialog.prototype.onDialogOpen = function(handle, element) {
  element.querySelector("select, input").focus();
};
TmplDialog.prototype.onDialogClose = function(handle) {
  if (this.handle != handle) {
    return;
  }
  this.data.value(null);
  this.handle = null;
};

function TmplManager(tabbar, dialogManager, dataStore) {
  this.tabInfo = {label:"ひな型",template:"template-tmpls",data:this};
  this.tmpls = dataStore.tmpls;
  this.loadAll = function() {
    return Promise.all([Template.all()]).then(function(res){
      dataStore.setTmpls(res[0]());
    });
  };

  var dialog = new TmplDialog(dialogManager, dataStore);
  this.addTmpl = function() {
    return dialog.open();
  };
  this.editTmpl = function() {
    return dialog.open(this);
  };
}

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

function ListManager(tabbar, dialogManager, dataStore, date) {
  var self = this;
  self.tabInfo = {label:"月仕訳一覧",template:"template-lists",data:self};
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

function CarryOverDialog(dialogManager, dataStore) {
  this.template = "template-carryover-form";
  this.id = "list-dialog";
  this.title = ko.pureComputed(this.title.bind(this));
  this.data = {
    dataStore: dataStore,
    value: ko.observable(null),
    onSave: this.close.bind(this),
  };
  this.handle = null;
  this.dialogManager = dialogManager;
  this.dataStore = dataStore;
  this.onDialogOpen = this.onDialogOpen.bind(this);
  this.onDialogClose = this.onDialogClose.bind(this);
}
CarryOverDialog.prototype.title = function() {
  return this.data.value().date() + "への繰越の作成";
};
CarryOverDialog.prototype.open = function(summary, date) {
  var handle = this.dialogManager.open(this);
  if (!handle) {
    return false;
  }
  this.handle = handle;
  var dataStore = this.dataStore;
  var list = new List();
  list.date(date2str(new Date(next_month(date))));
  var carry = new Item();
  var carry_amount = 0;
  dataStore.kamokus().forEach(function(kamoku) {
    if (kamoku.category_id() == 4 && !carry.kamoku) {
      carry.kamoku_id(kamoku.id());
      carry.kamoku = dataStore.computedKamoku(carry.kamoku_id);
    }
  });
  list.items.push(carry);
  summary.forEach(function(row) {
    var category_id = row.kamoku().category().id();
    if (category_id == 1 || category_id == 3) {
      var item = new Item();
      var amount = row.finalAmount();
      if (amount == 0) return;
      carry_amount += amount;
      item.kamoku_id = row.kamoku_id;
      item.kamoku = row.kamoku;
      if (amount < 0) {
        item.dir(-1);
        item.amount(-amount);
      } else {
        item.dir(1);
        item.amount(amount);
      }
      list.items.push(item);
    }
  });
  if (carry_amount > 0) {
    carry.dir(-1);
    carry.amount(carry_amount);
  } else if (carry_amount < 0) {
    carry.dir(1);
    carry.amount(-carry_amount);
  } else {
    list.items.remove(carry);
  }
  this.data.value(list);
};
CarryOverDialog.prototype.close = function() {
  if (this.handle) {
    this.dialogManager.close(this.handle);
  }
};
CarryOverDialog.prototype.onDialogOpen = function(handle, element) {
  element.querySelector(".dialog-body button").focus();
};
CarryOverDialog.prototype.onDialogClose = function(handle) {
  if (this.handle != handle) {
    return;
  }
  this.data.value(null);
  this.handle = null;
};

function SummaryManager(tabbar, dialogManager, dataStore, date) {
  var self = this;
  self.tabInfo = {label:"月集計",template:"template-summary",data:self};
  self.tabInfo.onChange = function(tab, selected, name) {
    if (selected) {
      self.load();
    }
  };
  self.date = date.extend({delay:300});
  self.summary = ko.observableArray();
  self.dateNotfy = date.subscribe(function(newValue) {
    if (tabbar.selected() != 'summary') return;
    if (is_date_str(newValue) || is_month_str(newValue)) {
      self.load();
    }
  });

  [
    "initialAmount", "finalAmount",
    "kasiLeftAmount", "kariLeftAmount",
    "kasiRightAmount", "kariRightAmount",
    "kasiAmount", "kariAmount",
  ].forEach(function(name) {
    self[name] = ko.pureComputed(function() {
      var amount = 0;
      self.summary().forEach(function(item) {
        amount += item[name]()||0;
      });
      return amount;
    });
  });
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
  self.load = function() {
    self.summary([]);
    return Summary.get(self.date()).then(function(results){
      var map = {};
      var array = [];
      results.forEach(function(item) {
        var kamoku_id = item.kamoku_id;
        var summary;
        if (map[kamoku_id]) {
          summary = map[kamoku_id];
        } else {
          summary = map[kamoku_id] = new Summary();
          summary.kamoku_id(kamoku_id);
          summary.kamoku = dataStore.computedKamoku(summary.kamoku_id);
          array.push(summary);
        }
        if (item.is_initial == 1) {
          summary.initialAmount(item.dir*item.amount);
        } else if (item.dir == -1) {
          summary.kasiAmount(item.amount);
          if (summary.kamoku().category().side() == -1) {
            summary.kasiLeftAmount(item.amount);
          } else {
            summary.kasiRightAmount(item.amount);
          }
        } else if (item.dir == 1) {
          summary.kariAmount(item.amount);
          if (summary.kamoku().category().side() == -1) {
            summary.kariLeftAmount(item.amount);
          } else {
            summary.kariRightAmount(item.amount);
          }
        }
      });
      self.summary(array);
      self.summary.sort(compareSummaryItem);
      page.setTitleInfo(self.date());
    });
    if (!item.kamoku) {
      item.kamoku = dataStore.computedKamoku(item.kamoku_id);
    }
  };

  function compareKamokuByCode(a,b) {
    var d = a.category().compareTo(b.category());
    if (d) return d;
    if (a.code() < b.code()) return -1;
    if (a.code() > b.code()) return 1;
    return 0;
  }
  function compareSummaryItem(a,b) {
    return Model.comparator(a.kamoku(), b.kamoku());
  }

  var dialog = new CarryOverDialog(dialogManager, dataStore);
  self.makeCarryOver = function() {
    return dialog.open(self.summary(), self.date());
  };
}

function ByKamokuManager(tabbar, dialogManager, dataStore, date) {
  var self = this;
  self.tabInfo = {label:"科目別",template:"template-bykamoku",data:self};
  self.search = new ByKamoku({
    date_from: params.get("date_from") || date() || month2str(new Date()),
    date_to: params.get("date_to") || date() || month2str(new Date()),
    kamoku_id: params.get("kamoku_id"),
  });
  self.search.kamokus = dataStore.kamokus;
  self.search.kamoku = dataStore.computedKamoku(self.search.kamoku_id);
  params.query.subscribe(function() {
    var changed = false;
    var date_from = params.get("date_from");
    var date_to = params.get("date_to");
    var id = params.get("kamoku_id");
    if (date_from && date_from != self.search.date_from()) {
      self.search.date_from(date_from);
      changed = true;
    }
    if (date_to && date_to != self.search.date_to()) {
      self.search.date_to(date_to);
      changed = true;
    }
    if (id && id != self.search.kamoku_id()) {
      self.search.kamoku_id(id);
      changed = true;
    }
    if (changed && tabbar.selected() == 'bykamoku') {
      self.load(null, true);
    }
  });

  self.items = ko.observableArray();
  function compareItemByDate(a,b) {
    if (a.date() < b.date()) return -1;
    if (a.date() > b.date()) return 1;
    return a.id() - b.id();
  }
  self.load = function(form, keep_query) {
    var q = self.search.toParams();
    var errors = null;
    if (!is_month_str(q.date_from)) {
      errors = errors || {};
      errors['date_from'] = ["format month"];
    }
    if (!is_month_str(q.date_to)) {
      errors = errors || {};
      errors['date_to'] = ["format month"];
    }
    if (!q.kamoku_id) {
      errors = errors || {};
      errors['kamoku_id'] = ["is required"];
    }
    self.search.errors(errors);
    if (errors) {
      return;
    }
    self.items([]);
    if (keep_query !== true) {
      params.set("kamoku_id", q.kamoku_id);
      params.set("date_from", q.date_from);
      params.set("date_to", q.date_to);
    }
    var initial = Item.initial({kamoku_id: q.kamoku_id, date: q.date_from}).catch(function() { return Promise.resolve(null); });
    return Promise.all([Item.search(q), initial]).then(function(res){
      var items = res[0]();
      var initial = res[1];
      var sum = 0;
      items.sort(compareItemByDate);
      if (initial) {
        initial.id = "----";
        initial.date = "----------";
        initial.desc = "繰越";
        items.unshift(initial);
      }
      items.forEach(function(item) {
        sum += (item.dir()*item.amount()) || 0;
        item.kamoku = dataStore.computedKamoku(item.kamoku_id);
        item.sum = sum;
      });
      self.items(items);
    });
  };
}
function CalendarDialog(dialogManager, options) {
  var dialog = {
    template:"template-datepick-dialog",
    id: "date-dialog",
    title: options.title || "日付選択",
    params: {
      date: ko.observable(options.date()||date2str(new Date())),
      mode: options.mode,
    },
    target_date: options.date,
  };
  dialog.data = dialog;
  dialog.apply = function() {
    if (dialog.target_date) {
      dialog.target_date(dialog.params.date());
    }
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  };
  dialog.cancel = function() {
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  };
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    dialog.handle = null;
    dialog.target_date = null;
  };
  var handle = dialogManager.open(dialog);
  if (!handle) {
    return false;
  }
  dialog.handle = handle;
  return dialog;
}
