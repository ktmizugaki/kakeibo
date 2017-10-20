function KamokuManager(tabbar, dialogManager) {
  var self = this;
  var categoryMap = Object.create(null);
  var kamokuMap = Object.create(null);
  var kamokuCodeMap = Object.create(null);
  self.tabInfo = {label:"勘定科目",template:"template-kamokus",data:self};
  self.categories = ko.observableArray();
  self.kamokus = ko.observableArray();
  var dialog = self.dialog = {
    template:"template-kamoku-form",
    id: "kamoku-dialog",
    parent: self,
    is_saving: ko.observable(false),
    value: ko.observable(null),
    edit: null,
  };
  dialog.data = dialog;
  dialog.title = ko.pureComputed(function() {
    var value = dialog.value();
    return value? value.id()? "勘定科目の更新": "勘定科目の作成": null;
  });
  dialog.onDialogOpen = function(handle, element) {
    element.querySelector("select, input").focus();
  };
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    dialog.is_saving(false);
    dialog.value(null);
    dialog.edit = null;
    dialog.handle = null;
  };
  self.computedCategory = function(category_id) {
    return ko.pureComputed({
      read: function() {
        var id = category_id(),
            cats = self.categories();
        return id? categoryMap[id]: null;
      },
      write: function(cat) {
        category_id(cat?cat.id():null);
      }
    });
  };
  self.computedKamokus = function(category_id) {
    return ko.computed(function() {
      return self.kamokus().filter(function(kamoku) {
        return kamoku.category_id() == category_id;
      });
    });
  };
  self.computedKamoku = function(kamoku_id) {
    return ko.pureComputed({
      read: function() {
        var id = kamoku_id(),
            cats = self.kamokus();
        return id? kamokuMap[id]: null;
      },
      write: function(kamoku) {
        kamoku_id(kamoku?kamoku.id():null);
      }
    });
  };
  self.computedKamokuCode = function(kamoku_id) {
    var kamoku_code = null;
    return ko.pureComputed({
      read: function() {
        var id = kamoku_id(),
            cats = self.kamokus();
        return id? kamokuMap[id].code(): kamoku_code;
      },
      write: function(code) {
        var kamoku = code && kamokuCodeMap[code];
        if (kamoku) {
          kamoku_code = null;
          kamoku_id(kamoku.id());
        } else {
          kamoku_code = code;
          kamoku_id(null);
        }
      }
    });
  };

  function compareCategoryById(a,b) { return a.id() - b.id(); }
  function compareKamokuByCode(a,b) {
    if (a.code() < b.code()) return -1;
    if (a.code() > b.code()) return 1;
    return 0;
  }
  self.pushCategory = function(cat, postponeSort) {
    var id = cat.id.peek();
    if (!id) return;
    if (categoryMap[id]) {
      self.categories.remove(categoryMap[id]);
    }
    categoryMap[id] = cat;
    self.categories.push(cat);
    if (!cat.kamokus) {
      cat.kamokus = self.computedKamokus(id);
    }
    if (!postponeSort) {
      self.categories.sort(compareCategoryById);
    }
  };
  self.removeCategory = function(cat) {
    var id = cat.id.peek();
    if (!id) return;
    if (categoryMap[id] == cat) {
      self.categories.remove(categoryMap[id]);
      delete categoryMap[id];
    }
  };
  self.pushKamoku = function(kamoku, postponeSort) {
    var id = kamoku.id.peek();
    if (!id) return;
    if (kamokuMap[id]) {
      self.kamokus.remove(kamokuMap[id]);
      delete kamokuCodeMap[kamokuMap[id].code.peek()];
    }
    kamokuMap[id] = kamoku;
    kamokuCodeMap[kamokuMap[id].code.peek()] = kamoku;
    self.kamokus.push(kamoku);
    if (!kamoku.category) {
      kamoku.category = self.computedCategory(kamoku.category_id);
    }
    if (!postponeSort) {
      self.kamokus.sort(compareKamokuByCode);
    }
  };
  self.removeKamoku = function(kamoku) {
    var id = kamoku.id.peek();
    if (!id) return;
    if (kamokuMap[id] == kamoku) {
      self.kamoku.remove(kamokuMap[id]);
      delete kamokuCodeMap[kamokuMap[id].code.peek()];
      delete kamokuMap[id];
    }
  };
  self.loadAll = function() {
    return Promise.all([Category.all(), Kamoku.all()]).then(function(res){
      self.categories.removeAll();
      self.kamokus.removeAll();
      res[0]().forEach(function(cat) { self.pushCategory(cat, true); });
      res[1]().forEach(function(kamoku) { self.pushKamoku(kamoku, true); });
      self.categories.sort(compareCategoryById);
      self.kamokus.sort(compareKamokuByCode);
    });
  };

  function openKamoku(kamoku) {
    var handle = dialogManager.open(dialog);
    if (!handle) {
      return false;
    }
    dialog.handle = handle;
    var value = new Kamoku(kamoku&&kamoku.toObject());
    dialog.is_saving(false);
    value.category = self.computedCategory(value.category_id);
    dialog.value(value);
    dialog.edit = kamoku;
    return true;
  }
  function closeKamoku() {
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  }
  dialog.addKamoku = function() { return openKamoku(); };
  dialog.editKamoku = function() { return openKamoku(this); };
  dialog.saveKamoku = function() {
    var value = dialog.value();
    var edit = dialog.edit;
    if (!value || dialog.is_saving()) return;
    dialog.is_saving(true);
    value.save().then(function(kamoku) {
      if (edit) {
        edit.assign(kamoku.toObject());
        self.kamokus.sort(compareKamokuByCode);
      } else {
        self.pushKamoku(kamoku);
      }
      if (value != dialog.value()) return;
      closeKamoku();
    }).catch(function(err) {
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      if (err.errors) {
      } else {
        alert("エラーが発生しました");
      }
    });
  };
  dialog.delKamoku = function() {
    var value = dialog.value();
    var edit = dialog.edit;
    if (!edit || !edit.id() || dialog.is_saving()) return;
    if (!confirm("「"+edit.code()+" "+edit.name()+"」を削除しますか？")) {
      return;
    }
    dialog.is_saving(true);
    edit.destroy().then(function(kamoku) {
      self.kamokus.remove(edit);
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      closeKamoku();
    }).catch(function(err) {
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      if (err && err.status == 404) {
        self.removeKamoku(edit);
        closeKamoku();
      } else {
        alert("エラーが発生しました");
      }
    });
  };
}

