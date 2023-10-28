function ByKamokuPage(tabbar, dialogManager, dataStore, date) {
  var self = this;
  self.tabInfo = {label:"科目別",component:"bykamoku-page",data:self};
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

ko.components.register("bykamoku-page", {
  template: { fetch: "html/bykamoku-page.html" }
});
