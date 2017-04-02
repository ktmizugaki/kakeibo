var page = (function(_global) {
  ko.options.deferUpdates = true;
  var tab = koTabbar({});
  var dialogManager = koDialogManager({});
  var date = ko.observable(params.get("date") || month2str(new Date()));
  date.subscribe(function(date) { params.set("date", date); });
  params.query.subscribe(function() { date(params.get("date")); });
  var kamokus = new KamokuManager(tab, dialogManager);
  var lists = new ListManager(tab, dialogManager, kamokus, date);
  var summary = new SummaryManager(tab, dialogManager, kamokus, date);
  var data = {
    tab: tab,
    dialogManager: dialogManager,
  };
  var initial = true;

  return {
    init: function page_init() {
      if (initial) {
        ko.applyBindings(data, document.body);
        data.tab.selected.subscribe(function(tab) { if (tab) params.path(tab); });
        params.path.subscribe(function(path) { tab.setSelected(path); });
      }
      initial = false;
      data.tab.selected(null);
      Promise.all([kamokus.loadAll()]).then(function(res){
        data.tab.addTab(ko.utils.extend(kamokus.tabInfo, {name:"kamokus"}));
        data.tab.addTab(ko.utils.extend(lists.tabInfo, {name:"lists"}));
        data.tab.addTab(ko.utils.extend(summary.tabInfo, {name:"summary"}));
        if (!data.tab.setSelected(params.path())) {
          data.tab.selected("kamokus");
        }
      }).catch(function(err){
        alert("データのロードエラーです");
      });
    },
  };
})(this);
