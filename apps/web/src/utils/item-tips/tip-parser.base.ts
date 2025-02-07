// function itemTip(a, e) {
//   var t = window.htmlspecialchars;
//   e ||
//     (t = function (a) {
//       return a;
//     });
//   var r = ["", "", "", "", "", "", "", "", "", ""];
//   if (void 0 === l) var l = {};
//   isset(a.name) &&
//     (r[0] = '<b class="item-name">'.concat(parseItemBB(a.name), "</b>")),
//     isset(a.cl) &&
//       (r[1] =
//         '<span class="type-text">' +
//         _t("itype %type% %value%", {
//           "%type%": _t("type"),
//           "%value%": eq.classes[a.cl],
//         }) +
//         "</span><br />");
//   var s = !1,
//     n = !1,
//     b = !1,
//     _ = a.stat.split(";"),
//     c = _.indexOf("cursed") >= 0,
//     o = c ? _t("cursed_prefix") + " " : "";
//   for (var i in _)
//     if ("string" == typeof _[i]) {
//       var v = _[i].split("=");
//       switch (v[0]) {
//         case "name":
//           (r[0] = "<b>" + t(parseItemBB(v[1])) + "</b>"),
//             (r[0] += "<i>" + t(parseItemBB(a.name)) + "</i>");
//           break;
//         case "rarity":
//           if ("common" === v[1]) break;
//           r[0] += '<b class="'
//             .concat(v[1], '">* ')
//             .concat(o)
//             .concat(_t("type_".concat(v[1])), " *</b>");
//           break;
//         case "unique":
//           r[0] += "<b class=unique>* " + o + _t("type_unique") + " *</b>";
//           break;
//         case "heroic":
//           r[0] += "<b class=heroic>* " + o + _t("type_heroic") + " *</b>";
//           break;
//         case "legendary":
//           r[0] += "<b class=legendary>* " + o + _t("type_legendary") + " *</b>";
//           break;
//         case "artefact":
//           r[0] += "<b class=artefact>* " + o + _t("type_artifact") + " *</b>";
//           break;
//         case "upgraded":
//           r[0] += "<b class=upgraded>* " + o + _t("type_modified") + " *</b>";
//           break;
//         case "enhancement_upgrade_lvl":
//           var u = $(r[0]);
//           u.append(" +".concat(v[1])), (r[0] = u[0].outerHTML);
//           break;
//         case "bonus":
//           var p = _slicedToArray(v[1].split(","), 2),
//             k = p[0],
//             d = p[1],
//             m = "(+",
//             f = ")",
//             h = "",
//             g = void 0;
//           switch (k) {
//             case "critmval":
//               (h = "%"),
//                 (g = _t(
//                   "bonus_of-".concat(k, " %val%"),
//                   createTransVal(d, h, m, f),
//                   "newOrder"
//                 ));
//               break;
//             case "sa":
//               g = _t(
//                 "no_percent_bonus_sa %val%",
//                 createTransVal(d / 100, h, m, f)
//               );
//               break;
//             case "ac":
//               g = _t("item_".concat(k, " %val%"), createTransVal(d, h, m, f));
//               break;
//             case "act":
//             case "resfire":
//             case "reslight":
//             case "resfrost":
//               (h = "%"),
//                 (g = _t(
//                   "item_".concat(k, " %val%"),
//                   createTransVal(d, h, m, f),
//                   "newOrder"
//                 ));
//               break;
//             case "crit":
//             case "critval":
//             case "resdmg":
//               (h = "%"),
//                 (g = _t(
//                   "bonus_".concat(k, " %val%"),
//                   createTransVal(d, h, m, f),
//                   "newOrder"
//                 ));
//               break;
//             case "slow":
//               g = _t(
//                 "bonus_".concat(k, " %val%"),
//                 createTransVal(d / 100, h, m, f)
//               );
//               break;
//             default:
//               g = _t("bonus_".concat(k, " %val%"), createTransVal(d, h, m, f));
//           }
//           r[4] += '<span style="color: #87f187;">'.concat(
//             _t("enh_bonus %val%", { "%val%": g }),
//             "</span><br>"
//           );
//           break;
//         case "bonus_not_selected":
//           r[4] += '<span style="color: #FE5555;">'.concat(
//             _t("bonus_not_selected"),
//             "</span><br>"
//           );
//           break;
//         case "upg":
//           var w = parseItemStat(a.stat);
//           (r[0] +=
//             "<b class=upgraded>* " +
//             _t("type_modification %val%", { "%val%": v[1] }) +
//             " *</b>"),
//             isset(w.upgby) &&
//               (r[7] +=
//                 '<span style="color:yellow">' +
//                 _t("type_modification_upgb %val% %name%", {
//                   "%val%": v[1],
//                   "%name%": w.upgby,
//                 }) +
//                 "</span><br />");
//           break;
//         case "improve":
//           var y = v[1].split(","),
//             q = 1;
//           switch (y[0]) {
//             case "armor":
//             case "jewels":
//               q = 1.3;
//               break;
//             case "armorb":
//             case "weapon":
//               q = 1;
//           }
//           (r[3] +=
//             _t("improves %items%", { "%items%": _t("improve_" + y[0]) }) +
//             "<br />"),
//             (r[3] +=
//               _t("types_list %upg_normal% %upg_uni% %upg_hero%", {
//                 "%upg_normal%": Math.round(q * y[1]),
//                 "%upg_uni%": Math.round(q * y[1] * 0.7),
//                 "%upg_hero%": Math.round(q * y[1] * 0.4),
//               }) + "<br />"),
//             (r[3] += _t("improve_item_bound_info") + "<br />");
//           break;
//         case "upgby":
//         case "doubleshoot":
//         case "created":
//         case "lootbox":
//         case "lootbox2":
//         case "animation":
//         case "unbind_credits":
//         case "book":
//         case "price":
//         case "resp":
//         case "key":
//         case "mkey":
//         case "rkey":
//         case "rlvl":
//         case "motel":
//         case "emo":
//         case "quest":
//         case "play":
//         case "szablon":
//         case "null":
//         case "progress":
//           break;
//         case "lowreq":
//           if (!v[1]) break;
//           r[0] +=
//             "<b class=upgraded>* " +
//             _t("type_lower_req %val%", { "%val%": v[1] }) +
//             " *</b>";
//           break;
//         case "expires":
//           if (v[1] - unix_time() < 0) {
//             var x = !0;
//             r[11] =
//               '<b class="item-expired expires">' + _t("item_expired") + "</b>";
//           } else
//             r[11] =
//               '<b class="item-expired">' +
//               _t("valid_expires %date%", {
//                 "%val%": calculateDiffFull(v[1], unix_time()),
//               }) +
//               "</b>";
//           break;
//         case "expire_date":
//           r[1] += _t("expire_date %date%", { "%date%": v[1] }) + "<br>";
//           break;
//         case "expire_duration":
//           var T = convertTimeToSec(v[1]),
//             M = convertSecToTime(T),
//             I = "";
//           for (var S in M)
//             if (0 !== M[S])
//               switch (S) {
//                 case "d":
//                   I +=
//                     _t("time_days %val%", { "%val%": M[S] }, "time_diff") + " ";
//                   break;
//                 case "h":
//                   I += _t("time_h %val%", { "%val%": M[S] }, "time_diff") + " ";
//                   break;
//                 case "m":
//                   I +=
//                     _t("time_min %val%", { "%val%": M[S] }, "time_diff") + " ";
//                   break;
//                 case "s":
//                   I += _t("time_sec %val%", { "%val%": M[S] }, "time_diff");
//               }
//           r[11] =
//             '<b class="item-expired">' +
//             _t("expire_duration %time%", { "%time%": I }) +
//             "</b>";
//           break;
//         case "ac":
//           r[1] += _t("item_ac %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "act":
//           r[1] += _t("item_act %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "resfire":
//           r[1] += _t("item_resfire %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "reslight":
//           r[1] += _t("item_reslight %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "resfrost":
//           r[1] += _t("item_resfrost %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "dmg":
//           r[1] +=
//             _t("item_dmg %val%", { "%val%": v[1].replace(",", "-") }) + "<br>";
//           break;
//         case "pdmg":
//           r[1] += _t("item_pdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "perdmg":
//           r[1] += _t("item_perdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "zr":
//           r[2] += _t("item_zr %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "sila":
//           r[2] += _t("item_sila %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "int":
//           r[2] += _t("item_int %val%") + "<br>";
//           break;
//         case "lowcritallval":
//           r[3] += _t("bonus_lowcritallval %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lowheal2turns":
//           r[3] += _t("bonus_lowheal2turns %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "resacdmg":
//           r[3] += _t("bonus_resacdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "resmanaendest":
//           r[3] +=
//             _t("bonus_resmanaendest %val%", {
//               "%val%": v[1],
//               "%val2%": Math.max(1, Math.round(0.444 * v[1])),
//             }) + "<br>";
//           break;
//         case "str":
//           r[2] += _t("skill_str %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "of-str":
//           r[2] += _t("skill_of-str %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "agi":
//           r[2] += _t("skills_agi %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "firebon":
//           r[2] += _t("skills_firebon %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lightbon":
//           r[2] += _t("skills_lightbon %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "frostbon":
//           r[2] += _t("skills_frostbon %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "critslow":
//           r[3] +=
//             _t("skills_critslow_new_old %val%", { "%val%": 10 * v[1] }) +
//             "<br>";
//           break;
//         case "critsa":
//           r[3] += _t("skills_critsa %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lastcrit":
//           r[3] += _t("skills_lastcrit %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "decevade":
//           r[3] += _t("skills_decevade %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "redslow":
//           r[3] += _t("skills_redslow %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "woundred":
//           r[3] += _t("skills_woundred %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "healpower":
//           r[3] += _t("skills_healpower %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "engback":
//           r[3] += _t("skills_engback %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "sa-clothes":
//           r[3] += _t("skills_sa-clothes %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "red-sa":
//           r[3] += _t("skills_red-sa %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "footshoot":
//           r[3] += _t("skills_footshoot %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "critwound":
//           r[3] += _t("skills_critwound %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "swing":
//           r[3] += _t("skills_swing %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "distract":
//           r[3] += _t("skills_distract %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "injure":
//           r[3] += _t("skills_injure %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "rage":
//           r[3] +=
//             _t("skills_rage %val% %turn%", {
//               "%val%": v[1],
//               "%turn%": parseInt(v[1]) > 1 ? _t("turns") : _t("turn"),
//             }) + "<br>";
//           break;
//         case "reusearrows":
//           r[3] += _t("skills_reusearrows %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "pcontra":
//           r[3] += _t("skills_pcontra %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "fastarrow":
//           r[3] += _t("skills_fastarrow %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "bandage":
//           r[3] += _t("skills_bandage %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "set":
//           r[3] += _t("skills_set %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "fireshield":
//           r[3] += _t("skills_fireshield %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "frostshield":
//           r[3] += _t("skills_frostshield %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lightshield":
//           r[3] += _t("skills_lightshield %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "longfireshield":
//           r[3] += _t("skills_longfireshield %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "longfrostshield":
//           r[3] +=
//             _t("skills_longfrostshield %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "longlightshield":
//           r[3] +=
//             _t("skills_longlightshield %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "soullink":
//           r[3] += _t("skills_soullink %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "poisonbon":
//           r[3] += _t("skills_poisonbon %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "of-thirdatt":
//           r[3] += _t("skills_of-thirdatt %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "woundchance":
//           r[3] += _t("skills_woundchance %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "wounddmgbon":
//           r[3] += _t("skills_wounddmgbon %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "arrowrain":
//           r[3] += _t("skills_arrowrain %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "disturb":
//           r[3] +=
//             _t("skills_disturb %val%", {
//               "%val%": v[1],
//               "%val2%": 2 * parseInt(v[1]),
//             }) + "<br>";
//           break;
//         case "shout":
//           r[3] +=
//             _t("skills_shout %val%", {
//               "%val%":
//                 v[1] > 1
//                   ? _t("enemies %amount%", { "%amount%": v[1] })
//                   : _t("oneenemy"),
//             }) + "<br>";
//           break;
//         case "insult":
//           r[3] += _t("skills_insult %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "frostpunch":
//           r[2] += _t("skills_frostpunch %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "redstun":
//           r[3] += _t("skills_redstun %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lightmindmg":
//           r[2] += _t("skills_lightmindmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "actdmg":
//           r[2] += _t("skills_actdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "hpsa":
//           r[2] += _t("skills_hpsa %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "mresdmg":
//           r[2] += _t("skills_mresdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "cursed":
//           r[7] += _t("item_cursed") + "<br>";
//           break;
//         case "reqw":
//           r[9] += '<b class="att">' + _t("skills_req_weapon");
//           var A = v[1].split(",");
//           for (var i in A)
//             r[9] +=
//               (isset(eq.weapon[A[i]]) ? eq.weapon[A[i]] : "???") +
//               (isset(A[parseInt(i) + 1]) ? ", " : "");
//           r[9] += "</b><br>";
//           break;
//         case "rskl":
//           isset(a.tmpSkills) &&
//             isset(a.tmpSkills.names) &&
//             ((j = v[1].split("-")),
//             isset(a.tmpSkills.names[j[0]])
//               ? (r[9] +=
//                   '<b class="att' +
//                   (j[1] > a.tmpSkills.names[j[0]].l ? " noreq" : "") +
//                   '">' +
//                   _t("skills_req_skill") +
//                   "<br>&nbsp;&nbsp;&nbsp;" +
//                   (isset(a.tmpSkills.names[j[0]])
//                     ? a.tmpSkills.names[j[0]].n
//                     : "???") +
//                   " (" +
//                   j[1] +
//                   ")</b><br>")
//               : (r[9] += '<b class="att noreq">error</b>'));
//           break;
//         case "hp":
//           r[3] += _t("bonus_hp %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "sa1":
//         case "sa":
//           r[3] +=
//             _t("no_percent_bonus_sa %val%", { "%val%": mp(v[1] / 100) }) +
//             "<br>";
//           break;
//         case "ds":
//           r[3] += _t("bonus_ds %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "dz":
//           r[3] += _t("bonus_dz %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "di":
//           r[3] += _t("bonus_di %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "da":
//           r[3] += _t("bonus_da %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "gold":
//           if (v[1].split(":").length > 1) {
//             I = (D = v[1].replace(/[\(\)]/g, "")).split(":");
//             D = _t("start") + " " + I[0] + " " + _t("stop") + " " + I[1];
//           } else D = mp(v[1]);
//           r[3] += _t("bonus_gold %val%", { "%val%": D }) + "<br>";
//           break;
//         case "creditsbon":
//           v[1] && v[1] > 1
//             ? (r[3] += _t("bonus_creditsbon %val%", { "%val%": v[1] }) + "<br>")
//             : (r[3] += _t("bonus_creditsbon") + "<br>");
//           break;
//         case "runes":
//           r[3] += _t("bonus_runes %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "goldpack":
//           r[3] += _t("bonus_goldpack %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "leczy":
//           if (v[1] > 0)
//             r[3] += _t("bonus_leczy %val%", { "%val%": v[1] }) + "<br>";
//           else if (v[1].split(":").length > 1) {
//             var D;
//             I = (D = v[1].replace(/[\(\)]/g, "")).split(":");
//             (D = _t("start") + " " + I[0] + " " + _t("stop") + " " + I[1]),
//               (r[3] += _t("bonus_truje2 %val%", { "%val%": D }) + "<br>");
//           } else
//             r[3] +=
//               _t("bonus_truje %val%", { "%val%": Math.abs(v[1]) }) + "<br>";
//           break;
//         case "perheal":
//           v[1] > 0
//             ? (r[3] +=
//                 _t("bonus_perheal %val%", { "%val%": v[1] }) + "</span><br>")
//             : (r[3] +=
//                 _t("bonus_perheal_minus %val%", {
//                   "%val%": Math.abs(v[1]) + "%",
//                 }) + "</span><br>");
//           break;
//         case "stamina":
//           r[3] += _t("stamina %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "fullheal":
//           r[3] +=
//             _t("bonus_fullheal %val%", { "%val%": round(v[1], 2) }) + "<br>";
//           break;
//         case "perheal":
//           r[3] += _t("bonus_perheal %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "blok":
//           r[3] += _t("bonus_blok %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "crit":
//           r[3] +=
//             _t("bonus_crit %val%", {
//               "%val%": (v[1].startsWith("-") ? "" : "+") + v[1],
//             }) + "<br>";
//           break;
//         case "of-crit":
//           r[3] += _t("bonus_of-crit %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "critval":
//           r[3] +=
//             _t("bonus_critval %val%", {
//               "%val%": (v[1].startsWith("-") ? "" : "+") + v[1],
//             }) + "<br>";
//           break;
//         case "of-critval":
//           r[3] += _t("bonus_of-critval %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "critmval":
//           r[3] +=
//             _t("bonus_of-critmval %val%", {
//               "%val%": (v[1].startsWith("-") ? "" : "+") + v[1],
//             }) + "<br>";
//           break;
//         case "critmval_f":
//           r[3] += _t("bonus_critmval_f %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "critmval_c":
//           r[3] += _t("bonus_critmval_c %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "critmval_l":
//           r[3] += _t("bonus_critmval_l %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "heal":
//           r[3] += _t("bonus_heal %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "evade":
//           r[3] += _t("bonus_evade %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "pierce":
//           r[3] += _t("bonus_pierce %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "pierceb":
//           r[3] += _t("bonus_pierceb %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "contra":
//           r[3] += _t("bonus_contra %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "parry":
//           r[3] += _t("bonus_parry %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "revive":
//           r[3] += _t("revive %amount%", { "%amount%": v[1] }) + "<br>";
//           break;
//         case "frost":
//           (j = v[1].split(",")),
//             (r[2] +=
//               _t("bonus_frost %val% %slow%", {
//                 "%val%": j[1],
//                 "%slow%": j[0] / 100,
//               }) + "<br>");
//           break;
//         case "poison":
//           (j = v[1].split(",")),
//             (r[2] +=
//               _t("bonus_poison %val% %slow%", {
//                 "%val%": j[1],
//                 "%slow%": j[0] / 100,
//               }) + "<br>");
//           break;
//         case "slow":
//           r[3] += _t("bonus_slow %val%", { "%val%": v[1] / 100 }) + "<br>";
//           break;
//         case "wound":
//           (j = v[1].split(",")),
//             (r[3] +=
//               _t("bonus_wound %val% %dmg%", { "%val%": j[0], "%dmg%": j[1] }) +
//               "<br>");
//           break;
//         case "fire":
//           r[2] += _t("bonus_fire %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "light":
//           r[2] +=
//             _t("bonus_light %val%", { "%val%": v[1].replace(",", "-") }) +
//             "<br>";
//           break;
//         case "adest":
//           r[3] += _t("bonus_adest %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "absorb":
//           r[3] += _t("bonus_absorb %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "absorbm":
//           r[3] += _t("bonus_absorbm %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "hpbon":
//           r[3] += _t("bonus_hpbon %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "acdmg":
//           r[3] += _t("bonus_acdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "resdmg":
//           r[3] += _t("bonus_resdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "energy":
//           v[1] > 0
//             ? (r[3] += _t("bonus_energy1 %val%", { "%val%": v[1] }) + "<br>")
//             : (r[3] +=
//                 _t("bonus_energy2 %val%", { "%val%": Math.abs(v[1]) }) +
//                 "<br>");
//           break;
//         case "energybon":
//           r[3] += _t("bonus_energybon %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "energygain":
//           r[3] += _t("bonus_energygain %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "en-regen":
//           r[3] += _t("bonus_en-regen %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "energyp":
//           v[1] > 0
//             ? (r[3] +=
//                 _t("bonus_energyp1 %val%", { "%val%": mp(v[1]) }) + "<br>")
//             : (r[3] +=
//                 _t("bonus_energyp2 %val%", { "%val%": Math.abs(v[1]) }) +
//                 "<br>");
//           break;
//         case "mana":
//           v[1] > 0
//             ? (r[3] += _t("bonus_mana1 %val%", { "%val%": v[1] }) + "<br>")
//             : (r[3] +=
//                 _t("bonus_mana2 %val%", { "%val%": Math.abs(v[1]) }) + "<br>");
//           break;
//         case "manabon":
//           r[3] += _t("bonus_manabon %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "managain":
//           r[3] += _t("bonus_managain %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "manastr":
//           r[3] += _t("bonus_manastr %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "manarestore":
//           r[3] += _t("bonus_manarestore %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "manatransfer":
//           r[3] += _t("bonus_manatransfer %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "stun":
//           r[3] += _t("bonus_stun %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "freeze":
//           r[3] += _t("bonus_freeze %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "hpcost":
//           r[3] += _t("bonus_hpcost %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "cover":
//           r[3] += _t("bonus_cover %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "allslow":
//           r[3] += _t("bonus_allslow %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "firearrow":
//         case "firepunch":
//         case "firebolt":
//           r[3] += _t("bonus_firebolt %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "firewall":
//           r[3] += _t("bonus_firewall %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "thunder":
//           r[3] += _t("bonus_thunder %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "storm":
//           r[3] += _t("bonus_storm %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lowdmg":
//           r[3] += _t("bonus_lowdmg %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "blizzard":
//           r[3] += _t("bonus_blizzard %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "sunshield":
//           r[3] +=
//             _t("bonus_sunshield %val%", { "%val%": v[1], "%val2%": v[1] / 2 }) +
//             "<br>";
//           break;
//         case "sunreduction":
//           r[3] += _t("bonus_sunreduction %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "healall":
//           r[3] += _t("bonus_healall %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "heal1":
//           r[3] += _t("bonus_heal1 %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "aura-ac":
//           r[3] += _t("bonus_aura-ac %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "aura-resall":
//           r[3] += _t("bonus_aura-resall %val%", { "%val%": mp(v[1]) }) + "<br>";
//           break;
//         case "aura-sa":
//           r[3] +=
//             _t("bonus_aura-sa %val%", { "%val%": mp(v[1] / 100) }) + "<br>";
//           break;
//         case "absorbd":
//           r[3] += _t("bonus_absorbd %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "stinkbomb":
//           r[3] +=
//             _t("bonus_stinkbomb %val% %crit%", {
//               "%val%": 2 * parseInt(v[1]),
//               "%crit%": v[1],
//             }) + "<br>";
//           break;
//         case "target_rarity":
//           var z = _t("type_".concat(v[1]));
//           r[3] += _t("bonus_".concat(v[0], " %val%"), { "%val%": z }) + "<br>";
//           break;
//         case "bonus_reselect":
//           r[3] += _t("bonus_".concat(v[0])) + "<br>";
//           break;
//         case "force_binding":
//           r[3] += _t("".concat(v[0])) + "<br>";
//           break;
//         case "abdest":
//           r[3] += _t("bonus_abdest %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "endest":
//           r[3] += _t("bonus_endest %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "manadest":
//           r[3] += _t("bonus_manadest %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lowevade":
//           r[3] += _t("bonus_lowevade %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "lowcrit":
//           r[3] += _t("bonus_lowcrit %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "arrowblock":
//           r[3] += _t("bonus_arrowblock %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "honorbon":
//           r[3] += _t("bonus_honorbon %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "enhancement_add":
//           r[3] +=
//             _t("bonus_enhancement_add %val%", { "%val%": v[1] + "%" }) + "<br>";
//           break;
//         case "enhancement_add_point":
//           r[3] += _t("bonus_enhancement_add_point") + "<br>";
//           break;
//         case "quest_expbon":
//           v[1] > 0
//             ? (r[3] +=
//                 _t("bonus_quest_expbon higher %val%", { "%val%": v[1] + "%" }) +
//                 "<br>")
//             : (r[3] +=
//                 _t("bonus_quest_expbon lower %val%", { "%val%": v[1] + "%" }) +
//                 "<br>");
//           break;
//         case "bag":
//           var Y =
//             "pl" == _l()
//               ? $.inArray(v[1] % 10, [2, 3, 4]) < 0 || (v[1] >= 6 && v[1] <= 19)
//                 ? "Ăłw"
//                 : "y"
//               : v[1] > 1
//               ? "s"
//               : "";
//           r[3] +=
//             _t("bonus_bag %val%", { "%val%": v[1], "%posfix%": Y }) + "<br>";
//           break;
//         case "pkey":
//           r[3] += _t("bonus_pkey") + "<br>";
//           break;
//         case "rkeydesc":
//           r[3] += _t("bonus_rkeydesc", { "%val%": v[1] }) + "<br>";
//           break;
//         case "btype":
//           r[4] +=
//             _t("bonus_btype %val%", {
//               "%val%": eq.classes[v[1]].toLowerCase(),
//             }) + "<br>";
//           break;
//         case "respred":
//           r[3] += _t("bonus_respred %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "afterheal":
//         case "afterheal2":
//           var j = v[1].split(",");
//           r[3] +=
//             j[0] + _t("bonus_afterheal2 %val%", { "%val%": j[1] }) + "<br>";
//           break;
//         case "action":
//           var O = v[1].split(",");
//           switch (O[0]) {
//             case "flee":
//               r[3] += _t("flee_item_description") + "<br />";
//               break;
//             case "mail":
//               r[3] += _t("mail_item_description") + "<br />";
//               break;
//             case "auction":
//               r[3] += _t("auction_item_description") + "<br />";
//               break;
//             case "nloc":
//               "*" == O[1]
//                 ? (r[3] += _t("nloc_heros_item_description") + "<br />")
//                 : (r[3] += ""
//                     .concat(_t("nloc_monster_item_description"), ": ")
//                     .concat(O[1], "<br />"));
//               break;
//             case "fatigue":
//               var R = parseInt(O[1]);
//               r[3] +=
//                 R > 0
//                   ? _t("fatigue_positive %val%", { "%val%": Math.abs(R) }) +
//                     "<br />"
//                   : _t("fatigue_negative %val%", { "%val%": Math.abs(R) }) +
//                     "<br />";
//               break;
//             case "fightperheal":
//               2 == O.length
//                 ? (r[3] +=
//                     _t("fightperheal %amount%", { "%amount%": O[1] }) + "<br/>")
//                 : 3 == O.length &&
//                   (r[3] +=
//                     _t("fightperheal %from% %to%", {
//                       "%from%": O[1],
//                       "%to%": O[2],
//                     }) + "<br/>");
//               break;
//             case "deposit":
//               r[3] += _t("call_depo") + "<br />";
//               break;
//             case "clandeposit":
//               r[3] += _t("call_clandepo") + "<br />";
//               break;
//             case "shop":
//               r[3] += _t("call_shop") + "<br />";
//           }
//           break;
//         case "recipe":
//           r[3] = _t("recipe_dbl_click") + "<br>";
//           break;
//         case "outfit_selector":
//           r[3] += _t("outfit_selector") + "<br />";
//           break;
//         case "outfit":
//           var B = "",
//             E = !1;
//           (j = v[1].split(","))[0] < 1
//             ? (E = !0)
//             : (B =
//                 1 == j[0]
//                   ? _t("outfit_1min")
//                   : j[0] < 5
//                   ? j[0] + _t("outfit_mins1")
//                   : j[0] < 99
//                   ? j[0] + _t("outfit_mins2")
//                   : j[0] < 300
//                   ? round(j[0] / 60) + _t("outfit_hrs1")
//                   : round(j[0] / 60) + _t("outfit_hrs2"));
//           var V = "";
//           isset(j[2]) && (V = _t("in") + j[2]),
//             (r[3] += E
//               ? _t("outfit_change_perm") + V + "<br>"
//               : _t("outfit_change_for %time%", { "%time%": B }) + V + "<br>");
//           break;
//         case "battlestats":
//           isset(l.skills) || (l.skills = new skills()),
//             (r[3] +=
//               _t("battlestats", {
//                 "%val%": l.skills.parseStatsToItemTip(v[1]),
//               }) + "<br/>");
//           break;
//         case "freeskills":
//           r[3] += _t("freeskills", { "%val%": v[1] }) + "<br />";
//           break;
//         case "npc_expbon":
//           v[1] > 0
//             ? (r[3] +=
//                 _t("npx_expbon higher %amount%", {
//                   "%amount%": Math.abs(v[1]) + "%",
//                 }) + "<br/>")
//             : v[1] < 0 &&
//               (r[3] +=
//                 _t("npx_expbon lower %amount%", {
//                   "%amount%": Math.abs(v[1]) + "%",
//                 }) + "<br/>");
//           break;
//         case "npc_lootbon":
//           r[3] +=
//             _t("npx_lootbon higher %amount%", { "%amount%": v[1] }) + "<br/>";
//           break;
//         case "timelimit":
//           if (
//             ((j = v[1].split(","))[0] < 1
//               ? (r[3] +=
//                   _t("timelimit_can be used %val% sec", { "%val%": j[0] }) +
//                   "<br>")
//               : 1 == j[0]
//               ? (r[3] += _t("timelimit_can be used every min") + "<br>")
//               : j[0] < 5
//               ? (r[3] +=
//                   _t("timelimit_can be used %val% minutes", { "%val%": j[0] }) +
//                   "<br>")
//               : (r[3] +=
//                   _t("timelimit_can be used %val% minutes2", {
//                     "%val%": j[0],
//                   }) + "<br>"),
//             isset(j[1]))
//           ) {
//             var L = Math.floor((parseInt(j[1]) - unix_time()) / 60);
//             r[3] +=
//               L < 0
//                 ? _t("timelimit_readyToUse_now") + "<br>"
//                 : L < 1
//                 ? _t("timelimit_readyToUse_inawhile") + "<br>"
//                 : 1 == L
//                 ? _t("timelimit_readyToUse_inaminute") + "<br>"
//                 : L < 5
//                 ? _t("timelimit_readyToUse_in %val% sec", { "%val%": L }) +
//                   "<br>"
//                 : _t("timelimit_readyToUse_in %val% min", { "%val%": L }) +
//                   "<br>";
//           }
//           break;
//         case "ttl":
//           25 == a.cl &&
//           ("t" == a.loc ||
//             "n" == a.loc ||
//             "o" == a.loc ||
//             "r" == a.loc ||
//             "d" == a.loc ||
//             "c" == a.loc ||
//             ("g" == a.loc && (0 == a.st || 9 == a.st)) ||
//             ("s" == a.loc && 0 == a.st))
//             ? (r[4] += _t("ttl1 %date%", { "%val%": v[1] }) + "<br />")
//             : (r[4] += _t("ttl2 %date%", { "%val%": v[1] }) + "<br />");
//           break;
//         case "ammo":
//         case "amount":
//           var F = parseItemStat(a.stat);
//           if (
//             (parseInt("ammo" == v[0] ? F.ammo : F.amount) <= 1 && !1,
//             isset(F.quest) && !1,
//             10 != a.st)
//           ) {
//             var U = isRanges(v[1]) ? getRanges(v[1]) : v[1];
//             r[4] += c
//               ? '<span class="amount-text">' +
//                 _t("cursed_amount %val%", { "%val%": U }) +
//                 "</span><br>"
//               : '<span class="amount-text">' +
//                 _t("amount %val% %split%", { "%val%": U, "%split%": "" }) +
//                 "</span><br>";
//           }
//           break;
//         case "cansplit":
//           (0 != a.st && 9 != a.st && "o" != a.loc) ||
//             (r[4] +=
//               (parseInt(v[1]) ? _t("split_possible") : _t("split_impossible")) +
//               "<br>");
//           break;
//         case "nosplit":
//           r[4] += _t("split_impossible") + "<br>";
//           break;
//         case "maxuselvl":
//           r[9] = '<b class="att">' + _t("maxuselvl") + v[1] + "</b><br>" + r[9];
//           break;
//         case "maxstatslvl":
//           r[9] =
//             '<b class="att">' + _t("maxstatslvl") + v[1] + "</b><br>" + r[9];
//           break;
//         case "capacity":
//           10 != a.st &&
//             (r[4] += _t("capacity %val%", { "%val%": v[1] }) + "<br>");
//           break;
//         case "noauction":
//           var C = !1;
//           for (var i in _) "permbound" == _[i] && (C = !0);
//           if (C) break;
//           r[4] += _t("noauction") + "<br>";
//           break;
//         case "nodepo":
//           if (25 == a.cl && "g" == a.loc && 0 != a.st && 9 != a.st) break;
//           r[4] += _t("nodepo_info") + "<br />";
//           break;
//         case "nodepoclan":
//           C = !1;
//           for (var i in _) "permbound" == _[i] && (C = !0);
//           if (C) break;
//           r[4] += _t("nodepoclan_info") + "<br />";
//           break;
//         case "legbon":
//           r[5] += "<i class=legbon>";
//           var W = null;
//           switch ((j = v[1].split(","))[0]) {
//             case "verycrit":
//               null == W && (W = 13);
//             case "holytouch":
//               null == W && (W = 7);
//             case "curse":
//               null == W && (W = 9);
//             case "pushback":
//               null == W && (W = 8);
//             case "lastheal":
//               null == W && (W = 18);
//             case "critred":
//               null == W && (W = 20);
//             case "resgain":
//               null == W && (W = 16);
//             case "dmgred":
//               null == W && (W = 16);
//             case "cleanse":
//               null == W && (W = 12);
//             case "glare":
//               null == W && (W = 9),
//                 (r[5] += _t("legbon_" + j[0], { "%val%": W }));
//               break;
//             default:
//               r[5] += _t("legbon_undefined %val%", { "%val%": j[0] });
//           }
//           r[5] += "</i>";
//           break;
//         case "legbon_test":
//           r[5] += "<i class=legbon>";
//           W = null;
//           switch ((j = v[1].split(","))[0]) {
//             case "verycrit":
//             case "holytouch":
//             case "curse":
//             case "pushback":
//             case "lastheal":
//             case "critred":
//             case "resgain":
//             case "dmgred":
//             case "cleanse":
//             case "glare":
//               r[5] += "TEST: " + _t("legbon_" + j[0], { "%val%": j[1] });
//               break;
//             default:
//               r[5] += _t("legbon_undefined %val%", { "%val%": j[0] });
//           }
//           r[5] += "</i>";
//           break;
//         case "lvlnext":
//           r[9] +=
//             '<b class="lvl-next">' +
//             _t("match_bonus_" + v[0] + " %val%", { "%val%": v[1] }) +
//             "</b>";
//           break;
//         case "lvlupgcost":
//         case "lvlupgs":
//           r[4] +=
//             _t("match_bonus_" + v[0] + " %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "upglvl":
//           r[4] +=
//             _t("match_bonus_" + v[0] + " %val%", { "%val%": _t(v[1]) }) +
//             "<br>";
//           break;
//         case "expadd":
//           r[4] += _t("bonus_" + v[0] + " %val%", { "%val%": v[1] }) + "<br>";
//           break;
//         case "expaddlvl":
//           var H = (j = v[1].split(","))[0];
//           "undefined" != typeof hero && hero.lvl < j[0] && (H = hero.lvl),
//             (r[4] +=
//               _t("bonus_" + v[0] + " %val%", { "%val%": j[1], "%val2%": H }) +
//               "<br>");
//           break;
//         case "townlimit":
//           r[5] += "<i class=idesc>" + _t("townlimit") + "</i>";
//           break;
//         case "teleport":
//           r[7] = "<i class=idesc>" + _t("teleport") + "</i>" + r[7];
//           break;
//         case "custom_teleport":
//           1 == v.length
//             ? (r[7] += "<i class=idesc>" + _t("dbl_click_to_set") + "</i>")
//             : (r[7] = "<i class=idesc>" + _t("teleport") + "</i> " + r[7]);
//           break;
//         case "furniture":
//           r[6] += _t("furniture", null, "itemtip") + "<br>";
//           break;
//         case "nodesc":
//           r[6] += "<i class=idesc>" + _t("nodesc") + "</i>";
//           break;
//         case "pumpkin_weight":
//           var G = "".concat(v[1] / 1e3, "kg");
//           r[7] += '<i class="idesc">'
//             .concat(_t("pumpkin_weight"), " ")
//             .concat(G, "</i><br>");
//           break;
//         case "opis":
//           F = parseItemStat(a.stat);
//           (v[1] = parseOpisStat(v[1], F)),
//             (r[7] += "<i class=idesc>" + parseItemBB(v[1]) + "</i>");
//           break;
//         case "loot":
//           var J = "";
//           2 == (j = v[1].split(","))[2] && (J = _t("with_player")),
//             j[2] > 2 && (J = _t("with_company")),
//             (r[7] +=
//               "<i class=looter>" +
//               t(
//                 _t("loot_with %day% %npc% %grpinf% %name%", {
//                   "%day%": ut_date(j[3]),
//                   "%npc%": j[4],
//                   "%grpinf%": J,
//                   "%name%": j[0],
//                 })
//               ) +
//               "</i><br>");
//           break;
//         case "timelimit_upgmax":
//           r[3] += _t("Corecttimelimit_upgmax", { "%val%": v[1] }) + "<br>";
//           break;
//         case "upgtimelimit":
//           r[4] += _t("Corectupgtimelimit") + "<br>";
//           break;
//         case "timelimit_upgs":
//           r[3] += _t("Corecttimelimit_upgs", { "%val%": v[1] }) + "<br>";
//           break;
//         case "soulbound":
//           s = !0;
//           break;
//         case "permbound":
//           n = !0;
//           break;
//         case "canpreview":
//           r[8] += _t("canpreviewitem") + "<br>";
//           break;
//         case "recovered":
//           r[8] += _t("recovered") + "<br>";
//           break;
//         case "binds":
//           b = !0;
//           break;
//         case "unbind":
//           r[8] += _t("unbind") + "<br>";
//           break;
//         case "undoupg":
//           r[8] += _t("undoupg") + "<br>";
//           break;
//         case "notakeoff":
//           r[8] = _t("notakeoff") + "<br>";
//           break;
//         case "summonparty":
//           r[8] = _t("summonparty") + "<br>";
//           break;
//         case "lvl":
//           r[9] +=
//             '<b class="att' +
//             (v[1] > hero.lvl ? " noreq" : "") +
//             '">' +
//             _t("lvl %lvl%", { "%lvl%": v[1] }) +
//             "</b><br>";
//           break;
//         case "reqp":
//           r[9] +=
//             '<b class="att' +
//             (v[1].indexOf(hero.prof) < 0 ? " noreq" : "") +
//             '">' +
//             _t("reqp") +
//             " ";
//           for (var K = 0; K < v[1].length; K++)
//             r[9] += (K ? ", " : "") + eq.prof[v[1].charAt(K)];
//           r[9] += "</b><br>";
//           break;
//         case "reqgold":
//           r[9] +=
//             '<b class="att' +
//             (v[1] > hero.gold ? " noreq" : "") +
//             '">' +
//             _t("reqgold %val%", { "%val%": v[1] }) +
//             "</b><br>";
//           break;
//         case "reqs":
//           r[9] +=
//             '<b class="att' +
//             (v[1] > hero.bstr ? " noreq" : "") +
//             '">' +
//             _t("reqs %val%", { "%val%": v[1] }) +
//             "</b><br>";
//           break;
//         case "reqz":
//           r[9] +=
//             '<b class="att' +
//             (v[1] > hero.bagi ? " noreq" : "") +
//             '">' +
//             _t("reqz %val%", { "%val%": v[1] }) +
//             "</b><br>";
//           break;
//         case "reqi":
//           r[9] +=
//             '<b class="att' +
//             (v[1] > hero.bint ? " noreq" : "") +
//             '">' +
//             _t("reqi %val%", { "%val%": v[1] }) +
//             "</b><br>";
//           break;
//         case "pet":
//           var N = v[1].split(",");
//           for (K = 2; K < N.length; K++)
//             if (
//               "elite" != N[K] &&
//               "quest" != N[K] &&
//               "heroic" != N[K] &&
//               "legendary" != N[K]
//             ) {
//               var P = N[K].split("|");
//               if (P.length) {
//                 r[2] = '<span style="color:lime">' + _t("pet_tasks") + "<br />";
//                 for (i = 0; i < P.length; i++)
//                   r[2] += "- " + P[i].replace(/#.*/, "") + "<br />";
//                 r[2] += "</span>";
//               }
//               break;
//             }
//           v[1].match(/quest/) && (r[2] += _t("pet_logout_hide") + "<br />");
//           break;
//         case "outexchange":
//         case "artisan_worthless":
//           r[8] += _t(v[0]) + "<br>";
//           break;
//         case "artisanbon":
//           r[8] +=
//             _t("".concat(v[0], " %val%"), { "%val%": v[1] + "%" }) + "<br>";
//           break;
//         default:
//           "" != v[0] &&
//             (r[3] += _t("unknown_stat %val%", { "%val%": v[0] }) + "<br>");
//       }
//     }
//   var Q = r[8];
//   return (
//     n
//       ? "n" == a.loc
//         ? (r[8] = _t("permbound") + "<br>")
//         : (22 != a.cl || (isset(x) && x)
//             ? (r[8] = _t("permbound_item") + "<br>")
//             : (r[8] = _t("permbound1") + "<br>"),
//           (r[8] += Q))
//       : s
//       ? (22 != a.cl || (isset(x) && x)
//           ? (r[8] = _t("soulbound2") + "<br>")
//           : (r[8] = _t("soulbound1") + "<br>"),
//         (r[8] += Q))
//       : b &&
//         (22 == a.cl
//           ? (r[8] += isset(x) && x ? "" : _t("binds1") + "<br>")
//           : (r[8] += _t("binds2") + "<br>")),
//     a.pr &&
//     (!isset(a.cl) ||
//       25 != a.cl ||
//       "n" == a.loc ||
//       ("t" == a.loc && isset(a.cl) && 25 == a.cl))
//       ? (r[9] +=
//           '<div class="value-item">' +
//           _t("item_value %val%", { "%val%": round(a.pr, 3) }) +
//           "</div>")
//       : (r[9] = r[9].replace(/\<br>$/g, "")),
//     r.join("")
//   );
// }
