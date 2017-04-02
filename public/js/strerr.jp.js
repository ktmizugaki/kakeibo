function localizedError(prop, msgs, aliases) {
  var self = localizedError;
  return msgs && msgs.map(function(val) {
    return self.getMessage((aliases&&aliases[val])||val)
      .replace(/{}/g, self.getName(prop));
  });
}
localizedError.names = {};
localizedError.names["category"] = "分類";
localizedError.names["code"] = "コード";
localizedError.names["name"] = "名称";
localizedError.names["date"] = "日付";
localizedError.names["desc"] = "摘要";
localizedError.names["kamoku"] = "勘定科目";
localizedError.names["amount"] = "金額";
localizedError.msgs = {};
localizedError.msgs["is required"] = "{}は必須項目です";
localizedError.msgs["must exist"] = "指定された{}は存在しません";
localizedError.msgs["is not valid"] = "{}が無効な値です";
localizedError.msgs["duplicates"] = "{}は既に存在しています";
localizedError.msgs["format digit"] = "{}は数字で入力してください";
localizedError.msgs["does not match"] = "{}が一致しません";
localizedError.msgs["format date"] = "{}は YYYY-MM-DD で入力して下さい"
localizedError.getName = function(name){return this.names[name] || name};
localizedError.getMessage = function(msg){return this.msgs[msg] || "{}"+msg};