function TmplManager(tabbar, dialogManager, kamokuManager) {
  var self = this;
  self.tabInfo = {label:"ひな型",template:"template-tmpls",data:self};
  self.tmpls = ko.observableArray();
  function compareTmplByName(a,b) {
    if (a.name() < b.name()) return -1;
    if (a.name() > b.name()) return 1;
    return a.id() - b.id();
  }
  var dialog = self.dialog = {
    template:"template-tmpl-form",
    id: "tmpl-dialog",
    kamokus: kamokuManager.kamokus,
    is_saving: ko.observable(false),
    value: ko.observable(null),
    list: ko.observable(null),
    edit: null,
  };
  dialog.data = dialog;
  dialog.title = ko.pureComputed(function() {
    var value = dialog.value();
    return value? value.id()? "ひな型の更新": "ひな型の追加": null;
  });
  dialog.onDialogOpen = function(handle, element) {
    element.querySelector("select, input").focus();
  };
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    dialog.is_saving(false);
    dialog.value(null);
    dialog.list(null);
    dialog.edit = null;
    dialog.handle = null;
  };
  dialog.items = ko.computed(function() {
    var list = dialog.list();
    if (!list) return [];
    return list.items().map(function(item) {
      if (!item.kamoku_code) {
        item.kamoku_code = kamokuManager.computedKamokuCode(item.kamoku_id);
      }
      if (!item.kamoku) {
        item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
      }
      if (!item.kamoku_name) {
        item.kamoku_name = ko.computed(function() {
          return this.kamoku() && this.kamoku().name();
        }, item);
      }
      if (!item.kasiInput) {
        item.kasiInput = self.computedAmountInput(item, -1);
      }
      if (!item.kariInput) {
        item.kariInput = self.computedAmountInput(item, 1);
      }
      return item;
    });
  });
  self.computedAmountInput = function(item, dir) {
    return ko.pureComputed({
      read: function() {
        var amount = item.amount();
        return item.dir() == dir? amount: null;
      },
      write: function(amount) {
        if (amount == "") {
          if (item.dir() == dir) {
            item.dir(null);
            item.amount(null);
          }
          return;
        }
        var lastDir = item.dir.peek();
        var lastAmount = item.amount.peek() || 0;
        amount = parseInt(amount) || 0;
        if (lastDir == null) {
          item.dir(dir);
          item.amount(amount);
        } else if (lastDir == dir) {
          if (amount != lastAmount) {
            item.amount(amount);
          }
        } else {
          if (lastAmount > amount) {
            item.amount(lastAmount - amount);
          } else if (lastAmount == amount) {
            item.dir(null);
            item.amount(null);
          } else {
            item.dir(dir);
            item.amount(amount - lastAmount);
          }
        }
      },
      owner: item
    }).extend({notify:'always'});
  };

  self.loadAll = function() {
    self.tmpls([]);
    return Promise.all([Template.all()]).then(function(res){
      var tmpls = res[0]();
      self.tmpls(tmpls);
      self.tmpls.sort(compareTmplByName);
    });
  };

  dialog.onKeyPress = function($data, event) {
    var key = event.key || event.keyCode;
    var mod = (event.ctrlKey<<0)|(event.shiftKey<<1)|(event.altKey<<2);
    var items = dialog.list().items;
    var elem = event.target;
    if ((""+elem.id).indexOf("item-") != 0) return true;
    var $context = ko.contextFor(elem);
    var index = $context.$index(), length = items().length;
    var id = (""+elem.id).split(/-/);
    id[1] = +id[1];
    id[2] = +id[2];
    if (event.isComposing === true || event.repeat === true) {
      return true;
    }
    if (key == 'Enter' || key == 13) {
      if (mod == 1) {
        id[1]++;
        id[2] = 0;
        if (id[1] == length) {
          items.push(new Item());
        }
        ko.tasks.runEarly();
      } else if (mod == 2) {
        if (id[1] == 0) return false;
        id[1]--;
      } else if (mod == 0) {
        if (id[1] == length-1) return false;
        id[1]++;
      } else {
        return true;
      }
    } else {
      return true;
    }
    event.preventDefault();
    event.stopPropagation();
    elem.blur();
    elem.focus();
    setTimeout(function() {
      elem = document.getElementById(id.join("-"));
      if (elem) {
        elem.focus();
      }
    }, 0);
    return false;
  };
  function openTmpl(tmpl) {
    var handle = dialogManager.open(dialog);
    if (!handle) {
      return false;
    }
    dialog.handle = handle;
    var value = new Template(tmpl&&tmpl.toObject());
    dialog.is_saving(false);
    dialog.value(value);
    dialog.list(new List({items:value.json()}));
    dialog.edit = tmpl;
    return true;
  }
  function closeTmpl() {
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  }
  dialog.closeTmpl = closeTmpl;
  dialog.addTmpl = function() { return openTmpl(); };
  dialog.editTmpl = function() { return openTmpl(this); };
  dialog.saveTmpl = function() {
    var value = dialog.value();
    var list = dialog.list();
    var edit = dialog.edit;
    if (!value) return;
    dialog.is_saving(true);
    value.json(list.toParams().items);
    value.save().then(function(tmpl) {
      if (edit) {
        edit.assign(tmpl.toObject());
      } else {
        self.tmpls.push(tmpl);
      }
      self.tmpls.sort(compareTmplByName);
      if (value == dialog.value()) {
        dialog.is_saving(false);
        closeTmpl();
      }
    }).catch(function(err) {
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      if (err.errors) {
      } else {
        alert("エラーが発生しました");
      }
    });
  };
  dialog.delTmpl = function() {
    var value = dialog.value();
    var edit = dialog.edit;
    if (!edit || !edit.id()) return;
    if (!confirm("ひな型「"+value.name()+"」を削除しますか？")) {
      return;
    }
    dialog.is_saving(true);
    edit.destroy().then(function(tmpl) {
      self.tmpls.remove(edit);
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      closeTmpl();
    }).catch(function(err) {
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      if (err.errors) {
      } else if (err && err.status == 404) {
        self.tmpls.remove(edit);
        closeTmpl();
      } else {
        alert("エラーが発生しました");
      }
    });
  };
  dialog.addItem = function() {
    var list = dialog.list();
    if (list) {
      list.items.push(new Item());
    }
  };
  dialog.removeItem = function($data) {
    var list = dialog.list();
    if (list) {
      list.items.remove($data);
    }
  };
}

