function ListForm(params) {
  this.dialogManager = params.dialogManager;
  this.dataStore = params.dataStore;
  this.kamokus = params.dataStore.kamokus;
  this.subdialog = params.subdialog;
  this.is_saving = ko.observable(false);
  this.value = ko.observable(params.value());
  this.list = ko.pureComputed(function() {
    return this.value();
  }.bind(this));
  this.items = ko.computed(this.items.bind(this));
  this.tmpl = ko.observable(null);
  this.tmpl.subscribe(this.onSelectTmpl.bind(this));
  this.tmpls = this.dataStore.tmpls;
  this.onSave = params.onSave;
  this.onDel = params.onDel;
  this.onToTmpl = params.onToTmpl;
  this.save = this.save.bind(this);
  this.del = this.del.bind(this);
  this.toTmpl = this.toTmpl.bind(this);
}
ListForm.prototype.items = function() {
  var dataStore = this.dataStore;
  var list = this.value();
  if (!list) return [];
  if (!list.id()) {
    while (list.items().length < 2) {
      list.items.push(new Item());
    }
  }
  return list.items().map(function(item) {
    return new ItemInputProxy(item, dataStore);
  });
};
ListForm.prototype.onSelectTmpl = function(tmpl) {
  if (!tmpl) return;
  var list = this.value();
  var json = tmpl.json()
  var date = json.date;
  var items = json.items;
  if (date) {
    if (date.match(/^[0-9]+$/)) {
      list.date(change_date(list.date(), parseInt(date)));
    } else if (date === 'E') {
      list.date(change_date(list.date(), date));
    }
  }
  if (items && items.length) {
    items.forEach(function(item, index) {
      if (list.items()[index]) {
        list.items()[index].assign(item);
      } else {
        list.items.push(new Item(item));
      }
    });
  }
  this.tmpl(null);
};
ListForm.prototype.save = function() {
  var self = this;
  var dataStore = self.dataStore;
  var value = self.value();
  if (!value) return;
  self.is_saving(true);
  /* remove if completely unset */
  value.items.remove(function(item) { return item.isEmpty(); });
  value.save().then(function(list) {
    list.items().forEach(function(item) {
      item.kamoku = dataStore.computedKamoku(item.kamoku_id);
    });
    self.is_saving(false);
    if (typeof self.onSave === 'function') {
      self.onSave(list);
    }
  }).catch(function(err) {
    self.is_saving(false);
    if (err.errors) {
    } else {
      alert("エラーが発生しました");
    }
  });
};
ListForm.prototype.del = function() {
  var self = this;
  var value = self.value();
  if (!value || !value.id() || self.is_saving()) return;
  if (!confirm(value.date()+"の仕訳を削除しますか？")) {
    return;
  }
  self.is_saving(true);
  value.destroy().then(function(list) {
    self.is_saving(false);
    if (typeof self.onDel === 'function') {
      self.onDel(value);
    }
  }).catch(function(err) {
    self.is_saving(false);
    if (err.errors) {
    } else if (err && err.status == 404) {
      self.lists.remove(value);
      if (typeof self.onDel === 'function') {
        self.onDel(value);
      }
    } else {
      alert("エラーが発生しました");
    }
  });
};
ListForm.prototype.toTmpl = function() {
  if (!this.value()) {
    return;
  }
  if (typeof this.onToTmpl === 'function') {
    this.onToTmpl(this.value());
  }
};
ko.components.register("list-form", {
  viewModel: ListForm,
  template: { fetch: "html/list-form.html" }
});
ko.components.get("list-form", function(res){});