function ListManager(tabbar, dialogManager, kamokuManager, tmplManager, date) {
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
  var dialog = self.dialog = {
    template:"template-list-form",
    id: "list-dialog",
    kamokus: kamokuManager.kamokus,
    is_saving: ko.observable(false),
    value: ko.observable(null),
    edit: null,
    tmpl: ko.observable(null),
    tmpls: tmplManager.tmpls,
  };
  dialog.data = dialog;
  dialog.title = ko.pureComputed(function() {
    var value = dialog.value();
    return value? value.id()? "仕訳の詳細": "仕訳の作成": null;
  });
  dialog.onDialogOpen = function(handle, element) {
    element.querySelector("select, input").focus();
  };
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    dialog.is_saving(false);
    dialog.value(null);
    dialog.edit = null;
    dialog.handle = null;
    closeToTmpl();
  };
  dialog.items = ko.computed(function() {
    var list = dialog.value();
    if (!list) return [];
    if (!list.id() && list.items().length < 2) {
      while (list.items().length < 2) {
        list.items.push(new Item());
      }
      return [];
    }
    return list.items().map(function(item) {
      if (!item.kamoku_code) {
        item.kamoku_code = kamokuManager.computedKamokuCode(item.kamoku_id);
      }
      if (!item.kamoku) {
        item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
      }
      if (!item.kamoku_name) {
        item.kamoku_name = ko.computed(function() {
          return this.kamoku() && this.kamoku().name();
        }, item);
      }
      if (!item.kasiInput) {
        item.kasiInput = self.computedAmountInput(item, -1);
      }
      if (!item.kariInput) {
        item.kariInput = self.computedAmountInput(item, 1);
      }
      return item;
    });
  });
  self.computedAmountInput = function(item, dir) {
    return ko.pureComputed({
      read: function() {
        var amount = item.amount();
        return item.dir() == dir? amount: null;
      },
      write: function(amount) {
        if (amount == "") {
          if (item.dir() == dir) {
            item.dir(null);
            item.amount(null);
          }
          return;
        }
        var lastDir = item.dir.peek();
        var lastAmount = item.amount.peek() || 0;
        amount = parseInt(amount) || 0;
        if (lastDir == null) {
          item.dir(dir);
          item.amount(amount);
        } else if (lastDir == dir) {
          if (amount != lastAmount) {
            item.amount(amount);
          }
        } else {
          if (lastAmount > amount) {
            item.amount(lastAmount - amount);
          } else if (lastAmount == amount) {
            item.dir(null);
            item.amount(null);
          } else {
            item.dir(dir);
            item.amount(amount - lastAmount);
          }
        }
      },
      owner: item
    }).extend({notify:'always'});
  };
  dialog.tmpl.subscribe(function(tmpl) {
    if (!tmpl) return;
    var list = dialog.value();
    var items = tmpl.json();
    if (items && items.length) {
      items.forEach(function(item, index) {
        if (list.items()[index]) {
          list.items()[index].assign(item);
        } else {
          list.items.push(new Item(item));
        }
      });
    }
    dialog.tmpl(null);
  });

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
          item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
        });
      });
      self.lists(lists);
      self.lists.sort(compareListByDate);
      page.setTitleInfo(self.date());
    });
  };

  dialog.onKeyPress = function($data, event) {
    var key = event.key || event.keyCode;
    var mod = (event.ctrlKey<<0)|(event.shiftKey<<1)|(event.altKey<<2);
    var items = dialog.value().items;
    var elem = event.target;
    if ((""+elem.id).indexOf("item-") != 0) return true;
    var $context = ko.contextFor(elem);
    var index = $context.$index(), length = items().length;
    var id = (""+elem.id).split(/-/);
    id[1] = +id[1];
    id[2] = +id[2];
    if (event.isComposing === true || event.repeat === true) {
      return true;
    }
    if (key == 'Enter' || key == 13) {
      if (mod == 1) {
        id[1]++;
        id[2] = 0;
        if (id[1] == length) {
          items.push(new Item());
        }
        ko.tasks.runEarly();
      } else if (mod == 2) {
        if (id[1] == 0) return false;
        id[1]--;
      } else if (mod == 0) {
        if (id[1] == length-1) return false;
        id[1]++;
      } else {
        return true;
      }
    } else {
      return true;
    }
    event.preventDefault();
    event.stopPropagation();
    elem.blur();
    elem.focus();
    setTimeout(function() {
      elem = document.getElementById(id.join("-"));
      if (elem) {
        elem.focus();
      }
    }, 0);
    return false;
  };
  function openList(list) {
    dialog.value(null);
    Promise.resolve().then(function() {
      return list? List.get(list.id()): new List({date:self.date()});
    }).then(function(list) {
      var handle = dialogManager.open(dialog);
      if (!handle) {
        return;
      }
      dialog.handle = handle;
      dialog.value(list);
    });
    dialog.edit = list;
    return true;
  }
  function closeList() {
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  }
  dialog.closeList = closeList;
  dialog.addList = function() { return openList(); };
  dialog.editList = function() { return openList(this); };
  dialog.saveList = function() {
    var value = dialog.value();
    var edit = dialog.edit;
    if (!value) return;
    dialog.is_saving(true);
    // remove if completely unset
    value.items.remove(function(item) { return item.isEmpty(); });
    value.save().then(function(list) {
      if (edit) {
        edit.assign(list.toObject());
        edit.items().forEach(function(item) {
          item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
        });
      } else {
        list.items().forEach(function(item) {
          item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
        });
        self.lists.push(list);
      }
      self.lists.sort(compareListByDate);
      if (value == dialog.value()) {
        dialog.is_saving(false);
        closeList();
      }
    }).catch(function(err) {
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      if (err.errors) {
      } else {
        alert("エラーが発生しました");
      }
    });
  };
  dialog.delList = function() {
    var value = dialog.value();
    var edit = dialog.edit;
    if (!edit || !edit.id()) return;
    if (!confirm(value.date()+"の仕訳を削除しますか？")) {
      return;
    }
    dialog.is_saving(true);
    edit.destroy().then(function(list) {
      self.lists.remove(edit);
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      closeList();
    }).catch(function(err) {
      if (value != dialog.value()) return;
      dialog.is_saving(false);
      if (err.errors) {
      } else if (err && err.status == 404) {
        self.lists.remove(edit);
        closeList();
      } else {
        alert("エラーが発生しました");
      }
    });
  };
  dialog.addItem = function() {
    var value = dialog.value();
    if (value) {
      value.items.push(new Item());
    }
  };
  dialog.removeItem = function($data) {
    var value = dialog.value();
    if (value) {
      value.items.remove($data);
    }
  };
  dialog.openToTmpl = function() {
    if (!dialog.value()) {
      return;
    }
    var handle = dialogManager.open(subdialog);
    if (!handle) {
      return;
    }
    subdialog.handle = handle;
    subdialog.value(new Template());
    subdialog.list = dialog.value().toParams();
  };
  function closeToTmpl() {
    if (subdialog.handle) {
      dialogManager.close(subdialog.handle);
    }
  }
  var subdialog = {
    template:"template-list2tmpl-form",
    id: "to-tmpl-dialog",
    is_saving: ko.observable(false),
    value: ko.observable(null),
    list: null
  };
  subdialog.data = subdialog;
  subdialog.title = ko.observable("ひな型として保存");
  subdialog.onDialogOpen = function(handle, element) {
    element.querySelector("select, input").focus();
  };
  subdialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    subdialog.is_saving(false);
    subdialog.value(null);
    subdialog.list = null;
    subdialog.handle = null;
  };
  subdialog.saveAsTmpl = function() {
    var value = subdialog.value();
    var list = subdialog.list;
    if (!value) return;
    subdialog.is_saving(true);
    if (list.items) {
      list.items.forEach(function(item) {
        delete item.list_id;
        delete item.dir;
        delete item.amount;
      });
      value.json(list.items);
    }
    value.save().then(function(tmpl) {
      if (value == subdialog.value()) {
        subdialog.is_saving(false);
        closeToTmpl();
        tmplManager.tmpls.push(tmpl);
      }
    }).catch(function(err) {
      if (value != subdialog.value()) return;
      subdialog.is_saving(false);
      if (err.errors) {
      } else {
        alert("エラーが発生しました");
      }
    });
  };
}

function SummaryManager(tabbar, dialogManager, kamokuManager, date) {
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
  var dialog = self.dialog = {
    template:"template-carryover-form",
    id: "list-dialog",
    is_saving: ko.observable(false),
    value: ko.observable(null),
  };
  dialog.data = dialog;
  dialog.title = ko.pureComputed(function() {
    return dialog.value().date() + "への繰越の作成";
  });
  dialog.onDialogOpen = function(handle, element) {
    element.querySelector(".dialog-body button").focus();
  };
  dialog.onDialogClose = function(handle) {
    if (dialog.handle != handle) {
      return;
    }
    dialog.is_saving(false);
    dialog.value(null);
    dialog.handle = null;
  };
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
    return json_api.get("/summary/"+self.date()).then(function(results){
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
          summary.kamoku = kamokuManager.computedKamoku(summary.kamoku_id);
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
      item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
    }
  };

  function compareCategoryById(a,b) { return a.id() - b.id(); }
  function compareKamokuByCode(a,b) {
    var d = compareCategoryById(a.category(), b.category());
    if (d) return d;
    if (a.code() < b.code()) return -1;
    if (a.code() > b.code()) return 1;
    return 0;
  }
  function compareSummaryItem(a,b) {
    return compareKamokuByCode(a.kamoku(), b.kamoku());
  }

  self.makeCarryOver = function() {
    if (dialog.handle) return;
    var handle = dialogManager.open(dialog);
    if (!handle) {
      return;
    }
    dialog.handle = handle;
    var list = new List();
    list.date(date2str(new Date(next_month(self.date()))));
    var carry = new Item();
    var carry_amount = 0;
    kamokuManager.kamokus().forEach(function(kamoku) {
      if (kamoku.category_id() == 4 && !carry.kamoku) {
        carry.kamoku_id(kamoku.id());
        carry.kamoku = kamokuManager.computedKamoku(carry.kamoku_id);
      }
    });
    list.items.push(carry);
    self.summary().forEach(function(row) {
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
    dialog.value(list);
    return true;
  };

  function closeList() {
    if (dialog.handle) {
      dialogManager.close(dialog.handle);
    }
  }
  dialog.closeList = closeList;
  dialog.saveList = function() {
    var value = dialog.value();
    dialog.is_saving(true);
    value.save().then(function(list) {
      list.items().forEach(function(item) {
        item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
      });
      closeList();
    }).catch(function(err) {
      alert("エラーが発生しました");
      closeList();
    });
  };
}

function ByKamokuManager(tabbar, dialogManager, kamokuManager, date) {
  var self = this;
  self.tabInfo = {label:"科目別",template:"template-bykamoku",data:self};
  self.search = new ByKamoku({
    date_from: params.get("date_from") || date() || month2str(new Date()),
    date_to: params.get("date_to") || date() || month2str(new Date()),
    kamoku_id: params.get("kamoku_id"),
  });
  self.search.kamokus = kamokuManager.kamokus;
  self.search.kamoku = kamokuManager.computedKamoku(self.search.kamoku_id);
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
        item.kamoku = kamokuManager.computedKamoku(item.kamoku_id);
        item.sum = sum;
      });
      self.items(items);
    });
  };
}
